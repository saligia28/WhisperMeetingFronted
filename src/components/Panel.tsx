import type { PropsWithChildren, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface PanelProps {
  title: string;
  description?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Panel({ title, description, children, className, action }: PropsWithChildren<PanelProps>) {
  return (
    <section
      className={twMerge(
        "relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
