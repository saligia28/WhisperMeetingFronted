import type { MeetingSummary } from "../types";
interface SummaryPanelProps {
    summary?: MeetingSummary;
    isLoading?: boolean;
    onRefresh?: () => void;
}
export declare function SummaryPanel({ summary, isLoading, onRefresh }: SummaryPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
