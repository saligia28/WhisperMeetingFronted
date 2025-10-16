import type { Dispatch, SetStateAction } from "react";
import clsx from "clsx";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

import type { Meeting } from "../types";

interface MeetingSelectorProps {
  meetings: Meeting[];
  value: string | null;
  onChange: Dispatch<SetStateAction<string | null>>;
  onCreateNew?: () => void;
}

export function MeetingSelector({ meetings, value, onChange, onCreateNew }: MeetingSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {meetings.map((meeting) => {
        const isActive = meeting.id === value;
        return (
          <button
            key={meeting.id}
            type="button"
            onClick={() => onChange(meeting.id)}
            className={clsx(
              "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "border-primary-300 bg-primary-50 text-primary-700 shadow-sm"
                : "border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:text-slate-800 hover:shadow-sm",
            )}
          >
            <CalendarDaysIcon className="h-4 w-4 text-primary-500" />
            {meeting.title ?? "未命名会议"}
          </button>
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
