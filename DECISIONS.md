# Architecture Decisions

## Decision 001

Date: 2026-08-04
Status: Accepted
Context: Supabase 免费版对象存储容量过小，无法长期存放情侣原图；Cloudflare R2 需要绑卡，上次无法通过。用户个人 Gmail 已订阅 Google One，约有 5TB Drive 容量。
Decision: 采用混合存储——原图 / HEIC / 音频写入个人 Google Drive；缩略图与 AI 分析用小图写入 Supabase Storage 私有桶；元数据与 Auth 仍使用 Supabase。Drive 访问不经 Studio OAuth，而通过自建 Google Apps Script Web App 网关（共享密钥鉴权）。
Reason: 充分利用已有 5TB 容量且零额外存储费；缩略图体积可控，适合留在 Supabase；避免 R2 绑卡；个人场景用 GAS 可免去 Google Cloud OAuth 客户端与 refresh token 维护。
Consequences:
- `photos` 表使用 `drive_file_id`（及可选 `drive_folder_id`）替代原图 `storage_path`。
- 网站环境变量使用 `GAS_WEB_APP_URL` / `GAS_SHARED_SECRET` / `GAS_ROOT_FOLDER_ID`。
- 全屏原图必须经 `/api/signed-image`（或等价）代理，经 GAS `getFile` 拉取；禁止公开分享链接。
- 时间线仅使用 Supabase 缩略图 signed URL（≤1h）。
- Phase 3 经 GAS `upload` 写入原图；需注意 GAS 执行时长与体积限制。
- Studio 设置页只展示连通状态，不再提供「连接 Google Drive」OAuth 按钮。

## Decision 002

Date: 2026-08-04
Status: Accepted
Context: Phase 1 需要可预览的照片与版式，但不能使用未授权网络图片，也不能接入真实存储。
Decision: 使用本地 CSS 渐变作为照片占位（`EventPhoto.gradient`），并通过统一 `MemoryLayoutRenderer` 渲染预设模板；动效使用 Framer Motion `FadeIn`，在 `prefers-reduced-motion` 时退化为静态渲染。
Reason: 满足 SPEC「本地占位图 / 无 Supabase / 无 AI」约束，同时能演示杂志感版式与手机布局。
Consequences:
- Phase 2/3 接入真实缩略图 URL 时，用图片组件替换 `PhotoPlaceholder` 的渐变实现即可，布局接口保持不变。
- 模板评分 `scoreTemplate` 已落地为确定性规则，供后续 AI 推荐加分使用。

## Decision 003

Date: 2026-08-04
Status: Accepted
Context: Phase 2 需要落地 Auth、Schema 与 Drive 接入，但本地可能尚未填入真实密钥。
Decision: Supabase 未配置时允许浏览 Studio UI（横幅提示）；已配置时 middleware 强制管理员登录。Drive 使用 GAS 网关，密钥仅存环境变量与 Script Properties，不写入数据库。`letters` 表增加 `owner_id` 以便 RLS。
Reason: 兼顾可演示性与生产安全；避免把长期密钥存进可被 RLS 误配读出的表。
Consequences:
- 部署前必须设置 Supabase 与（上传前）GAS 环境变量。
- Phase 3 上传依赖 `GAS_WEB_APP_URL`、`GAS_SHARED_SECRET`、`GAS_ROOT_FOLDER_ID`。
- Next.js 16 提示 middleware→proxy 迁移；Phase 2 仍使用官方 `@supabase/ssr` middleware 模式，后续再评估。

## Decision 004

Date: 2026-08-04
Status: Accepted
Context: 用户希望不要通过 Studio 做 Google OAuth，改为直接调用 Google Apps Script 操作 Drive。
Decision: 移除 Studio Drive OAuth（`/api/drive/auth`、`/api/drive/callback`、googleapis 依赖）。改为 `gas/OursDriveGateway.gs` Web App + `src/lib/google-drive/gas-client.ts`，用共享密钥调用 `ping` / `ensureFolders` / `upload` / `getFile`。
Reason: 个人 Gmail + Google One 场景下，GAS「以我身份运行」一次授权即可；运维更轻。
Consequences:
- 环境变量改为 `GAS_*`；旧的 `GOOGLE_CLIENT_*` / `GOOGLE_REFRESH_TOKEN` 废弃。
- GAS 有执行时间与 payload 体积限制，超大原图若失败需后续加分片。
- Web App 若设为「任何人可访问」，必须始终校验共享密钥。

## Decision 005

Date: 2026-08-04
Status: Accepted
Context: Phase 3 需要真实上传链路。
Decision: 单文件经 `/api/uploads` 服务端处理——解析 EXIF、GAS `upload` 写原图、`sharp`/`heic-convert` 生成 JPEG 缩略图写入 `memory-thumbnails`，再插入 `photos`；`/api/uploads/group` 按 SPEC §12 规则建 draft 事件。
Reason: 与已选 GAS 网关一致；缩略图留在 Supabase 控制体积。
Consequences:
- 上传需管理员登录 + migration + GAS 配置。
- 无 EXIF 日期时标记 `needsDateConfirm`，不得静默用上传日。
- 超大文件可能触及 GAS/函数限制，后续可再做分片。

## Decision 006

Date: 2026-08-04
Status: Accepted
Context: Phase 4 需要持久化用户备注，并支持草稿合并拆分。
Decision: 新增 `memory_events.user_note`；编辑器经 PATCH 自动保存；合并把源事件照片并入目标后删除源事件；拆分把勾选照片移入新 draft。
Reason: 备注需与 AI 输入分离；合并/拆分是上传后整理的核心操作。
Consequences:
- 部署前需执行 `20260804010000_memory_user_note.sql`。
- 发布按钮仍禁用至 Phase 6。

## Decision 007

Date: 2026-08-04
Status: Accepted
Context: Phase 5 需要可切换的日记生成能力，且无 API Key 时系统仍可用。
Decision: 统一 `AIProvider.analyzeMemory`；默认 Mock；有 Key 时用 OpenAI-compatible Chat Completions（JSON + 一次 schema 修复）。生成结果写入 `diary_versions`（source=ai）并更新 draft 字段，不自动发布。分析图仅用缩略图再压缩，不送原图。对 Groq 关闭 `response_format` JSON 模式；仅对支持推理控制的模型（Qwen / GPT-OSS / Compound）设 `reasoning_effort=none`，避免 thinking 污染输出；Llama 等不支持该参数的模型不发送。
Reason: 符合 SPEC 的事实约束与可替换 Provider；保护隐私与稳定性。
Consequences:
- 编辑器可展示 `questionsToConfirm` / `inferredFacts` / 版本恢复。
- 真实多模态依赖模型是否支持 image_url；默认 `AI_VISION=false`。
- Groq 推荐日记模型：`llama-3.3-70b-versatile`（无 reasoning 参数）；Qwen/GPT-OSS 才带 reasoning 控制。

## Decision 008

Date: 2026-08-04
Status: Accepted
Context: Phase 6 需要发布与对方私密访问，且不给 partner 开 Supabase 账号。
Decision: Studio 设置解锁密码（`relationship_settings.access_hash`，scrypt）；`ours_partner_session` HMAC Cookie（`SESSION_SIGNING_SECRET`）；middleware 门禁体验路由；publish/unpublish + 可编辑 slug；前台只读 published；缩略图 Storage signed URL；原图经 `/api/signed-original` + GAS `getFile`。背景音乐延后。
Reason: 贴合 SPEC 私密访问设计，密码可在 Studio 更换，原图不公开直链。
Consequences:
- 需执行 `20260804120000_access_hash.sql` 并配置 `SESSION_SIGNING_SECRET`。
- 对方无 Cookie 时访问 `/` 等会跳转 `/unlock`。
- 管理员登录态可进前台自测，但仍只看到 published 内容。

## Decision 009

Date: 2026-08-04
Status: Accepted
Context: Phase 7 视觉完善；用户选择完整清单 + 克制纸质感动效 + 全屏可左右切换。
Decision: 在现有组件上增强（方案 1）：FadeIn/PhotoReveal/PageTransition；统一 Empty/Loading/Error；灯箱支持同篇切换；字体栈明确中文兜底；不重做模板体系；音乐继续延后。
Reason: 贴合私人档案气质，改动可控，避免视觉回归。
Consequences:
- 回忆页照片可全屏左右浏览原图。
- `prefers-reduced-motion` 时退化为静态。

## Decision 010

Date: 2026-08-04
Status: Accepted
Context: Phase 8 需要可重复验证与可部署路径，但生产密钥仍在用户侧。
Decision: Vitest 继续覆盖核心纯逻辑；Playwright 冒烟测门禁与解锁页；GitHub Actions 跑 lint/typecheck/test/build + e2e；部署/备份/隐私写成 `docs/*`，由用户在 Vercel/Supabase 完成真实连接。
Reason: 自动化能拦回归；真实密钥与云资源不能写进仓库。
Consequences:
- `npm run validate` / `npm run test:e2e` 成为发布前标准步骤。
- 首次上线仍需人工完成 `docs/deploy.md` 与隐私勾选。

## Decision 011

Date: 2026-08-04
Status: Accepted
Context: 日常访问不应区分「管理员 Auth 登录」与「对方解锁密码」两道门禁；两人共用同一密码进入前台与 Studio。
Decision: 整站共用站点密码 + 30 天 HMAC Cookie（`ours_partner_session`，role=`site`，含 `pwdVersion`）。Middleware 与 API 统一 `requireSiteSession`；数据经 Service Role 读写并强制 `owner_id = SITE_OWNER_ID`。首次可用 `SITE_BOOTSTRAP_PASSWORD` 写入 `access_hash`；解锁欢迎「欢迎回来，{partner}和{owner}」（默认乖宝/臭宝）；称呼在 Studio 设置页可改；改密递增 `password_version` 使旧 Cookie 失效。Supabase Auth 退出日常路径（`/auth/login` 重定向 `/unlock`）。
Reason: 贴合两人私密档案的使用方式；减少误用 Auth 账号的可能；密码轮换可吊销会话。
Consequences:
- 生产必须配置 `SITE_OWNER_ID` 与 `SESSION_SIGNING_SECRET`。
- 应用层必须始终带 `owner_id = SITE_OWNER_ID` 过滤，因 Studio 走 service role 绕过 RLS。
- `docs/deploy.md`、`.env.example`、e2e 冒烟已更新；不含关系标题/默认日记语气编辑。

## Decision 012

Date: 2026-08-04
Status: Accepted
Context: 上传向导「补充真实记忆」步骤只写本地 state，不落库也不传编辑器；用户填完后进编辑器仍要重填，体验重复且误导。
Decision: 从 `/studio/upload` 去掉「补充记忆」与假版式预览步骤。向导只保留「上传照片 → 确认事件 → 进入编辑器」；真实记忆、排除项、语气与 AI 生成统一在记忆编辑器完成。
Reason: 消除无效表单；编辑器已有完整 AI 输入与持久化，无需在向导再维护一套未接线字段。
Consequences:
- 上传流程更短；SPEC 中「向导内补充记忆再生成」改为「编辑器内补充并生成」。
- 向导不再预览日记/版式。

## Decision 013

Date: 2026-08-04
Status: Accepted
Context: 前台导航（时间线/故事等）每次点击都 `force-dynamic` 全量读库并为每张缩略图单独签名，体感 2–3 秒，慢于常见网站。
Decision: 列表页只签封面并用 `createSignedUrls` 批量签名；故事页独立轻量查询；`unstable_cache`（60s，`published-archive` tag）缓存已发布读路径；发布/取消发布/保存/改章节标签时 `revalidateTag(..., { expire: 0 })`；体验路由加 `loading.tsx` 骨架。
Reason: 私密站不宜公开 CDN 长缓存；短服务端 Data Cache + 按需失效既快又安全；骨架改善体感。
Consequences:
- 发布后前台最多延迟至下次失效（立即 revalidate）；缓存内 signed URL 仍在 1h TTL 内。
- 时间线 payload 仅含封面图，详情仍按 slug 加载全部照片。
- 2026-08-04 补丁：`revalidatePublishedArchive` 同时 `revalidatePath` Studio 列表；`/studio` 与 `/studio/drafts` 设 `force-dynamic`，避免后台仍显示发布前的旧列表。
