export interface Meeting {
  id: string;
  title?: string | null;
  duration?: number | null;
  language?: string | null;
}

export interface TranscriptSegment {
  id: string;
  speaker?: string | null;
  text: string;
  start: number;
  end: number;
  createdAt: number;
}

export interface Highlight {
  id: string;
  segmentId: string;
  text: string;
  createdAt: number;
}

export interface MeetingSummary {
  markdown: string;
  summaryItems: string[];
  actionItems: string[];
  keywords: string[];
}
