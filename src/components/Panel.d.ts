import type { PropsWithChildren, ReactNode } from "react";
interface PanelProps {
    title: string;
    description?: ReactNode;
    className?: string;
    action?: ReactNode;
}
export declare function Panel({ title, description, children, className, action }: PropsWithChildren<PanelProps>): import("react/jsx-runtime").JSX.Element;
export {};
