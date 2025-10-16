import type { Meeting, MeetingSummary, TranscriptSegment } from "./types";

export const mockMeetings: Meeting[] = [
  {
    id: "demo-001",
    title: "产品路线同步会",
    duration: 45,
    language: "zh",
  },
  {
    id: "demo-002",
    title: "Weekly Standup",
    duration: 30,
    language: "en",
  },
];

export const mockSegments: TranscriptSegment[] = [
  {
    id: "seg-1",
    speaker: "Alice",
    text: "大家好，今天我们重点确认 WhisperMeeting 的前端交互。",
    start: 0,
    end: 10,
    createdAt: Date.now(),
  },
  {
    id: "seg-2",
    speaker: "Bob",
    text: "后端接口已经打通，可以直接上传音频并获取摘要。",
    start: 10,
    end: 22,
    createdAt: Date.now(),
  },
  {
    id: "seg-3",
    speaker: "Carol",
    text: "请在本周完成高保真原型，确保体验丝滑。",
    start: 22,
    end: 35,
    createdAt: Date.now(),
  },
];

export const mockSummary: MeetingSummary = {
  markdown: `## 摘要

- 确认前端交互与 Tailwind 风格，围绕录音、字幕、摘要三大区域。
- 后端转写接口可用，实时字幕方案仍在演进。

## 行动项

1. Alice：完成前端页面并接入 Tailwind 主题。
2. Bob：补充实时字幕接口设计。

## 关键词

- Tailwind
- 转写流程
- 实时字幕
`,
  summaryItems: [
    "确认前端交互与 Tailwind 风格，围绕录音、字幕、摘要三大区域。",
    "后端转写接口可用，实时字幕方案仍在演进。",
  ],
  actionItems: [
    "Alice：完成前端页面并接入 Tailwind 主题。",
    "Bob：补充实时字幕接口设计。",
  ],
  keywords: ["Tailwind", "转写流程", "实时字幕"],
};
