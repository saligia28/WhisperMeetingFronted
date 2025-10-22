import { SparklesIcon } from "@heroicons/react/24/outline";

import type { MeetingSummary } from "../types";
import { Panel } from "./Panel";

interface SummaryPanelProps {
  summary?: MeetingSummary;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function SummaryPanel({ summary, isLoading = false, onRefresh }: SummaryPanelProps) {
  return (
    <Panel
      title="摘要与行动项"
      description="快速回顾会议重点，支持导出 Markdown"
      className="w-full"
      action={
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-60"
        >
          <SparklesIcon className="h-4 w-4" />
          刷新摘要
        </button>
      }
    >
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 text-sm text-slate-500">
          正在获取摘要...
        </div>
      ) : summary ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="会议摘要" items={summary.summaryItems} placeholder="暂无摘要，可在转写完成后生成。" />
          <Section title="行动项" items={summary.actionItems} placeholder="暂无行动项，试着标记重点或刷新摘要。" />
          <div className="md:col-span-2">
            <Section
              title="关键词"
              items={summary.keywords}
              placeholder="暂无关键词"
              renderItem={(item) => (
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">{item}</span>
              )}
            />
          </div>
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Markdown 预览</p>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{summary.markdown}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
          <p>暂无摘要数据</p>
          <p className="text-xs text-slate-400">当完成一次转写后即可查看自动生成的会议摘要</p>
        </div>
      )}
    </Panel>
  );
}

interface SectionProps {
  title: string;
  items: string[];
  placeholder: string;
  renderItem?: (item: string) => React.ReactNode;
}

function Section({ title, items, placeholder, renderItem }: SectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{placeholder}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="text-sm text-slate-600">
              {renderItem ? renderItem(item) : item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
