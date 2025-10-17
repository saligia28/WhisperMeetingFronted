# WhisperMeeting 前端

WhisperMeeting 的 Web 控制台，用于快速验证录音、实时字幕、重点标记与摘要能力。项目基于 React + Vite + Tailwind 构建，默认通过 REST API 与 FastAPI 后端进行交互，并在无网络/接口的情况下回退到演示数据。

## 快速开始

```bash
npm install
npm run dev
```

默认启动于 `http://localhost:5173`，可在 `.env` 中配置后端地址：

```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
# 仅在需要本地演示数据时手动设为 true；默认禁用 Mock 回退
echo "VITE_ENABLE_MOCK_FALLBACK=false" >> .env.local
```

### 生产构建

```bash
npm run build
npm run preview
```

## 主要功能

- **录音控制**：基于 `MediaRecorder` 的一键录音/停止，自动上传至 `/meetings/{id}/transcribe`；支持导入本地音频文件。
- **实时字幕**：录音过程中每隔 4 秒调用 `/meetings/{id}/transcribe/chunk` 获取即时字幕，停止后自动触发完整转写与摘要流程。
- **字幕体验**：Figma 风格的字幕卡片配合滚动状态指示，可在没有后端时通过模拟数据演示。
- **重点标记**：在字幕流内直接标记关键语句，展示于“重点标记”面板，后续可接入后端存储。
- **摘要与导出**：调用 `/meetings/{id}/summary` 获取 Markdown，解析摘要、行动项、关键词，支持下载 Markdown。
- **企业风格设计**：应用自定义 Tailwind 主题、柔和渐变背景、细腻过渡动画，贴近大型企业设计语言。

## 代码结构

```
src/
├── components/        # UI 组件
├── hooks/             # 录音 & 模拟数据的自定义 Hook
├── services/api.ts    # 与后端 API 交互的封装（支持可选 Mock 回退）
├── mockData.ts        # 演示数据
├── App.tsx            # 页面布局与状态管理
└── styles.css         # Tailwind 入口与全局样式
```

## 后续迭代建议

- 接入真实的实时字幕流（WebSocket 或 Server-Sent Events），替换模拟数据。
- 将重点标记通过 API 与后端 `MeetingRepository` 同步，支持持久化与协作。
- 增加权限与状态提示组件（如 Toast/Notification 系统），完善边界场景反馈。
- 对接 Notion/Jira 自动化脚本，完成导出按钮的闭环体验。
