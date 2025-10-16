import { mockMeetings, mockSegments, mockSummary } from "../mockData";
import type { Meeting, MeetingSummary, TranscriptSegment } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type TranscriptApiSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
};

async function safeFetch<T>(input: RequestInfo | URL, init?: RequestInit, fallback?: () => T): Promise<T> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn("[api] Falling back to mock data:", error);
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  return safeFetch(
    `${API_BASE_URL}/meetings`,
    undefined,
    () => mockMeetings,
  );
}

export async function fetchSummary(meetingId: string): Promise<MeetingSummary> {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/summary`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const markdown = await response.text();
    return {
      markdown,
      summaryItems: extractSection(markdown, "摘要"),
      actionItems: extractSection(markdown, "行动项"),
      keywords: extractSection(markdown, "关键词"),
    };
  } catch (error) {
    console.warn("[api] Summary fallback:", error);
    return mockSummary;
  }
}

export async function uploadTranscription(meetingId: string, file: Blob): Promise<TranscriptSegment[]> {
  try {
    const formData = new FormData();
    formData.append("audio", file, "recording.webm");
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcribe failed with status ${response.status}`);
    }

    const data = await response.json();
    return (data.highlights ?? []).map((item: any, index: number) => ({
      id: `trans-${index}`,
      speaker: item.speaker ?? "Speaker",
      text: typeof item === "string" ? item : item.text ?? "",
      start: item.start ?? 0,
      end: item.end ?? 0,
      createdAt: Date.now(),
    }));
  } catch (error) {
    console.warn("[api] Transcribe fallback:", error);
    return mockSegments;
  }
}

export async function fetchTranscriptSegments(meetingId: string): Promise<TranscriptSegment[]> {
  const fallback = () =>
    mockSegments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
      speaker: segment.speaker,
    }));

  const rawSegments = await safeFetch<TranscriptApiSegment[]>(
    `${API_BASE_URL}/meetings/${meetingId}/transcript`,
    undefined,
    fallback,
  );

  return rawSegments.map((segment, index) => ({
    id: `remote-${meetingId}-${index}-${segment.start}`,
    speaker: segment.speaker ?? `Speaker ${index + 1}`,
    text: segment.text,
    start: segment.start,
    end: segment.end,
    createdAt: Date.now(),
  }));
}

export function extractSection(markdown: string, heading: string): string[] {
  const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##|$)`, "i");
  const match = markdown.match(regex);
  if (!match) {
    return [];
  }

  const lines = match[0]
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^[-*+]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return lines;
}
