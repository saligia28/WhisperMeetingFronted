import type { Highlight, TranscriptSegment } from "../types";
interface HighlightsPanelProps {
    highlights: Highlight[];
    segments: Map<string, TranscriptSegment>;
    onRemove: (id: string) => void;
}
export declare function HighlightsPanel({ highlights, segments, onRemove }: HighlightsPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
