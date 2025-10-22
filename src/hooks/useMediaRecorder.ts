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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stoppingRef = useRef(false);
  const headerChunkRef = useRef<Blob | null>(null);
  const chunkCounterRef = useRef(0);

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

  useEffect(() => {
    return () => {
      stopActiveRecorder();
    };
  }, [stopActiveRecorder]);

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
        recorder.stream.getTracks().forEach((track) => track.stop());
        setState("idle");
      });

      mediaRecorderRef.current = recorder;
      recorder.start(chunkDurationMs);
      console.log(`[useMediaRecorder] 开始录音，分块间隔: ${chunkDurationMs}ms`);
      setState("recording");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法启动录音";
      console.error(`[useMediaRecorder] 录音启动失败:`, err);
      if (message.toLowerCase().includes("permission")) {
        setState("denied");
      }
      setError(message);
    }
  }, [getSupportedMimeType, onData, onChunk, chunkDurationMs, state]);

  const stopRecording = useCallback(() => {
    setState((current) => (current === "recording" ? "stopping" : current));
    stoppingRef.current = true;
    stopActiveRecorder();
  }, [stopActiveRecorder]);

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
  };
}
