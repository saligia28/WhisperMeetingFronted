import type { Dispatch, SetStateAction } from "react";
import clsx from "clsx";
import { CalendarDaysIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import type { Meeting } from "../types";

interface MeetingSelectorProps {
  meetings: Meeting[];
  value: string | null;
  onChange: Dispatch<SetStateAction<string | null>>;
  onCreateNew?: () => void | Promise<void>;
  onDelete?: (meetingId: string) => void | Promise<void>;
  deletingMeetingId?: string | null;
  className?: string;
}

export function MeetingSelector({
  meetings,
  value,
  onChange,
  onCreateNew,
  onDelete,
  deletingMeetingId = null,
  className,
}: MeetingSelectorProps) {
  return (
    <div className={clsx("flex flex-1 flex-col gap-4", className)}>
      {onCreateNew ? (
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
        >
          <PlusIcon className="h-4 w-4" />
          创建新会议
        </button>
      ) : null}
      <div className="custom-scroll -mx-1 flex-1 overflow-y-auto px-1">
        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-sm text-slate-400">
            暂无会议，点击上方按钮新建
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {meetings.map((meeting) => {
              const isActive = meeting.id === value;
              const isDeleting = deletingMeetingId === meeting.id;
              return (
                <li key={meeting.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(meeting.id)}
                    disabled={isDeleting}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition-all duration-200",
                      isActive
                        ? "border-primary-200 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-800 hover:shadow-sm",
                      isDeleting && "cursor-wait opacity-60",
                    )}
                  >
                    <CalendarDaysIcon className="h-4 w-4 text-primary-500" />
                    <span className="flex-1 truncate">{meeting.title ?? "未命名会议"}</span>
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(meeting.id)}
                      disabled={isDeleting}
                      className={clsx(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/80 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200",
                        isDeleting && "cursor-wait opacity-70",
                      )}
                      aria-label={`删除会议 ${meeting.title ?? meeting.id}`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
