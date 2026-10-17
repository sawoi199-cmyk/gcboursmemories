# Current Phase

Phase 9d — 流光字号、评论与点赞（已实现；需在 Supabase 执行 `20261018000000_moment_comments.sql`）

## Todo

- [ ] 在 Supabase SQL Editor 执行 `supabase/migrations/20261018000000_moment_comments.sql`，然后上线验证评论、点赞与字号
- [ ] 按 `docs/deploy.md` 配置 Vercel 生产环境变量（含 `SITE_OWNER_ID`、可选 `SITE_BOOTSTRAP_PASSWORD`）并首次部署
- [ ] 按 `docs/privacy-checklist.md` 勾一遍
- [ ] 微调体验（用户后续提）

## Completed

### Phase 9d 流光字号、评论与点赞（Decision 022）
- [x] 字号：`layout.textScale`（70%–160%，六种模板都生效）；编辑器「文字」工具加字号滑杆；无需迁移
- [x] `moment_comments` / `moment_likes` migration（随流光级联删除；点赞每人一次）
- [x] `POST /api/moments/[id]/comments`、`DELETE …/comments/[commentId]`、`PUT /api/moments/[id]/likes`
- [x] 详情页：爱心（乐观更新）+「谁喜欢」、评论列表（本地时间、可删不可改、不做楼中楼）、评论输入与「我是 乖宝/臭宝」
- [x] 方格卡片下显示喜欢数与评论数
- [x] 单测：评论/点赞 schema、作者排序、计数汇总、字号范围

### Phase 9c 流光模板与贴纸（Decision 021）
- [x] `moments.layout` jsonb migration（模板、浮动文字位置/样式、贴纸）；`MomentLayoutSchema` Zod 校验，读取容错回落简约
- [x] 六种模板：简约 / 文字贴图 / 拍立得 / 胶片 / 便利贴 / 杂志大字；统一 4:5 卡片，容器查询单位缩放、字号有下限
- [x] 贴纸：40 个 emoji + 自定义 emoji + 12 个自绘装饰（胶带、爱心、星星、印章、日期章等）；拖动、缩放、旋转、删除，最多 24 个
- [x] 编辑器：发布与编辑共用（编辑可改文字、日期、作者、模板、贴纸）；模板缩略图用真实照片预览
- [x] 方格页改为两列（桌面三列）卡片墙，那句话直接可见；详情页长句子被卡片截断时在下方显示全文
- [x] 单测：排版 schema / 容错解析 / JSON 字段
- [x] 已在生产 Supabase 执行 `20261017000000_moment_layout.sql`

### Phase 9b 流光 + 愿望关联（Decision 020）
- [x] `moments` 表 migration（一张照片 + 一句话 ≤140、日期、作者、`seq` 发布顺序）；`wishes.moment_id`（一愿望一流光）
- [x] `GET/POST /api/moments`（游标分页 / multipart 发布，复用 GAS 原图 + 缩略图链路）、`PATCH/DELETE /api/moments/[id]`
- [x] 前台 `/moments` 三列方格 + 无限滚动 + 「发一条」弹窗；`/moments/[id]` 大图（可看原图）、编辑、删除
- [x] 愿望关联：「实现了，发一条流光」/「补一条流光」、已实现卡片显示流光缩略图、流光页「✓ 实现了愿望」标签回跳；撤回愿望解除关联
- [x] 照片硬清理引用检查纳入 `moments`，避免误删流光照片（含 `DELETE /api/photos/[id]`）
- [x] 抽出共享 `signThumbnailsBatch` / `IsoDateSchema` / 作者选择组件；导航与首页入口加「流光」；e2e 门禁用例
- [x] 单测：流光 schema/游标、创建流程（先校验愿望、失败清理照片）、引用检查
- [x] 已在生产 Supabase 执行 `20261016000000_moments.sql`

### Phase 9a 愿望清单（Decision 019）
- [x] `wishes` 表 migration（标题 ≤60、备注 ≤300、作者 owner/partner、状态 wish/done + 实现日期一致性约束）
- [x] `POST /api/wishes`、`PATCH/DELETE /api/wishes/[id]`（站点会话 + Zod + `owner_id` 作用域）
- [x] 前台 `/wishes`：快速许愿、「我是 乖宝/臭宝」记住上次选择、想做的/已实现分组、实现日期、撤回、编辑、删除确认
- [x] 导航与首页入口加「愿望」；proxy 门禁覆盖 `/wishes`；e2e 冒烟补门禁用例
- [x] 单测：愿望 schema / 更新映射、本地日期工具
- [x] 已在生产 Supabase 执行 `20261015000000_wishes.sql`

### Phase 8
- [x] **部署区域：新加坡**（Decision 016）— `vercel.json` `regions: ["sin1"]`；文档要求 Supabase 为 Southeast Asia (Singapore)
- [x] **微调：整站共用密码**（Decision 011）— 去掉 Auth 日常门禁；`SITE_OWNER_ID` + bootstrap；欢迎文案与称呼可改；e2e/docs/env 同步
- [x] 公开健康检查：`GET /api/health`（供 cronjob 定时请求并验证 Supabase 数据库连通性）
- [x] 单测补强（publish/unlock 集成向断言）
- [x] Playwright 冒烟（unlock / studio→unlock / auth→unlock）
- [x] GitHub Actions CI（validate + e2e）
- [x] `docs/deploy.md` / `docs/backup.md` / `docs/privacy-checklist.md`
- [x] README 与 `npm run validate` / `test:e2e`

### Phase 7 / 6
- [x] 视觉完善、发布解锁、章节编辑等

## Validation

- [x] `npm run validate`
- [x] `npm run test:e2e`

## Notes

- UX：AI 面板只改标题/一句话/正文；支持「生成标题与日记 / 只重写标题 / 只重写日记」与保留选项；失败保留表单（Decision 007 修订）
- 功能：删除草稿/已发布回忆 + 编辑器移除照片 + 上传清除失败项（Decision 015）；**需重新部署 GAS Web App（含 `deleteFile`）**
- 功能：记忆编辑器可更换单张照片，或往已有回忆添加照片（Decision 018）；旧原图仍走 `deleteFile` 硬清理
- Bugfix：后台「回忆」列表未随发布/上传失效，前台 3 条后台只显示 2 条；已对 Studio 列表 `force-dynamic` + `revalidatePath`
- 仓库：https://github.com/asushi199/gcbours
- 背景音乐仍延后
- Bugfix：`/studio/templates` 版式卡片原先是静态 `<li>`，点击无反应；现改为可点选并切换下方预览
- Bugfix：Studio 编辑器「故事章节」下拉曾写死默认文案，且误读 `site_settings`；现从 `relationship_settings.chapter_labels` 经 `getEditorMemory` 注入 `chapterLabels`
- 代码健康：信件页读取已发布的 `letters` 数据；移除未引用 mock 导出与未使用 `shadcn` 依赖；日期显示统一为 `formatArchiveDate`
- 功能：信件页支持写入并修改一封私密回信（`letter_replies` migration + 前台表单）
- Bugfix：没有已发布数据库信件时仍显示原有信件内容；首次保存回信会将该信持久化为已发布信件
- Bugfix：故事页章节封面改用缩略图 `<img>` 读取，并跳过没有缩略图的首条回忆以选择可用封面
- 性能：`getEditorMemory` 缩略图改 `createSignedUrls` 批量签名，并与 siblings/versions/settings 并行查询，缩短打开编辑页等待
- 性能：前台时间线/故事封面批量签名 + 60s `unstable_cache`（发布/保存失效）+ `loading.tsx` 骨架（Decision 013）
- 性能：时间线分页「加载更多」（每页 20）+ Instagram 式日历按日筛选（Decision 014）
- 访问模型：体验与 Studio 共用站点密码 Cookie；`chapter-labels` 插入默认称呼已对齐 臭宝/乖宝
- Final review：middleware 校验 DB `password_version`；`requireSiteSession` DB error→503；published/signed-original owner 作用域；logout 检查 response.ok
- UX：上传向导去掉未接线的「补充真实记忆 / 假预览」步骤（Decision 012）；记忆与 AI 只在编辑器填写
- 文案：去掉前台/Studio 可见的 Phase 开发期说明（今日页、上传向导、设置页）
- Bugfix：故事封面「点开读不到图、过会儿重开才加载」——签名 URL 曾被 `unstable_cache` 缓存，陈旧返回时已过期。改为缓存只存缩略图路径、签名移到 getter 边界现签（`signPublishedMemories`）；同修 `getStoryChapters`/章节详情首屏/回忆详情/`getPublishedMemories`（Decision 017）
- Bugfix：编辑器清空标题后点「生成」会报 `Invalid payload`（生成前自动保存要求标题非空）。现在标题可留空：保存时保留原标题，AI 会重新写标题（「只重写日记」此时也补标题）；所有接口的格式报错改为中文并写明是哪个字段（`invalidPayloadResponse`）
