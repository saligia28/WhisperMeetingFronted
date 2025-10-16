import type { Meeting, MeetingSummary, TranscriptSegment } from "../types";
export declare function fetchMeetings(): Promise<Meeting[]>;
export declare function fetchSummary(meetingId: string): Promise<MeetingSummary>;
export declare function uploadTranscription(meetingId: string, file: Blob): Promise<TranscriptSegment[]>;
export declare function fetchTranscriptSegments(meetingId: string): Promise<TranscriptSegment[]>;
export declare function extractSection(markdown: string, heading: string): string[];
