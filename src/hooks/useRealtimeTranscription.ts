import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "../types";
import type { VadConfig } from "../types/vad";

type TranscriptionState = "idle" | "connecting" | "connected" | "recording" | "error" | "unsupported" | "denied";

interface UseRealtimeTranscriptionOptions {
  meetingId: string | null;
  wsBaseUrl?: string;
  sampleRate?: number;
  onSegments?: (segments: TranscriptSegment[]) => void;
  onError?: (error: string) => void;
}

interface WebSocketMessage {
  type: "session_started" | "transcription" | "error" | "config_applied";
  meeting_id?: string;
  sample_rate?: number;
  config?: {
    vad_aggressiveness?: number;
    min_speech_ratio?: number;
  };
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string | null;
  }>;
  offset?: number;
  duration?: number;
  message?: string;
}

/**
 * WebSocket-based real-time transcription hook
 * Uses AudioContext to capture PCM audio and sends it via WebSocket
 *
 * This replaces the MediaRecorder-based approach to avoid browser codec compatibility issues.
 */
export function useRealtimeTranscription({
  meetingId,
  wsBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace("http://", "ws://").replace("https://", "wss://") || "ws://localhost:8002",
  sampleRate = 16000,
  onSegments,
  onError,
}: UseRealtimeTranscriptionOptions) {
  const [state, setState] = useState<TranscriptionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receivedSegments, setReceivedSegments] = useState<TranscriptSegment[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [dataSize, setDataSize] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // WebSocket and Audio refs
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const isSessionReadyRef = useRef(false);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const pendingConfigRef = useRef<VadConfig | null>(null);
  const configAppliedRef = useRef(false);
  const inputSampleRateRef = useRef<number | null>(null);
  const effectiveSampleRateRef = useRef<number>(sampleRate);
  const levelValueRef = useRef(0);
  const lastLevelUpdateRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("[useRealtimeTranscription] Cleaning up resources");

    isRecordingRef.current = false;
    isSessionReadyRef.current = false;
    pendingChunksRef.current = [];
    pendingConfigRef.current = null;
    configAppliedRef.current = false;
    inputSampleRateRef.current = null;
    effectiveSampleRateRef.current = sampleRate;
    levelValueRef.current = 0;
    lastLevelUpdateRef.current = 0;
    setAudioLevel(0);

    // Close WebSocket
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }

    // Disconnect audio nodes
    if (processorNodeRef.current) {
      if (processorNodeRef.current instanceof AudioWorkletNode) {
        processorNodeRef.current.port.onmessage = null;
        try {
          processorNodeRef.current.port.close();
        } catch (error) {
          console.warn("[useRealtimeTranscription] Failed to close AudioWorklet port", error);
        }
      }
      try {
        processorNodeRef.current.disconnect();
      } catch (disconnectError) {
        console.warn("[useRealtimeTranscription] Failed to disconnect processor node", disconnectError);
      }
      processorNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Convert Float32Array to 16-bit PCM
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
    }

    return buffer;
  }, []);

  const downsampleBuffer = useCallback((buffer: Float32Array, inSampleRate: number, outSampleRate: number): Float32Array => {
    if (outSampleRate === inSampleRate) {
      return buffer;
    }

    if (outSampleRate > inSampleRate) {
      console.warn(
        `[useRealtimeTranscription] Output sample rate ${outSampleRate}Hz is higher than input ${inSampleRate}Hz; skip resampling.`,
      );
      return buffer;
    }

    const sampleRateRatio = inSampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count += 1;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }, []);

  // Start recording
  const startRecording = useCallback(async (vadConfig?: VadConfig) => {
    if (!meetingId) {
      const errorMsg = "无法启动录音：未选择会议";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (state === "unsupported" || state === "denied") {
      return;
    }

    try {
      console.log("[useRealtimeTranscription] Starting recording for meeting:", meetingId);
      if (vadConfig) {
        console.log("[useRealtimeTranscription] VAD config:", vadConfig);
      }
      setState("connecting");
      setError(null);
      setReceivedSegments([]);
      setTotalDuration(0);
      setDataSize(0);
      isRecordingRef.current = false;
      isSessionReadyRef.current = false;
      pendingChunksRef.current = [];
      pendingConfigRef.current = vadConfig ?? null;
      configAppliedRef.current = false;
      inputSampleRateRef.current = null;
      levelValueRef.current = 0;
      lastLevelUpdateRef.current = 0;
      setAudioLevel(0);

      // Get microphone access
      // Disable aggressive noise suppression and auto gain control to prevent voice distortion
      // Whisper models are robust to background noise, and browser processing can introduce artifacts
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: sampleRate },
          channelCount: 1,
          echoCancellation: true,  // Keep echo cancellation for better quality
          noiseSuppression: { ideal: false },  // Disable to prevent voice distortion
          autoGainControl: { ideal: false },   // Disable to preserve natural audio dynamics
        },
      });

      mediaStreamRef.current = stream;

      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const actualInputSampleRate = audioContext.sampleRate;
      inputSampleRateRef.current = actualInputSampleRate;
      const effectiveSampleRate =
        sampleRate > actualInputSampleRate ? actualInputSampleRate : Math.round(sampleRate);
      effectiveSampleRateRef.current = effectiveSampleRate;

      const source = audioContext.createMediaStreamSource(stream);

      const bufferSize = 4096;

      // Connect WebSocket
      const wsUrl = `${wsBaseUrl}/meetings/${meetingId}/transcribe/realtime?sample_rate=${effectiveSampleRateRef.current}&source_sample_rate=${actualInputSampleRate}`;
      console.log("[useRealtimeTranscription] Connecting to WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("[useRealtimeTranscription] WebSocket connected");
        setState("connected");
      };

      const flushPendingChunks = () => {
        const socket = websocketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          pendingChunksRef.current = [];
          return;
        }

        while (pendingChunksRef.current.length > 0) {
          const chunk = pendingChunksRef.current.shift();
          if (!chunk) {
            continue;
          }

          try {
            socket.send(chunk);
            setDataSize((prev) => prev + chunk.byteLength);
          } catch (sendError) {
            console.error("[useRealtimeTranscription] Failed to flush pending audio chunk:", sendError);
            break;
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log("[useRealtimeTranscription] Received message:", data.type);

          switch (data.type) {
            case "session_started":
              console.log("[useRealtimeTranscription] Session started:", data);

              // Send config if provided
              const pendingConfig = pendingConfigRef.current;
              if (pendingConfig && !configAppliedRef.current) {
                console.log("[useRealtimeTranscription] Sending VAD config:", pendingConfig);
                try {
                  ws.send(JSON.stringify({
                    type: "config",
                    vad_aggressiveness: pendingConfig.aggressiveness,
                    min_speech_ratio: pendingConfig.speechRatio / 100,
                  }));
                } catch (sendError) {
                  console.error("[useRealtimeTranscription] Failed to send config:", sendError);
                  // Continue without config
                  setState("recording");
                  isRecordingRef.current = true;
                  isSessionReadyRef.current = true;
                  configAppliedRef.current = true;
                  flushPendingChunks();
                }
              } else {
                // No config to send, start immediately
                setState("recording");
                isRecordingRef.current = true;
                isSessionReadyRef.current = true;
                configAppliedRef.current = true;
                flushPendingChunks();
              }
              break;

            case "config_applied":
              console.log("[useRealtimeTranscription] Config applied:", data.config);
              configAppliedRef.current = true;
              setState("recording");
              isRecordingRef.current = true;
              isSessionReadyRef.current = true;
              flushPendingChunks();
              break;

            case "transcription":
              if (data.segments && data.segments.length > 0) {
                console.log(`[useRealtimeTranscription] Received ${data.segments.length} segments`);

                const newSegments: TranscriptSegment[] = data.segments.map((seg, idx) => ({
                  id: `realtime-${meetingId}-${data.offset?.toFixed(2)}-${idx}`,
                  start: seg.start,
                  end: seg.end,
                  text: seg.text,
                  speaker: seg.speaker ?? undefined,
                  createdAt: Date.now(),
                }));

                setReceivedSegments((prev) => [...prev, ...newSegments]);
                onSegments?.(newSegments);

                if (data.offset !== undefined && data.duration !== undefined) {
                  setTotalDuration(data.offset + data.duration);
                }
              }
              break;

            case "error":
              const errorMsg = data.message || "服务器错误";
              console.error("[useRealtimeTranscription] Server error:", errorMsg);
              setError(errorMsg);
              onError?.(errorMsg);
              setState("error");
              break;

            default:
              console.warn("[useRealtimeTranscription] Unknown message type:", data);
          }
        } catch (err) {
          console.error("[useRealtimeTranscription] Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[useRealtimeTranscription] WebSocket error:", event);
        const errorMsg = "WebSocket 连接错误";
        setError(errorMsg);
        onError?.(errorMsg);
        setState("error");
      };

      ws.onclose = (event) => {
        console.log("[useRealtimeTranscription] WebSocket closed:", event.code, event.reason);
        if (isRecordingRef.current) {
          setState("idle");
          isRecordingRef.current = false;
        }
        isSessionReadyRef.current = false;
        pendingChunksRef.current = [];
      };

      const handleAudioFrame = (inputData: Float32Array) => {
        // Update audio level feedback regardless of WebSocket readiness
        if (inputData.length > 0) {
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            const sample = inputData[i];
            sumSquares += sample * sample;
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          const normalized = Math.min(1, rms * 3.5);
          const smoothed = levelValueRef.current * 0.75 + normalized * 0.25;
          levelValueRef.current = smoothed;

          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          if (now - lastLevelUpdateRef.current > 80) {
            lastLevelUpdateRef.current = now;
            setAudioLevel(smoothed);
          }
        }

        if (!ws || ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputRate = inputSampleRateRef.current ?? audioContext.sampleRate;
        const targetRate = effectiveSampleRateRef.current;
        const processedBuffer = downsampleBuffer(inputData, inputRate, targetRate);
        const pcmData = floatTo16BitPCM(processedBuffer);

        try {
          if (isSessionReadyRef.current && isRecordingRef.current) {
            ws.send(pcmData);
            setDataSize((prev) => prev + pcmData.byteLength);
          } else {
            if (pendingChunksRef.current.length > 40) {
              pendingChunksRef.current.shift();
            }
            pendingChunksRef.current.push(pcmData);
          }
        } catch (err) {
          console.error("[useRealtimeTranscription] Failed to send audio data:", err);
        }
      };

      let processorInitialized = false;

      if ("audioWorklet" in audioContext && audioContext.audioWorklet) {
        try {
          await audioContext.audioWorklet.addModule(new URL("../worklets/pcm-capture.worklet.ts", import.meta.url));
          const workletNode = new AudioWorkletNode(audioContext, "pcm-capture-processor", {
            numberOfInputs: 1,
            numberOfOutputs: 0,
          });
          workletNode.port.onmessage = (event) => {
            const frame = event.data as Float32Array;
            handleAudioFrame(frame);
          };
          processorNodeRef.current = workletNode;
          source.connect(workletNode);
          processorInitialized = true;
          console.log("[useRealtimeTranscription] AudioWorklet pipeline established");
        } catch (workletError) {
          console.warn("[useRealtimeTranscription] Failed to initialise AudioWorklet, falling back:", workletError);
        }
      }

      if (!processorInitialized) {
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorNodeRef.current = processor;
        processor.onaudioprocess = (event) => {
          handleAudioFrame(event.inputBuffer.getChannelData(0));
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        processorInitialized = true;
        console.log("[useRealtimeTranscription] ScriptProcessor fallback pipeline established");
      }

      if (!processorInitialized) {
        throw new Error("无法初始化音频处理节点");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "无法启动录音";
      console.error("[useRealtimeTranscription] Failed to start recording:", err);

      if (errorMsg.toLowerCase().includes("permission")) {
        setState("denied");
        setError("麦克风权限被拒绝");
        onError?.("麦克风权限被拒绝");
      } else {
        setState("error");
        setError(errorMsg);
        onError?.(errorMsg);
      }

      cleanup();
    }
  }, [meetingId, wsBaseUrl, sampleRate, state, cleanup, floatTo16BitPCM, downsampleBuffer, onSegments, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log("[useRealtimeTranscription] Stopping recording");
    cleanup();
    setState("idle");
    setAudioLevel(0);
  }, [cleanup]);

  // Check browser support
  useEffect(() => {
    if (!navigator.mediaDevices || !window.AudioContext) {
      setState("unsupported");
      setError("当前浏览器不支持音频录制");
    }
  }, []);

  return {
    state,
    isRecording: state === "recording",
    isConnecting: state === "connecting" || state === "connected",
    error,
    segments: receivedSegments,
    totalDuration,
    dataSize,
    startRecording,
    stopRecording,
    audioLevel,
  };
}
