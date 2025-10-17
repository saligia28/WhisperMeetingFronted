import type { Dispatch, SetStateAction } from "react";
import clsx from "clsx";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";

import type { Meeting } from "../types";

interface MeetingSelectorProps {
  meetings: Meeting[];
  value: string | null;
  onChange: Dispatch<SetStateAction<string | null>>;
  onCreateNew?: () => void | Promise<void>;
  onDelete?: (meetingId: string) => void | Promise<void>;
  deletingMeetingId?: string | null;
}

export function MeetingSelector({
  meetings,
  value,
  onChange,
  onCreateNew,
  onDelete,
  deletingMeetingId = null,
}: MeetingSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {meetings.map((meeting) => {
        const isActive = meeting.id === value;
        const isDeleting = deletingMeetingId === meeting.id;
        return (
          <div key={meeting.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onChange(meeting.id)}
              disabled={isDeleting}
              className={clsx(
                "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "border-primary-300 bg-primary-50 text-primary-700 shadow-sm"
                  : "border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:text-slate-800 hover:shadow-sm",
                isDeleting && "cursor-not-allowed opacity-60",
              )}
            >
              <CalendarDaysIcon className="h-4 w-4 text-primary-500" />
              {meeting.title ?? "未命名会议"}
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(meeting.id)}
                disabled={isDeleting}
                className={clsx(
                  "ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-white/80 text-slate-400 transition",
                  "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500",
                  "focus:outline-none focus:ring-2 focus:ring-rose-200",
                  isDeleting && "cursor-wait opacity-70",
                )}
                aria-label={`删除会议 ${meeting.title ?? meeting.id}`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onCreateNew}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-primary-300 hover:text-primary-600 hover:shadow-sm"
      >
        新建会议
      </button>
    </div>
  );
}
