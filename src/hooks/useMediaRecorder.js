import { useCallback, useEffect, useRef, useState } from "react";
export function useMediaRecorder({ onData, mimeType = "audio/webm" }) {
    const [state, setState] = useState("idle");
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
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
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            });
            recorder.addEventListener("stop", () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];
                onData(blob);
                recorder.stream.getTracks().forEach((track) => track.stop());
                setState("idle");
            });
            mediaRecorderRef.current = recorder;
            recorder.start();
            setState("recording");
            setError(null);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "无法启动录音";
            if (message.toLowerCase().includes("permission")) {
                setState("denied");
            }
            setError(message);
        }
    }, [mimeType, onData, state]);
    const stopRecording = useCallback(() => {
        setState((current) => (current === "recording" ? "stopping" : current));
        stopActiveRecorder();
    }, [stopActiveRecorder]);
    const importFile = useCallback(async (file) => {
        if (!file) {
            return;
        }
        const buffer = await file.arrayBuffer();
        onData(new Blob([buffer], { type: file.type || "audio/wav" }));
    }, [onData]);
    return {
        state,
        isRecording: state === "recording",
        error,
        startRecording,
        stopRecording,
        importFile,
    };
}
