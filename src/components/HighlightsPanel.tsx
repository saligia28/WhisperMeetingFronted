import { Fragment } from "react";
import { BookmarkIcon, TrashIcon } from "@heroicons/react/24/outline";

import type { Highlight, TranscriptSegment } from "../types";
import { Panel } from "./Panel";

interface HighlightsPanelProps {
  highlights: Highlight[];
  segments: Map<string, TranscriptSegment>;
  onRemove: (id: string) => void;
}

export function HighlightsPanel({ highlights, segments, onRemove }: HighlightsPanelProps) {
  return (
    <Panel
      title="重点标记"
      description="收集会议中的关键句，方便整理与二次编辑"
      className="lg:col-span-1"
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
          <BookmarkIcon className="h-3.5 w-3.5" />
          {highlights.length} 条
        </span>
      }
    >
      {highlights.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
          <p>暂无重点</p>
          <p className="text-xs text-slate-400">在实时字幕中点击“标记重点”可快速添加</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {highlights.map((highlight) => {
            const segment = segments.get(highlight.segmentId);
            return (
              <li key={highlight.id} className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 transition hover:border-primary-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">{segment?.speaker ?? "Speaker"}</p>
                    <p className="mt-1 text-sm text-slate-500">{segment ? segment.text : highlight.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(highlight.id)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-400">{highlight.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
