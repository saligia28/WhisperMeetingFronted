import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "stopping" | "unsupported" | "denied";

interface UseMediaRecorderOptions {
  onData: (blob: Blob) => void;
  onChunk?: (blob: Blob, durationSec: number) => void;
  mimeType?: string;
  chunkDurationMs?: number;
}

export function useMediaRecorder({
  onData,
  onChunk,
  mimeType = "audio/webm",
  chunkDurationMs = 5000,
}: UseMediaRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stoppingRef = useRef(false);
  const headerChunkRef = useRef<Blob | null>(null);
  const chunkCounterRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Float32Array | null>(null);
  const analyserAnimationRef = useRef<number | null>(null);
  const levelValueRef = useRef(0);
  const lastLevelUpdateRef = useRef(0);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setState("unsupported");
    }
  }, []);

  // 获取浏览器支持的最佳音频 MIME 类型
  const getSupportedMimeType = useCallback((): string => {
    // Safari 的 WebM 支持有问题，优先使用更可靠的格式
    // 按照稳定性和兼容性排序
    const candidates = [
      "audio/webm;codecs=opus",   // Chrome/Firefox 最佳
      "audio/mp4",                // Safari 推荐
      "audio/webm",               // 基础 WebM
      "audio/ogg;codecs=opus",    // Firefox 备选
    ];

    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        console.log(`[useMediaRecorder] 选择 MIME 类型: ${candidate}`);
        return candidate;
      }
    }

    console.warn("[useMediaRecorder] 无支持的 MIME 类型，回退到默认");
    return mimeType;
  }, [mimeType]);

  const stopActiveRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const stopLevelMonitor = useCallback(() => {
    if (analyserAnimationRef.current !== null) {
      cancelAnimationFrame(analyserAnimationRef.current);
      analyserAnimationRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (disconnectError) {
        console.warn("[useMediaRecorder] 断开音量监控源节点失败:", disconnectError);
      }
      sourceNodeRef.current = null;
    }
    analyserRef.current = null;
    analyserDataRef.current = null;
    levelValueRef.current = 0;
    lastLevelUpdateRef.current = 0;
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      context
        .close()
        .catch((monitorError) => {
          console.warn("[useMediaRecorder] 关闭音量监控音频上下文失败:", monitorError);
        });
    }
    setAudioLevel(0);
  }, []);

  const startLevelMonitor = useCallback(
    async (stream: MediaStream) => {
      try {
        const context = new AudioContext();
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        const dataArray = new Float32Array(analyser.fftSize);
        source.connect(analyser);

        audioContextRef.current = context;
        sourceNodeRef.current = source;
        analyserRef.current = analyser;
        analyserDataRef.current = dataArray;
        levelValueRef.current = 0;
        lastLevelUpdateRef.current = 0;

        const updateLevel = () => {
          const analyserNode = analyserRef.current;
          const buffer = analyserDataRef.current;
          if (!analyserNode || !buffer) {
            return;
          }

          analyserNode.getFloatTimeDomainData(buffer);
          let sumSquares = 0;
          for (let i = 0; i < buffer.length; i++) {
            const sample = buffer[i];
            sumSquares += sample * sample;
          }
          const rms = Math.sqrt(sumSquares / buffer.length);
          const normalized = Math.min(1, rms * 3.5);
          const smoothed = levelValueRef.current * 0.75 + normalized * 0.25;
          levelValueRef.current = smoothed;

          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          if (now - lastLevelUpdateRef.current > 80) {
            lastLevelUpdateRef.current = now;
            setAudioLevel(smoothed);
          }

          analyserAnimationRef.current = requestAnimationFrame(updateLevel);
        };

        analyserAnimationRef.current = requestAnimationFrame(updateLevel);
      } catch (monitorError) {
        console.warn("[useMediaRecorder] 无法启动音量监控:", monitorError);
        stopLevelMonitor();
      }
    },
    [stopLevelMonitor],
  );

  useEffect(() => {
    return () => {
      stopLevelMonitor();
      stopActiveRecorder();
    };
  }, [stopActiveRecorder, stopLevelMonitor]);

  const startRecording = useCallback(async () => {
    if (state === "unsupported" || state === "denied") {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 动态选择浏览器支持的 MIME 类型
      const selectedMimeType = getSupportedMimeType();

      const recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      chunksRef.current = [];
      headerChunkRef.current = null;
      chunkCounterRef.current = 0;

      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data || event.data.size === 0) {
          console.warn(`[useMediaRecorder] 收到空数据块`);
          return;
        }
        console.log(`[useMediaRecorder] 收到数据块: ${event.data.size} 字节, 类型: ${event.data.type}`);

        // 累积所有块用于最终保存
        chunksRef.current.push(event.data);
        chunkCounterRef.current += 1;

        if (!headerChunkRef.current) {
          headerChunkRef.current = event.data;
        }

        // 流式转写：发送单个块（这是完整的媒体片段）
        if (!stoppingRef.current && onChunk) {
          // MediaRecorder 在部分浏览器中不会为每个数据块附带容器头，
          // 后端若直接解码会提示格式损坏。为保证兼容性，将首个块作为「头」，
          // 之后的块都会附加此头部再发送。
          const header = headerChunkRef.current;
          const payload =
            header && header !== event.data
              ? new Blob([header, event.data], { type: selectedMimeType })
              : event.data;

          console.log(
            `[useMediaRecorder] 发送流式块 #${chunkCounterRef.current}: ${payload.size} 字节`,
          );
          onChunk(payload, chunkDurationMs / 1000);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        console.log(`[useMediaRecorder] 录音结束: ${blob.size} 字节, 类型: ${blob.type}`);
        chunksRef.current = [];
        stoppingRef.current = false;
        headerChunkRef.current = null;
        chunkCounterRef.current = 0;
        onData(blob);
        stopLevelMonitor();
        recorder.stream.getTracks().forEach((track) => track.stop());
        setState("idle");
      });

      mediaRecorderRef.current = recorder;
      recorder.start(chunkDurationMs);
      console.log(`[useMediaRecorder] 开始录音，分块间隔: ${chunkDurationMs}ms`);
      await startLevelMonitor(stream);
      setState("recording");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法启动录音";
      console.error(`[useMediaRecorder] 录音启动失败:`, err);
      if (message.toLowerCase().includes("permission")) {
        setState("denied");
      }
      setError(message);
      stopLevelMonitor();
    }
  }, [getSupportedMimeType, onData, onChunk, chunkDurationMs, state, startLevelMonitor, stopLevelMonitor]);

  const stopRecording = useCallback(() => {
    setState((current) => (current === "recording" ? "stopping" : current));
    stoppingRef.current = true;
    stopActiveRecorder();
    stopLevelMonitor();
  }, [stopActiveRecorder, stopLevelMonitor]);

  const importFile = useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }
      const buffer = await file.arrayBuffer();
      onData(new Blob([buffer], { type: file.type || "audio/wav" }));
    },
    [onData],
  );

  return {
    state,
    isRecording: state === "recording",
    error,
    startRecording,
    stopRecording,
    importFile,
    audioLevel,
  };
}
