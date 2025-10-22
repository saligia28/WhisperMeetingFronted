import { mockMeetings, mockSegments, mockSummary } from "../mockData";
import type { Meeting, MeetingSummary, TranscriptSegment } from "../types";
import type { VadConfig } from "../types/vad";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const allowMocks = (import.meta.env.VITE_ENABLE_MOCK_FALLBACK ?? "false") === "true";

type TranscriptApiSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
};

type UserSettingsResponse = {
  vad_aggressiveness: number;
  min_speech_ratio: number;
};

async function safeFetch<T>(input: RequestInfo | URL, init?: RequestInit, fallback?: () => T): Promise<T> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (fallback && allowMocks) {
      console.warn("[api] Falling back to mock data:", error);
      return fallback();
    }
    throw error;
  }
}

export async function fetchMeetings(): Promise<Meeting[]> {
  return safeFetch(
    `${API_BASE_URL}/meetings`,
    undefined,
    allowMocks ? () => mockMeetings : undefined,
  );
}

export async function createMeeting(payload: { title?: string; language?: string | null } = {}): Promise<Meeting> {
  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (allowMocks) {
      console.warn("[api] Create meeting fallback:", response.statusText);
      return mockMeetings[0];
    }
    throw new Error(`Create meeting failed with status ${response.status}`);
  }

  return (await response.json()) as Meeting;
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
    method: "DELETE",
  });

  if (response.status === 404) {
    throw new Error("会议不存在或已删除。");
  }

  if (!response.ok) {
    if (allowMocks) {
      console.warn("[api] Delete meeting fallback:", response.statusText);
      return;
    }
    throw new Error(`Delete meeting failed with status ${response.status}`);
  }
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
    if (allowMocks) {
      console.warn("[api] Summary fallback:", error);
      return mockSummary;
    }
    throw error instanceof Error ? error : new Error("Failed to load summary");
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
    const segments: TranscriptApiSegment[] = data.segments ?? [];
    return segments.map((segment, index) => ({
      id: `remote-${meetingId}-${Date.now()}-${index}`,
      speaker: segment.speaker ?? "Speaker",
      text: segment.text,
      start: segment.start ?? 0,
      end: segment.end ?? 0,
      createdAt: Date.now(),
    }));
  } catch (error) {
    if (allowMocks) {
      console.warn("[api] Transcribe fallback:", error);
      return mockSegments;
    }
    throw error instanceof Error ? error : new Error("Transcribe failed");
  }
}

export async function streamTranscription(
  meetingId: string,
  file: Blob,
  offsetSec: number,
): Promise<TranscriptApiSegment[]> {
  const formData = new FormData();
  formData.append("audio", file, "chunk.webm");

  const offsetParam = Number.isFinite(offsetSec) ? Number(offsetSec.toFixed(3)) : 0;
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/transcribe/chunk?offset=${offsetParam}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Stream transcribe failed with status ${response.status}`);
  }

  const payload = await response.json();
  return (payload.segments ?? []) as TranscriptApiSegment[];
}

export async function fetchTranscriptSegments(meetingId: string): Promise<TranscriptSegment[]> {
  const rawSegments = await safeFetch<TranscriptApiSegment[]>(
    `${API_BASE_URL}/meetings/${meetingId}/transcript`,
    undefined,
    allowMocks
      ? () =>
          mockSegments.map((segment) => ({
            start: segment.start,
            end: segment.end,
            text: segment.text,
            speaker: segment.speaker,
          }))
      : undefined,
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

/**
 * Get current user's VAD settings from backend
 */
export async function getUserSettings(): Promise<VadConfig> {
  const response = await fetch(`${API_BASE_URL}/user/settings`);

  if (!response.ok) {
    // Return default settings if fetch fails
    console.warn("[api] Failed to load user settings, using defaults");
    return { aggressiveness: 1, speechRatio: 30 };  // 与DEFAULT_VAD_CONFIG保持一致
  }

  const data: UserSettingsResponse = await response.json();
  return {
    aggressiveness: data.vad_aggressiveness,
    speechRatio: data.min_speech_ratio * 100, // Convert 0.5 -> 50
  };
}

/**
 * Update user's VAD settings on backend
 */
export async function updateUserSettings(config: VadConfig): Promise<VadConfig> {
  const response = await fetch(`${API_BASE_URL}/user/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vad_aggressiveness: config.aggressiveness,
      min_speech_ratio: config.speechRatio / 100, // Convert 50 -> 0.5
    }),
  });

  if (!response.ok) {
    throw new Error(`Update user settings failed with status ${response.status}`);
  }

  const data: UserSettingsResponse = await response.json();
  return {
    aggressiveness: data.vad_aggressiveness,
    speechRatio: data.min_speech_ratio * 100,
  };
}
