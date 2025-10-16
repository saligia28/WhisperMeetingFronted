import { useEffect, useRef } from "react";
import { mockSegments } from "../mockData";
export function useTranscriptSimulation({ isActive, onSegment, resetOnStop = false }) {
    const intervalRef = useRef(null);
    const indexRef = useRef(0);
    useEffect(() => {
        if (isActive) {
            intervalRef.current = window.setInterval(() => {
                const segment = mockSegments[indexRef.current % mockSegments.length];
                indexRef.current += 1;
                onSegment({
                    ...segment,
                    id: `${segment.id}-${Date.now()}`,
                    createdAt: Date.now(),
                });
            }, 4000);
        }
        else if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
            if (resetOnStop) {
                indexRef.current = 0;
            }
        }
        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, [isActive, onSegment, resetOnStop]);
}
