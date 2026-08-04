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

- 仓库：https://github.com/asushi199/gcbours
- 背景音乐仍延后
- Bugfix：Studio 编辑器「故事章节」下拉曾写死 `DEFAULT_CHAPTER_LABELS`，设置页自定义名称不生效；现从 `site_settings.chapter_labels` 经 `getEditorMemory` 注入 `chapterLabels`
- 访问模型：体验与 Studio 共用站点密码 Cookie；`chapter-labels` 插入默认称呼已对齐 臭宝/乖宝
- Final review：middleware 校验 DB `password_version`；`requireSiteSession` DB error→503；published/signed-original owner 作用域；logout 检查 response.ok
