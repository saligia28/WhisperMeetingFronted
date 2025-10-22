import { useMemo, useRef, useState } from "react";
import { MicrophoneIcon, PauseIcon, PlayIcon, StopIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

import type { Meeting } from "../types";
import type { VadConfig } from "../types/vad";
import { DEFAULT_VAD_CONFIG } from "../types/vad";
import { Panel } from "./Panel";
import { VadSettingsDrawer, VadSettingsFab } from "./VadSettingsDrawer";

interface RecorderPanelProps {
  meeting?: Meeting | null;
  recorderState: string;
  isRecording: boolean;
  onStart: (vadConfig?: VadConfig) => void;
  onStop: () => void;
  onImport: (file: File) => void;
  onUploadLatest: () => void;
  busy?: boolean;
  error?: string | null;
  controlsDisabled?: boolean;
  stopAndUploadLabel?: string;
  mode?: "websocket" | "upload";
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
  controlsDisabled = false,
  stopAndUploadLabel = "停止 & 上载",
  mode = "upload",
}: RecorderPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMeetingReady = Boolean(meeting);
  const controlsLocked = controlsDisabled || !isMeetingReady;

  // VAD settings state
  const [vadSettings, setVadSettings] = useState<VadConfig>(DEFAULT_VAD_CONFIG);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsLocked, setSettingsLocked] = useState(false);

  const isRealtimeMode = mode === "websocket";

  const meetingLabel = useMemo(() => {
    if (!isMeetingReady || !meeting) {
      return "请先选择会议或创建新的会话";
    }
    const durationMinutes = meeting.duration ? Math.max(1, Math.round(meeting.duration / 60)) : 0;
    const durationLabel = durationMinutes > 0 ? `${durationMinutes} min` : "待记录";
    return `${meeting.title ?? "未命名会议"} · ${durationLabel}`;
  }, [isMeetingReady, meeting]);

  const statusText = useMemo(() => {
    if (!isMeetingReady || !meeting) {
      return "请先选择或创建会议";
    }
    if (busy) {
      return isRealtimeMode ? "实时数据同步中..." : "音频上传中...";
    }
    if (isRecording) {
      return isRealtimeMode ? "实时录音中" : "录音进行中";
    }
    switch (recorderState) {
      case "denied":
        return "麦克风权限被拒绝，请在浏览器设置中开启";
      case "unsupported":
        return "当前浏览器不支持录音；请改用 Chrome / Edge 等现代浏览器";
      case "connecting":
        return "正在建立实时连接";
      case "connected":
        return "连接已就绪";
      default:
        return isRealtimeMode ? "待命（实时）" : "待命";
    }
  }, [isMeetingReady, meeting, busy, isRecording, recorderState, isRealtimeMode]);

  const startStopDisabled =
    (!isRecording && controlsLocked) || busy || recorderState === "unsupported" || recorderState === "denied";
  const stopAndUploadDisabled = !isRecording;
  const importDisabled = controlsLocked;
  const uploadLatestDisabled = controlsLocked || busy;
  const showStopUploadButton = !isRealtimeMode;

  const handleStartRecording = () => {
    if (startStopDisabled) return;

    if (isRecording) {
      onStop();
      setSettingsLocked(false);
    } else {
      setSettingsLocked(true);
      // Pass VAD config only in realtime mode
      onStart(isRealtimeMode ? vadSettings : undefined);
    }
  };

  const handleStopRecording = () => {
    if (stopAndUploadDisabled) return;
    onStop();
    setSettingsLocked(false);
  };

  return (
    <Panel
      title="录音控制"
      description="开启实时记录或导入历史音频，支持自动调用转写流水线"
      action={
        <div className="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600">
          <span className={clsx("relative flex h-2.5 w-2.5 items-center justify-center")}>
            <span
              className={clsx(
                "inline-flex h-2 w-2 rounded-full transition-all duration-500",
                !meeting && "bg-amber-500",
                meeting && !isRecording && "bg-emerald-500",
                meeting && isRecording && "bg-rose-500",
              )}
            />
            {isRecording ? <span className="absolute inline-flex h-5 w-5 rounded-full bg-rose-400/40 animate-pulse" /> : null}
          </span>
          {statusText}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 sm:gap-5 sm:justify-between">
          <div className="basis-full sm:flex-1">
            <p className="text-sm font-medium text-slate-600">当前会议</p>
            <p className="text-base font-semibold text-slate-900">{meetingLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-end">
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={startStopDisabled}
              className={clsx(
                "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:cursor-not-allowed disabled:opacity-50",
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
            {showStopUploadButton ? (
              <button
                type="button"
                onClick={handleStopRecording}
                disabled={stopAndUploadDisabled}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                <PauseIcon className="h-4 w-4" />
                {stopAndUploadLabel}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-surface-100/80 p-4">
          <p className="text-sm font-medium text-slate-600">导入历史音频</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={importDisabled}
              onClick={(event) => {
                if (importDisabled) {
                  event.preventDefault();
                  return;
                }
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-600 transition hover:border-primary-300 hover:text-primary-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <PlayIcon className="h-4 w-4" />
              选择文件
            </button>
            <button
              type="button"
              onClick={() => {
                if (uploadLatestDisabled) {
                  return;
                }
                onUploadLatest();
              }}
              disabled={uploadLatestDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <StopIcon className="h-4 w-4" />
              上传最近录音
            </button>
            <p className="w-full text-xs text-slate-500 sm:w-auto">支持 WAV / MP3 / M4A / WebM，最长 2 小时</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            disabled={controlsLocked}
            className="hidden"
            onChange={(event) => {
              if (importDisabled) {
                event.preventDefault();
                return;
              }
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
                event.target.value = "";
              }
            }}
          />
        </div>
        {!meeting ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-medium">⚠️ 请先选择或创建会议</p>
            <p className="mt-1 text-xs text-amber-600">在左侧会议列表中选择现有会议，或点击"创建新会议"按钮开始。</p>
          </div>
        ) : null}
        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      </div>

      {/* VAD Settings - only show in realtime mode */}
      {isRealtimeMode ? (
        <>
          <VadSettingsFab onClick={() => setDrawerOpen(true)} disabled={false} />
          <VadSettingsDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            aggressiveness={vadSettings.aggressiveness}
            speechRatio={vadSettings.speechRatio}
            locked={settingsLocked}
            onChange={setVadSettings}
          />
        </>
      ) : null}
    </Panel>
  );
}
