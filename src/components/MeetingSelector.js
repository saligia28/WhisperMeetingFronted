import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "clsx";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
export function MeetingSelector({ meetings, value, onChange, onCreateNew }) {
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [meetings.map((meeting) => {
                const isActive = meeting.id === value;
                return (_jsxs("button", { type: "button", onClick: () => onChange(meeting.id), className: clsx("group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200", isActive
                        ? "border-primary-300 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:text-slate-800 hover:shadow-sm"), children: [_jsx(CalendarDaysIcon, { className: "h-4 w-4 text-primary-500" }), meeting.title ?? "未命名会议"] }, meeting.id));
            }), _jsx("button", { type: "button", onClick: onCreateNew, className: "inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-primary-300 hover:text-primary-600 hover:shadow-sm", children: "\u65B0\u5EFA\u4F1A\u8BAE" })] }));
}
