# Current Phase

Phase 8 — 测试与部署（已落地骨架；生产部署需你在 Vercel/Supabase 点一次）

## Todo

- [ ] 按 `docs/deploy.md` 配置 Vercel 生产环境变量（含 `SITE_OWNER_ID`、可选 `SITE_BOOTSTRAP_PASSWORD`）并首次部署
- [ ] 按 `docs/privacy-checklist.md` 勾一遍
- [ ] 微调体验（用户后续提）

## Completed

### Phase 8
- [x] **微调：整站共用密码**（Decision 011）— 去掉 Auth 日常门禁；`SITE_OWNER_ID` + bootstrap；欢迎文案与称呼可改；e2e/docs/env 同步
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

- Bugfix：后台「回忆」列表未随发布/上传失效，前台 3 条后台只显示 2 条；已对 Studio 列表 `force-dynamic` + `revalidatePath`
- 仓库：https://github.com/asushi199/gcbours
- 背景音乐仍延后
- Bugfix：`/studio/templates` 版式卡片原先是静态 `<li>`，点击无反应；现改为可点选并切换下方预览
- Bugfix：Studio 编辑器「故事章节」下拉曾写死默认文案，且误读 `site_settings`；现从 `relationship_settings.chapter_labels` 经 `getEditorMemory` 注入 `chapterLabels`
- 性能：`getEditorMemory` 缩略图改 `createSignedUrls` 批量签名，并与 siblings/versions/settings 并行查询，缩短打开编辑页等待
- 性能：前台时间线/故事封面批量签名 + 60s `unstable_cache`（发布/保存失效）+ `loading.tsx` 骨架（Decision 013）
- 访问模型：体验与 Studio 共用站点密码 Cookie；`chapter-labels` 插入默认称呼已对齐 臭宝/乖宝
- Final review：middleware 校验 DB `password_version`；`requireSiteSession` DB error→503；published/signed-original owner 作用域；logout 检查 response.ok
- UX：上传向导去掉未接线的「补充真实记忆 / 假预览」步骤（Decision 012）；记忆与 AI 只在编辑器填写
- 文案：去掉前台/Studio 可见的 Phase 开发期说明（今日页、上传向导、设置页）
