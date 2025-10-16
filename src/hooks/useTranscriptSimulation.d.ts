import type { TranscriptSegment } from "../types";
interface UseTranscriptSimulationOptions {
    isActive: boolean;
    onSegment: (segment: TranscriptSegment) => void;
    resetOnStop?: boolean;
}
export declare function useTranscriptSimulation({ isActive, onSegment, resetOnStop }: UseTranscriptSimulationOptions): void;
export {};
