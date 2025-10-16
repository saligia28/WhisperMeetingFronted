import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { MicrophoneIcon, PauseIcon, PlayIcon, StopIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { Panel } from "./Panel";
export function RecorderPanel({ meeting, recorderState, isRecording, onStart, onStop, onImport, onUploadLatest, busy = false, error, }) {
    const fileInputRef = useRef(null);
    const meetingLabel = useMemo(() => {
        if (!meeting) {
            return "请先选择会议或创建新的会话";
        }
        const durationMinutes = meeting.duration ? Math.max(1, Math.round(meeting.duration / 60)) : 0;
        const durationLabel = durationMinutes > 0 ? `${durationMinutes} min` : "待记录";
        return `${meeting.title ?? "未命名会议"} · ${durationLabel}`;
    }, [meeting]);
    const statusText = useMemo(() => {
        if (busy) {
            return "音频上传中...";
        }
        if (isRecording) {
            return "录音进行中";
        }
        switch (recorderState) {
            case "denied":
                return "麦克风权限被拒绝，请在浏览器设置中开启";
            case "unsupported":
                return "当前浏览器不支持录音；请改用 Chrome / Edge 等现代浏览器";
            default:
                return "待命";
        }
    }, [busy, isRecording, recorderState]);
    return (_jsx(Panel, { title: "\u5F55\u97F3\u63A7\u5236", description: "\u5F00\u542F\u5B9E\u65F6\u8BB0\u5F55\u6216\u5BFC\u5165\u5386\u53F2\u97F3\u9891\uFF0C\u652F\u6301\u81EA\u52A8\u8C03\u7528\u8F6C\u5199\u6D41\u6C34\u7EBF", action: _jsxs("div", { className: "flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600", children: [_jsxs("span", { className: clsx("relative flex h-2.5 w-2.5 items-center justify-center"), children: [_jsx("span", { className: clsx("inline-flex h-2 w-2 rounded-full bg-emerald-500 transition-all duration-500", isRecording && "bg-rose-500") }), isRecording ? _jsx("span", { className: "absolute inline-flex h-5 w-5 rounded-full bg-rose-400/40 animate-pulse" }) : null] }), statusText] }), children: _jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-600", children: "\u5F53\u524D\u4F1A\u8BAE" }), _jsx("p", { className: "text-base font-semibold text-slate-900", children: meetingLabel })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { type: "button", onClick: isRecording ? onStop : onStart, disabled: busy || recorderState === "unsupported" || recorderState === "denied", className: clsx("group relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400", isRecording
                                        ? "bg-rose-500 hover:bg-rose-600 active:scale-95"
                                        : "bg-primary-500 hover:bg-primary-600 active:scale-95"), children: [_jsx("span", { className: clsx("absolute inset-0 rounded-full border border-white/35 transition-opacity duration-300", {
                                                "opacity-80": isRecording,
                                                "opacity-0": !isRecording,
                                            }) }), isRecording ? _jsx(StopIcon, { className: "h-6 w-6" }) : _jsx(MicrophoneIcon, { className: "h-6 w-6" })] }), _jsxs("button", { type: "button", onClick: onStop, disabled: !isRecording, className: "inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50", children: [_jsx(PauseIcon, { className: "h-4 w-4" }), "\u505C\u6B62 & \u4E0A\u8F7D"] })] })] }), _jsxs("div", { className: "flex flex-col gap-4 rounded-2xl bg-surface-100/80 p-4", children: [_jsx("p", { className: "text-sm font-medium text-slate-600", children: "\u5BFC\u5165\u5386\u53F2\u97F3\u9891" }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("button", { type: "button", onClick: () => fileInputRef.current?.click(), className: "inline-flex items-center gap-2 rounded-full border border-dashed border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 transition hover:border-primary-300 hover:text-primary-700 hover:shadow-sm", children: [_jsx(PlayIcon, { className: "h-4 w-4" }), "\u9009\u62E9\u6587\u4EF6"] }), _jsxs("button", { type: "button", onClick: onUploadLatest, disabled: busy, className: "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50", children: [_jsx(StopIcon, { className: "h-4 w-4" }), "\u4E0A\u4F20\u6700\u8FD1\u5F55\u97F3"] }), _jsx("p", { className: "text-xs text-slate-500", children: "\u652F\u6301 WAV / MP3 / M4A / WebM\uFF0C\u6700\u957F 2 \u5C0F\u65F6" })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "audio/*", className: "hidden", onChange: (event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    onImport(file);
                                    event.target.value = "";
                                }
                            } })] }), error ? _jsx("p", { className: "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600", children: error }) : null] }) }));
}
