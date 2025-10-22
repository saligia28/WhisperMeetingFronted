import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bars3Icon } from "@heroicons/react/24/outline";
import clsx from "clsx";

import { MeetingSelector } from "./components/MeetingSelector";
import { RecorderPanel } from "./components/RecorderPanel";
import { TranscriptStream } from "./components/TranscriptStream";
import { HighlightsPanel } from "./components/HighlightsPanel";
import { SummaryPanel } from "./components/SummaryPanel";
import { ExportPanel } from "./components/ExportPanel";
import { useMediaRecorder } from "./hooks/useMediaRecorder";
import { useRealtimeTranscription } from "./hooks/useRealtimeTranscription";
import { useTranscriptSimulation } from "./hooks/useTranscriptSimulation";
import {
  createMeeting,
  deleteMeeting,
  fetchMeetings,
  fetchSummary,
  fetchTranscriptSegments,
  getUserSettings,
  streamTranscription,
  updateUserSettings,
  uploadTranscription,
} from "./services/api";
import type { Highlight, Meeting, MeetingSummary, TranscriptSegment } from "./types";
import type { VadConfig } from "./types/vad";

const gradient =
  "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(165,180,252,0.2),_transparent_60%)]";

const segmentsAreEqual = (current: TranscriptSegment[], next: TranscriptSegment[]) => {
  if (current.length !== next.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    const a = current[index];
    const b = next[index];
    if (
      a.id !== b.id ||
      a.text !== b.text ||
      a.start !== b.start ||
      a.end !== b.end ||
      a.speaker !== b.speaker ||
      a.createdAt !== b.createdAt
    ) {
      return false;
    }
  }
  return true;
};

export default function App() {
  const queryClient = useQueryClient();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [latestBlob, setLatestBlob] = useState<Blob | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);
  const mockFallbackEnabled = (import.meta.env.VITE_ENABLE_MOCK_FALLBACK ?? "false") === "true";

  // 启用 WebSocket 实时转写（新方案）
  const useWebSocketTranscription = true;

  // console.log('[App.tsx] useWebSocketTranscription:', useWebSocketTranscription);

  const streamOffsetRef = useRef(0);
  const streamQueueRef = useRef<Promise<void>>(Promise.resolve());
  const streamSeqRef = useRef(0);
  const [isStreamingPending, setIsStreamingPending] = useState(false);

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: fetchMeetings,
  });

  // Load user VAD settings from backend
  const { data: userVadSettings } = useQuery<VadConfig>({
    queryKey: ["userSettings"],
    queryFn: getUserSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Update user VAD settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    },
  });

  // 注释掉自动选择会议的逻辑，要求用户手动选择
  // useEffect(() => {
  //   if (!loadingMeetings && meetings.length > 0 && !selectedMeetingId) {
  //     setSelectedMeetingId(meetings[0]?.id ?? null);
  //   }
  // }, [loadingMeetings, meetings, selectedMeetingId]);

  const selectedMeeting: Meeting | undefined = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId),
    [meetings, selectedMeetingId],
  );

  const {
    data: summary,
    isFetching: fetchingSummary,
    refetch: refetchSummary,
  } = useQuery<MeetingSummary>({
    queryKey: ["summary", selectedMeetingId],
    queryFn: async () => {
      if (!selectedMeetingId) {
        throw new Error("meeting not selected");
      }
      return fetchSummary(selectedMeetingId);
    },
    enabled: Boolean(selectedMeetingId),
    retry: 1,
  });

  const {
    data: persistedSegments = [],
    isFetching: fetchingTranscript,
    refetch: refetchTranscript,
  } = useQuery<TranscriptSegment[]>({
    queryKey: ["transcript", selectedMeetingId],
    queryFn: async () => {
      if (!selectedMeetingId) {
        return [];
      }
      return fetchTranscriptSegments(selectedMeetingId);
    },
    enabled: Boolean(selectedMeetingId),
    staleTime: 5_000,
  });

  const segmentsMap = useMemo(() => {
    return new Map(segments.map((segment) => [segment.id, segment]));
  }, [segments]);

  const handleStreamChunk = useCallback(
    (blob: Blob, durationSec: number) => {
      if (mockFallbackEnabled) {
        return;
      }
      if (!selectedMeetingId) {
        setBanner({ tone: "error", message: "请先选择会议后再开始录音。" });
        return;
      }

      streamQueueRef.current = streamQueueRef.current
        .then(async () => {
          setIsStreamingPending(true);
          const offset = streamOffsetRef.current;
          try {
            const rawSegments = await streamTranscription(selectedMeetingId, blob, offset);
            const now = Date.now();
            const enriched = rawSegments.map((segment, index) => ({
              id: `stream-${selectedMeetingId}-${streamSeqRef.current++}`,
              speaker: segment.speaker ?? `Speaker ${index + 1}`,
              text: segment.text,
              start: segment.start ?? offset,
              end: segment.end ?? segment.start ?? offset,
              createdAt: now,
            }));

            const chunkEnd = enriched.length > 0 ? Math.max(...enriched.map((segment) => segment.end)) : offset + durationSec;
            streamOffsetRef.current = Math.max(streamOffsetRef.current, chunkEnd);

            if (enriched.length > 0) {
              setSegments((current) => {
                const merged = [...current, ...enriched];
                return merged.sort((a, b) => a.start - b.start);
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "实时转写失败";
            setBanner({ tone: "error", message: `实时转写失败：${message}` });
          } finally {
            setIsStreamingPending(false);
          }
        })
        .catch((error) => {
          console.error("stream queue error", error);
        });
    },
    [mockFallbackEnabled, selectedMeetingId],
  );

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      if (!selectedMeetingId) {
        throw new Error("未选择会议");
      }
      return uploadTranscription(selectedMeetingId, blob);
    },
    onMutate: () => {
      setBanner({ tone: "info", message: "正在上传并触发转写..." });
    },
    onSuccess: async (newSegments) => {
      if (newSegments.length > 0) {
        setSegments(newSegments.sort((a, b) => a.start - b.start));
      }
      setBanner({ tone: "success", message: "转写任务已完成，字幕即将同步。" });
      if (selectedMeetingId) {
        await Promise.all([
          refetchTranscript(),
          queryClient.invalidateQueries({ queryKey: ["summary", selectedMeetingId] }),
        ]);
      }
    },
    onError: (error: Error) => {
      setBanner({ tone: "error", message: `上传失败：${error.message}` });
    },
    onSettled: () => {
      window.setTimeout(() => setBanner(null), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => deleteMeeting(meetingId),
    onMutate: () => {
      setBanner({ tone: "info", message: "正在删除会议..." });
    },
    onSuccess: (_, meetingId) => {
      const updatedMeetings =
        queryClient.setQueryData<Meeting[]>(["meetings"], (prev = []) =>
          prev.filter((meeting) => meeting.id !== meetingId),
        ) ?? [];

      queryClient.removeQueries({ queryKey: ["summary", meetingId] });
      queryClient.removeQueries({ queryKey: ["transcript", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });

      if (selectedMeetingId === meetingId) {
        const nextMeetingId = updatedMeetings[0]?.id ?? null;
        setSelectedMeetingId(nextMeetingId);
        setSegments([]);
        setHighlights([]);
        streamQueueRef.current = Promise.resolve();
        streamSeqRef.current = 0;
        streamOffsetRef.current = 0;
      }

      setBanner({ tone: "success", message: "会议已删除。" });
    },
    onError: (error: Error) => {
      setBanner({ tone: "error", message: `删除会议失败：${error.message}` });
    },
    onSettled: () => {
      window.setTimeout(() => setBanner(null), 4000);
    },
  });

  const handleDeleteMeeting = useCallback(
    (meetingId: string) => {
      if (!meetingId || deleteMutation.isPending) {
        return;
      }
      deleteMutation.mutate(meetingId);
    },
    [deleteMutation.isPending, deleteMutation.mutate],
  );

  const handleUpload = useCallback(
    async (blob: Blob | null) => {
      if (!blob) {
        setBanner({ tone: "error", message: "暂无可上传的音频，请先录制或导入。" });
        return;
      }
      if (!selectedMeetingId) {
        setBanner({ tone: "error", message: "请先选择会议后再上传音频。" });
        return;
      }
      setLatestBlob(blob);
      uploadMutation.mutate(blob);
    },
    [selectedMeetingId, uploadMutation.mutate],
  );

  // WebSocket 实时转写回调
  const handleRealtimeSegments = useCallback((newSegments: TranscriptSegment[]) => {
    if (newSegments.length > 0) {
      console.log("[App] Received realtime segments:", newSegments.length);
      setSegments((current) => {
        const merged = [...current, ...newSegments];
        return merged.sort((a, b) => a.start - b.start);
      });
    }
  }, []);

  const handleRealtimeError = useCallback((error: string) => {
    setBanner({ tone: "error", message: `实时转写错误：${error}` });
  }, []);

  // WebSocket 实时转写 Hook
  const realtimeTranscription = useRealtimeTranscription({
    meetingId: useWebSocketTranscription ? selectedMeetingId : null,
    onSegments: handleRealtimeSegments,
    onError: handleRealtimeError,
  });
  const previousRealtimeStateRef = useRef(realtimeTranscription.state);

  // 传统 MediaRecorder Hook（作为备选）
  const recorder = useMediaRecorder({
    onData: (blob) => {
      handleUpload(blob);
    },
    // 暂时禁用实时流式转写，因为 MediaRecorder 分块生成的文件缺少完整头部
    // onChunk: handleStreamChunk,
    onChunk: undefined,
    chunkDurationMs: 4000,
  });

  useEffect(() => {
    // 仅在非 WebSocket 模式或非录音状态时同步持久化的 segments
    if (!useWebSocketTranscription && !recorder.isRecording && !uploadMutation.isPending) {
      setSegments((current) => {
        if (segmentsAreEqual(current, persistedSegments)) {
          return current;
        }
        return persistedSegments;
      });
      const latestEnd = persistedSegments.reduce((max, segment) => Math.max(max, segment.end), 0);
      streamOffsetRef.current = latestEnd;
    }
  }, [useWebSocketTranscription, persistedSegments, recorder.isRecording, uploadMutation.isPending]);

  useEffect(() => {
    setHighlights([]);
  }, [selectedMeetingId]);

  useEffect(() => {
    streamQueueRef.current = Promise.resolve();
    streamSeqRef.current = 0;
    streamOffsetRef.current = 0;
  }, [selectedMeetingId]);

  useEffect(() => {
    if (!useWebSocketTranscription) {
      previousRealtimeStateRef.current = realtimeTranscription.state;
      return;
    }

    const previous = previousRealtimeStateRef.current;
    const current = realtimeTranscription.state;

    if (previous === "recording" && current === "idle" && selectedMeetingId) {
      void refetchTranscript();
      void refetchSummary();
    }

    previousRealtimeStateRef.current = current;
  }, [useWebSocketTranscription, realtimeTranscription.state, selectedMeetingId, refetchTranscript, refetchSummary]);

  const handleSimulationSegment = useCallback((segment: TranscriptSegment) => {
    setSegments((current) => [...current.slice(-30), segment]);
  }, []);

  useTranscriptSimulation({
    isActive:
      mockFallbackEnabled &&
      recorder.isRecording &&
      !uploadMutation.isPending &&
      persistedSegments.length === 0,
    onSegment: handleSimulationSegment,
  });

  const handleHighlight = useCallback((segment: TranscriptSegment) => {
    setHighlights((current) => [
      ...current,
      {
        id: `${segment.id}-${Date.now()}`,
        segmentId: segment.id,
        text: segment.text,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const handleRemoveHighlight = useCallback((id: string) => {
    setHighlights((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleCreateMeeting = useCallback(async () => {
    const title = `临时会议 ${meetings.length + 1}`;
    try {
      const meeting = await createMeeting({ title, language: "zh" });
      queryClient.setQueryData<Meeting[]>(["meetings"], (prev = []) => {
        const existing = prev.filter((item) => item.id !== meeting.id);
        return [meeting, ...existing];
      });
      setSelectedMeetingId(meeting.id);
      setSegments([]);
      setHighlights([]);
      setBanner({ tone: "success", message: "已创建会议，可开始录音或上传音频。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建会议失败";
      setBanner({ tone: "error", message });
    }
  }, [meetings.length, queryClient]);

  const downloadMarkdown = useCallback(() => {
    if (!summary) {
      setBanner({ tone: "error", message: "暂无摘要可以导出。" });
      return;
    }
    const blob = new Blob([summary.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMeeting?.title ?? "meeting"}-summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedMeeting?.title, summary]);

  const recorderControlsDisabled = meetings.length === 0 || !selectedMeeting;

  return (
    <div className={`relative min-h-screen bg-surface-50 ${gradient}`}>
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-br from-primary-400/30 via-primary-200/20 to-transparent blur-3xl" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-10 md:px-10 lg:flex-row lg:gap-8">
        <aside className="lg:w-72">
          <div className="flex flex-col gap-5 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:sticky lg:top-10 lg:max-h-[calc(100vh-160px)] lg:overflow-hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">会话管理</p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">会议列表</h2>
              <p className="mt-1 text-xs text-slate-500">切换历史记录或创建新的会议房间。</p>
            </div>
            <MeetingSelector
              meetings={meetings}
              value={selectedMeetingId}
              onChange={setSelectedMeetingId}
              onCreateNew={handleCreateMeeting}
              onDelete={handleDeleteMeeting}
              deletingMeetingId={deleteMutation.isPending ? deleteMutation.variables ?? null : null}
              className="flex-1"
            />
          </div>
        </aside>
        <div className="flex flex-1 flex-col gap-6">
          <header className="rounded-3xl border border-white/60 bg-white/80 px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/40">
                <Bars3Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">WhisperMeeting 控制台</h1>
                <p className="text-sm text-slate-500">全流程会议记录与摘要助手</p>
              </div>
            </div>
            <div className="mt-4">
              {banner ? (
                <div
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-medium shadow-sm transition",
                    banner.tone === "success" && "bg-emerald-100 text-emerald-700",
                    banner.tone === "error" && "bg-rose-100 text-rose-600",
                    banner.tone === "info" && "bg-primary-50 text-primary-600",
                  )}
                >
                  {banner.message}
                </div>
              ) : (
                <p className="text-xs uppercase tracking-wide text-slate-400">Tailwind + React + Whisper 后端</p>
              )}
            </div>
          </header>

          <main className="flex w-full flex-col gap-6">
            <RecorderPanel
              meeting={selectedMeeting}
              controlsDisabled={recorderControlsDisabled}
              recorderState={useWebSocketTranscription ? realtimeTranscription.state : recorder.state}
              isRecording={useWebSocketTranscription ? realtimeTranscription.isRecording : recorder.isRecording}
              onStart={useWebSocketTranscription ? realtimeTranscription.startRecording : recorder.startRecording}
              onStop={useWebSocketTranscription ? realtimeTranscription.stopRecording : recorder.stopRecording}
              onImport={(file) => handleUpload(file)}
              onUploadLatest={() => handleUpload(latestBlob)}
              busy={uploadMutation.isPending || fetchingTranscript || isStreamingPending}
              error={useWebSocketTranscription ? realtimeTranscription.error ?? undefined : recorder.error ?? undefined}
              mode={useWebSocketTranscription ? "websocket" : "upload"}
              initialVadSettings={userVadSettings}
              onVadSettingsChange={(settings) => updateSettingsMutation.mutate(settings)}
              audioLevel={useWebSocketTranscription ? realtimeTranscription.audioLevel : recorder.audioLevel}
            />
            <TranscriptStream
              segments={segments}
              onHighlight={handleHighlight}
              isStreaming={useWebSocketTranscription ? realtimeTranscription.isRecording : recorder.isRecording || isStreamingPending}
              isLoading={fetchingTranscript && !(useWebSocketTranscription ? realtimeTranscription.isRecording : recorder.isRecording)}
            />
            <HighlightsPanel highlights={highlights} segments={segmentsMap} onRemove={handleRemoveHighlight} />
            <SummaryPanel summary={summary} isLoading={fetchingSummary} onRefresh={() => refetchSummary()} />
            <ExportPanel onDownloadMarkdown={downloadMarkdown} />
          </main>
        </div>
      </div>
    </div>
  );
}
