import type { TranscriptSegment } from "../types";
interface TranscriptStreamProps {
    segments: TranscriptSegment[];
    onHighlight: (segment: TranscriptSegment) => void;
    isStreaming: boolean;
    isLoading?: boolean;
}
export declare function TranscriptStream({ segments, onHighlight, isStreaming, isLoading }: TranscriptStreamProps): import("react/jsx-runtime").JSX.Element;
export {};
