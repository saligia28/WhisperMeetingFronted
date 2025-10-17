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

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setState("unsupported");
    }
  }, []);

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
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data || event.data.size === 0) {
          return;
        }
        chunksRef.current.push(event.data);
        if (!stoppingRef.current && onChunk) {
          onChunk(event.data, chunkDurationMs / 1000);
        }
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stoppingRef.current = false;
        onData(blob);
        recorder.stream.getTracks().forEach((track) => track.stop());
        setState("idle");
      });

      mediaRecorderRef.current = recorder;
      recorder.start(chunkDurationMs);
      setState("recording");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "无法启动录音";
      if (message.toLowerCase().includes("permission")) {
        setState("denied");
      }
      setError(message);
    }
  }, [mimeType, onData, state]);

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
