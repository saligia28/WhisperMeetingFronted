import { useMemo, useRef } from "react";
import { MicrophoneIcon, PauseIcon, PlayIcon, StopIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

import type { Meeting } from "../types";
import { Panel } from "./Panel";

interface RecorderPanelProps {
  meeting?: Meeting | null;
  recorderState: string;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onImport: (file: File) => void;
  onUploadLatest: () => void;
  busy?: boolean;
  error?: string | null;
}

export function RecorderPanel({
  meeting,
  recorderState,
  isRecording,
  onStart,
  onStop,
  onImport,
  onUploadLatest,
  busy = false,
  error,
}: RecorderPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <Panel
      title="录音控制"
      description="开启实时记录或导入历史音频，支持自动调用转写流水线"
      action={
        <div className="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600">
          <span className={clsx("relative flex h-2.5 w-2.5 items-center justify-center")}>
            <span
              className={clsx(
                "inline-flex h-2 w-2 rounded-full bg-emerald-500 transition-all duration-500",
                isRecording && "bg-rose-500",
              )}
            />
            {isRecording ? <span className="absolute inline-flex h-5 w-5 rounded-full bg-rose-400/40 animate-pulse" /> : null}
          </span>
          {statusText}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-600">当前会议</p>
            <p className="text-base font-semibold text-slate-900">{meetingLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isRecording ? onStop : onStart}
              disabled={busy || recorderState === "unsupported" || recorderState === "denied"}
              className={clsx(
                "group relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
                isRecording
                  ? "bg-rose-500 hover:bg-rose-600 active:scale-95"
                  : "bg-primary-500 hover:bg-primary-600 active:scale-95",
              )}
            >
              <span
                className={clsx("absolute inset-0 rounded-full border border-white/35 transition-opacity duration-300", {
                  "opacity-80": isRecording,
                  "opacity-0": !isRecording,
                })}
              />
              {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={!isRecording}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PauseIcon className="h-4 w-4" />
              停止 & 上载
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-surface-100/80 p-4">
          <p className="text-sm font-medium text-slate-600">导入历史音频</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 transition hover:border-primary-300 hover:text-primary-700 hover:shadow-sm"
            >
              <PlayIcon className="h-4 w-4" />
              选择文件
            </button>
            <button
              type="button"
              onClick={onUploadLatest}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <StopIcon className="h-4 w-4" />
              上传最近录音
            </button>
            <p className="text-xs text-slate-500">支持 WAV / MP3 / M4A / WebM，最长 2 小时</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
                event.target.value = "";
              }
            }}
          />
        </div>
        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      </div>
    </Panel>
  );
}
