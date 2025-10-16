# WhisperMeeting 前端 TODO

## 分析与可行性
- 后端已提供 `/meetings` 列表、`/meetings/{id}/summary` 下载与 `/meetings/{id}/transcribe` 上传音频的核心能力，满足会议转写、摘要展示的基础诉求。
- 文档中提到的录音控制 `/recording/start|stop` 与实时字幕流 `/meetings/{id}/stream` 当前尚未实现；短期内需要通过浏览器端录音+本地处理或轮询转写结果的方式替代。
- 高亮标记与导出流程需要写入 `MeetingRepository` 或触发自动化脚本，后端暂未暴露相关接口，需与后端同步扩展计划或先以内存/Mock 数据占位。
- 单页应用即可覆盖既有功能原型；未来若扩展多页面导航，可逐步引入路由。

## 技术栈选择
- 采用 **Vite + React + TypeScript**：启动快、生态成熟，方便封装组件并集成第三方录音库；后续与任何 Node 构建工具兼容。
- 样式层使用 **Tailwind CSS**，配合 `clsx`/`tailwind-merge` 简化样式组合。
- 状态管理先用 React Query（数据获取）+ 本地 `useReducer`/`useState`，待需求膨胀再考虑 Zustand 或 Redux。
- 接口请求抽象为轻量 API 层，方便对接 FastAPI 或在离线情况下替换为本地 Mock。

## 实现路线
1. 项目初始化  
   - 创建 `pnpm` 或 `npm` Vite React TS 模板，配置 ESLint、Prettier、Husky（可选）。  
   - 引入 Tailwind，定制主题色、字体，并准备全局布局容器。
2. 核心 UI 搭建  
   - 布局四大区域：录音控制、实时字幕、重点标记、摘要/行动项 + 导出。  
   - 确定组件拆分（如 `RecorderPanel`, `TranscriptStream`, `HighlightsPanel`, `SummaryCard`）。
3. 数据流与 API 接口  
   - 封装 `MeetingService`：`listMeetings`, `uploadTranscription`, `getSummary`。  
   - 暂以轮询方式模拟实时字幕，待后端提供 WebSocket 再切换。  
   - 高亮标记使用前端状态保存，并预留持久化 API 调用接口。
4. 浏览器录音方案（临时）  
   - 使用 MediaRecorder 捕获音频，生成 Blob 上传至 `/meetings/{id}/transcribe`。  
   - 处理权限请求与错误提示，支持导入本地音频文件。
5. 导出能力  
   - 调用 `/meetings/{id}/summary` 获取 Markdown，支持下载到本地；对 Notion/Jira 保持按钮但提示“功能开发中”。  
   - 若需自动化脚本交互，需与后端协商新接口或通过本地协议触发。
6. 测试与可用性  
   - 单元测试覆盖 API 层与关键组件渲染；使用 Vitest/Testing Library。  
   - 提供 Storybook 或 Ladle 验证组件状态（可选）。  
   - 编写基础可用性文档，说明本地启动、环境变量配置。

## 风险 & 后续沟通点
- 缺失录音控制与字幕流接口，需要后端排期或前端自行实现临时代码，引入 MediaRecorder 可能受浏览器兼容限制（Safari 需特别测试）。
- `/meetings/{id}/transcribe` 目前单次上传整段音频，若要支持实时流式体验，需后端处理分片上传或 WebSocket；前端应为未来升级预留接口抽象。
- 高亮标记与自动化导出缺少后端持久化/触发机制，短期需提供 Mock 与用户反馈提示，避免误导。
- Tailwind 与设计稿需提前统一设计 token，否则后续重构样式成本较高。
