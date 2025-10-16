type RecorderState = "idle" | "recording" | "stopping" | "unsupported" | "denied";
interface UseMediaRecorderOptions {
    onData: (blob: Blob) => void;
    mimeType?: string;
}
export declare function useMediaRecorder({ onData, mimeType }: UseMediaRecorderOptions): {
    state: RecorderState;
    isRecording: boolean;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    importFile: (file: File) => Promise<void>;
};
export {};
