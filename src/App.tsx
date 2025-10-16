import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useTranscriptSimulation } from "./hooks/useTranscriptSimulation";
import { fetchMeetings, fetchSummary, fetchTranscriptSegments, uploadTranscription } from "./services/api";
import type { Highlight, Meeting, MeetingSummary, TranscriptSegment } from "./types";

const gradient =
  "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(165,180,252,0.2),_transparent_60%)]";

export default function App() {
  const queryClient = useQueryClient();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [latestBlob, setLatestBlob] = useState<Blob | null>(null);
  const [banner, setBanner] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: fetchMeetings,
  });

  useEffect(() => {
    if (!loadingMeetings && meetings.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(meetings[0]?.id ?? null);
    }
  }, [loadingMeetings, meetings, selectedMeetingId]);

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
        setSegments((current) => [...current, ...newSegments]);
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
    [selectedMeetingId, uploadMutation],
  );

  const recorder = useMediaRecorder({
    onData: (blob) => {
      setLatestBlob(blob);
      handleUpload(blob);
    },
  });

  useEffect(() => {
    if (!recorder.isRecording && !uploadMutation.isPending) {
      setSegments(persistedSegments);
    }
  }, [persistedSegments, recorder.isRecording, uploadMutation.isPending]);

  useEffect(() => {
    setHighlights([]);
  }, [selectedMeetingId]);

  useTranscriptSimulation({
    isActive: recorder.isRecording && !uploadMutation.isPending && persistedSegments.length === 0,
    onSegment: (segment) => {
      setSegments((current) => [...current.slice(-30), segment]);
    },
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

  const handleCreateMeeting = useCallback(() => {
    const newMeeting: Meeting = {
      id: `local-${Date.now()}`,
      title: `临时会议 ${meetings.length + 1}`,
      duration: 0,
      language: "zh",
    };
    queryClient.setQueryData<Meeting[]>(["meetings"], (prev = []) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setSegments([]);
    setHighlights([]);
    setBanner({ tone: "info", message: "已创建临时会议，可直接开始录音。" });
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

  return (
    <div className={`relative min-h-screen bg-surface-50 ${gradient}`}>
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-br from-primary-400/30 via-primary-200/20 to-transparent blur-3xl" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:px-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/40">
              <Bars3Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">WhisperMeeting 控制台</h1>
              <p className="text-sm text-slate-500">全流程会议记录与摘要助手</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
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
            <MeetingSelector meetings={meetings} value={selectedMeetingId} onChange={setSelectedMeetingId} onCreateNew={handleCreateMeeting} />
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-3">
          <RecorderPanel
            meeting={selectedMeeting}
            recorderState={recorder.state}
            isRecording={recorder.isRecording}
            onStart={recorder.startRecording}
            onStop={recorder.stopRecording}
            onImport={(file) => handleUpload(file)}
            onUploadLatest={() => handleUpload(latestBlob)}
            busy={uploadMutation.isPending || fetchingTranscript}
            error={recorder.error ?? undefined}
          />
          <TranscriptStream
            segments={segments}
            onHighlight={handleHighlight}
            isStreaming={recorder.isRecording}
            isLoading={fetchingTranscript}
          />
          <HighlightsPanel highlights={highlights} segments={segmentsMap} onRemove={handleRemoveHighlight} />
          <SummaryPanel summary={summary} isLoading={fetchingSummary} onRefresh={() => refetchSummary()} />
          <ExportPanel onDownloadMarkdown={downloadMarkdown} />
        </main>
      </div>
    </div>
  );
}
