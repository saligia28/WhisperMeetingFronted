import type { Meeting } from "../types";
interface RecorderPanelProps {
    meeting?: Meeting | null;
    recorderState: string;
    isRecording: boolean;
    onStart: () => void;
    onStop: () => void;
    onImport: (file: File) => void;
    onUploadLatest: () => void;
    busy?: boolean;
    error?: string | null;
}
export declare function RecorderPanel({ meeting, recorderState, isRecording, onStart, onStop, onImport, onUploadLatest, busy, error, }: RecorderPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
