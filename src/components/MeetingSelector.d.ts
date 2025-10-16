import type { Dispatch, SetStateAction } from "react";
import type { Meeting } from "../types";
interface MeetingSelectorProps {
    meetings: Meeting[];
    value: string | null;
    onChange: Dispatch<SetStateAction<string | null>>;
    onCreateNew?: () => void;
}
export declare function MeetingSelector({ meetings, value, onChange, onCreateNew }: MeetingSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
