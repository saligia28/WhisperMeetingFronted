import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const gradient = "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(165,180,252,0.2),_transparent_60%)]";
export default function App() {
    const queryClient = useQueryClient();
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);
    const [segments, setSegments] = useState([]);
    const [highlights, setHighlights] = useState([]);
    const [latestBlob, setLatestBlob] = useState(null);
    const [banner, setBanner] = useState(null);
    const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
        queryKey: ["meetings"],
        queryFn: fetchMeetings,
    });
    useEffect(() => {
        if (!loadingMeetings && meetings.length > 0 && !selectedMeetingId) {
            setSelectedMeetingId(meetings[0]?.id ?? null);
        }
    }, [loadingMeetings, meetings, selectedMeetingId]);
    const selectedMeeting = useMemo(() => meetings.find((meeting) => meeting.id === selectedMeetingId), [meetings, selectedMeetingId]);
    const { data: summary, isFetching: fetchingSummary, refetch: refetchSummary, } = useQuery({
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
    const { data: persistedSegments = [], isFetching: fetchingTranscript, refetch: refetchTranscript, } = useQuery({
        queryKey: ["transcript", selectedMeetingId],
        queryFn: async () => {
            if (!selectedMeetingId) {
                return [];
            }
            return fetchTranscriptSegments(selectedMeetingId);
        },
        enabled: Boolean(selectedMeetingId),
        staleTime: 5000,
    });
    const segmentsMap = useMemo(() => {
        return new Map(segments.map((segment) => [segment.id, segment]));
    }, [segments]);
    const uploadMutation = useMutation({
        mutationFn: async (blob) => {
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
        onError: (error) => {
            setBanner({ tone: "error", message: `上传失败：${error.message}` });
        },
        onSettled: () => {
            window.setTimeout(() => setBanner(null), 4000);
        },
    });
    const handleUpload = useCallback(async (blob) => {
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
    }, [selectedMeetingId, uploadMutation]);
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
    const handleHighlight = useCallback((segment) => {
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
    const handleRemoveHighlight = useCallback((id) => {
        setHighlights((current) => current.filter((item) => item.id !== id));
    }, []);
    const handleCreateMeeting = useCallback(() => {
        const newMeeting = {
            id: `local-${Date.now()}`,
            title: `临时会议 ${meetings.length + 1}`,
            duration: 0,
            language: "zh",
        };
        queryClient.setQueryData(["meetings"], (prev = []) => [newMeeting, ...prev]);
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
    return (_jsxs("div", { className: `relative min-h-screen bg-surface-50 ${gradient}`, children: [_jsx("div", { className: "absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-br from-primary-400/30 via-primary-200/20 to-transparent blur-3xl" }), _jsxs("div", { className: "mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:px-10", children: [_jsxs("header", { className: "flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/80 px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/40", children: _jsx(Bars3Icon, { className: "h-6 w-6" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-900", children: "WhisperMeeting \u63A7\u5236\u53F0" }), _jsx("p", { className: "text-sm text-slate-500", children: "\u5168\u6D41\u7A0B\u4F1A\u8BAE\u8BB0\u5F55\u4E0E\u6458\u8981\u52A9\u624B" })] })] }), _jsxs("div", { className: "flex flex-col gap-2 md:items-end", children: [banner ? (_jsx("div", { className: clsx("rounded-full px-4 py-2 text-sm font-medium shadow-sm transition", banner.tone === "success" && "bg-emerald-100 text-emerald-700", banner.tone === "error" && "bg-rose-100 text-rose-600", banner.tone === "info" && "bg-primary-50 text-primary-600"), children: banner.message })) : (_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Tailwind + React + Whisper \u540E\u7AEF" })), _jsx(MeetingSelector, { meetings: meetings, value: selectedMeetingId, onChange: setSelectedMeetingId, onCreateNew: handleCreateMeeting })] })] }), _jsxs("main", { className: "grid gap-6 lg:grid-cols-3", children: [_jsx(RecorderPanel, { meeting: selectedMeeting, recorderState: recorder.state, isRecording: recorder.isRecording, onStart: recorder.startRecording, onStop: recorder.stopRecording, onImport: (file) => handleUpload(file), onUploadLatest: () => handleUpload(latestBlob), busy: uploadMutation.isPending || fetchingTranscript, error: recorder.error ?? undefined }), _jsx(TranscriptStream, { segments: segments, onHighlight: handleHighlight, isStreaming: recorder.isRecording, isLoading: fetchingTranscript }), _jsx(HighlightsPanel, { highlights: highlights, segments: segmentsMap, onRemove: handleRemoveHighlight }), _jsx(SummaryPanel, { summary: summary, isLoading: fetchingSummary, onRefresh: () => refetchSummary() }), _jsx(ExportPanel, { onDownloadMarkdown: downloadMarkdown })] })] })] }));
}
