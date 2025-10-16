import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { twMerge } from "tailwind-merge";
export function Panel({ title, description, children, className, action }) {
    return (_jsxs("section", { className: twMerge("relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant", className), children: [_jsxs("header", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900", children: title }), description ? _jsx("p", { className: "mt-1 text-sm text-slate-500", children: description }) : null] }), action ? _jsx("div", { className: "shrink-0", children: action }) : null] }), children] }));
}
