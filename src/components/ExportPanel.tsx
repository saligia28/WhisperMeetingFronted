import { ArrowDownTrayIcon, DocumentDuplicateIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

import { Panel } from "./Panel";

interface ExportPanelProps {
  onDownloadMarkdown: () => void;
  onCopyLink?: () => void;
}

export function ExportPanel({ onDownloadMarkdown, onCopyLink }: ExportPanelProps) {
  return (
    <Panel
      title="导出"
      description="将会议内容同步到知识库或下载为 Markdown"
      action={<span className="text-xs font-medium text-slate-400">Beta</span>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <ExportCard
          icon={<ArrowDownTrayIcon className="h-6 w-6 text-primary-500" />}
          title="下载 Markdown"
          description="保存到本地，便于分享及归档"
          onClick={onDownloadMarkdown}
        />
        <ExportCard
          icon={<DocumentTextIcon className="h-6 w-6 text-primary-500" />}
          title="推送到 Notion"
          description="需连接自动化脚本，功能规划中"
          disabled
        />
        <ExportCard
          icon={<DocumentDuplicateIcon className="h-6 w-6 text-primary-500" />}
          title="同步到 Jira"
          description="敬请期待"
          disabled
        />
      </div>
    </Panel>
  );
}

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
}

function ExportCard({ icon, title, description, disabled, onClick }: ExportCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 group-hover:bg-primary-100">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </button>
  );
}
