import type { TranscriptSegment } from "../types";
import { Panel } from "./Panel";

interface TranscriptStreamProps {
  segments: TranscriptSegment[];
  onHighlight: (segment: TranscriptSegment) => void;
  isStreaming: boolean;
  isLoading?: boolean;
}

export function TranscriptStream({ segments, onHighlight, isStreaming, isLoading = false }: TranscriptStreamProps) {
  return (
    <Panel
      title="实时字幕"
      description="同步显示转写文本，可一键标记重点"
      action={
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-600">
          <span className={`relative flex h-2.5 w-2.5 items-center justify-center`}>
            <span className={`h-2 w-2 rounded-full ${isStreaming ? "bg-emerald-500" : "bg-slate-300"}`} />
            {isStreaming ? <span className="absolute inline-flex h-5 w-5 animate-pulse rounded-full bg-emerald-400/40" /> : null}
          </span>
          {isStreaming ? "Streaming" : "Standby"}
        </span>
      }
      className="lg:col-span-2"
    >
      <div className="relative max-h-[320px] overflow-hidden rounded-2xl bg-gradient-to-b from-white via-white to-surface-100">
        <div className="custom-scroll h-[320px] overflow-y-auto px-4 py-2 pr-2">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <p>读取转写数据中...</p>
            </div>
          ) : segments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
              <p>尚无转写内容</p>
              <p className="text-xs">开始录音或导入音频即可看到实时字幕</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {segments.map((segment) => (
                <li
                  key={segment.id}
                  className="group rounded-2xl border border-slate-200/70 bg-white/80 p-3 transition-all duration-200 hover:border-primary-200 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-primary-500">{segment.speaker}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onHighlight(segment)}
                      className="inline-flex items-center gap-2 rounded-full border border-transparent bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 transition group-hover:border-primary-200 group-hover:bg-primary-100"
                    >
                      标记重点
                    </button>
                  </div>
                  <p className="mt-3 text-base text-slate-900">{segment.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}
