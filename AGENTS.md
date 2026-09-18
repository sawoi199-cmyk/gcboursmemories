<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cursor Working Rules

1. 每次修改前阅读 PROJECT_SPEC.md、TASKS.md 和 DECISIONS.md。
2. 一次只实现一个 Phase。
3. 不要擅自更换技术栈。
4. 不要删除已有功能让测试通过。
5. 不使用 any，除非有明确理由。
6. 外部输入使用 Zod。
7. 数据库修改通过 Migration。
8. 原图进 Google Drive（禁止公开分享）；缩略图进 Supabase 私有桶；前台经会话校验后访问。
9. Service Role Key 只能在服务端。
10. GAS_WEB_APP_URL 与 GAS_SHARED_SECRET 只能在服务端；不下发客户端。
11. AI 输出必须验证。
12. AI 不可自动发布。
13. 没有 AI Key 时使用 Mock Provider。
14. 每完成任务更新 TASKS.md。
15. 架构决定写入 DECISIONS.md。
16. 每阶段运行 lint、typecheck、test、build。
17. 修改保持小而清晰。
18. 不留下无说明 TODO。
19. 不硬编码真实姓名、生日和密码。
20. 所有页面检查手机布局。
21. 不使用未经授权的网络照片。
22. 修复问题时先找根因，不要绕过。
23. 不要把业务逻辑堆在页面组件。
24. 所有敏感环境变量不得进入客户端。
25. 未经用户确认不要开始下一阶段。
26. 不使用 Cloudflare R2。

## CodeGraph

- 本项目使用根目录 `.codegraph/` 维护本地代码图谱。
- 理解或定位代码、调用链和变更影响时，优先使用 MCP `codegraph_explore`；MCP 不可用时使用 `codegraph explore "<问题或符号>"`。
- 新版 `codegraph serve --mcp` 会自动监听并同步文件变化。结构性修改后运行 `codegraph status` 验证；仅在监听器不可用或状态显示未同步时运行 `codegraph sync`。
- 不要手动编辑 `.codegraph` 数据库，也不要使用旧版 `mcp__codegraph__index_project` 或 `mcp__codegraph__add_decision` 工具名。
