# Shared Site Password + 称呼 Design

**Date:** 2026-08-04  
**Status:** Approved by user (规格 OK)  
**Scope:** 整站共用密码进站；解锁欢迎「乖宝和臭宝」；设置页可改称呼。不含关系标题 / 默认日记语气编辑。

## Goal

去掉日常「账号登录 vs 解锁密码」双门禁。两个人共用一个密码进入整站（前台回忆 + Studio 上传编辑）。解锁成功后显示「欢迎回来，乖宝和臭宝」。称呼可在设置页修改并持久化。

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Auth model | 方案 A：扩展现有解锁 Cookie，同时放行前台 + Studio |
| Session TTL | 约 30 天（与现有 partner session 一致） |
| Welcome copy | 中文：「欢迎回来，{partner}和{owner}」→ 默认「欢迎回来，乖宝和臭宝」 |
| Names | `partner_name` = 女生（默认 乖宝）；`owner_name` = 男生（默认 臭宝） |
| Password change | 设置页可改；改密后旧 Cookie **全部失效** |
| Relationship title / diary tone | **本轮不做**可编辑 |
| Supabase Auth | 日常主路退役；`/auth/login` 可保留但不作为门禁 |

## Out of scope

- 关系标题、默认日记语气的设置表单
- 角色分权（两人权限完全相同）
- 多人档案 / 多 owner
- 背景音乐
- 去掉密码、公开访问

---

## 1. Access model

### Before

| Surface | Gate |
| --- | --- |
| Experience (`/`, `/story`, …) | `ours_partner_session` **或** Supabase Auth |
| Studio (`/studio/*`) | Supabase Auth only |
| Studio APIs | `supabase.auth.getUser()` |

### After

| Surface | Gate |
| --- | --- |
| Experience + Studio | 同一份站点会话 Cookie（由共用密码签发） |
| `/unlock` | 公开（输密码） |
| Studio / experience APIs | 校验站点会话 Cookie；数据归属固定 `SITE_OWNER_ID` |

未持有效 Cookie 访问受保护路由 → 重定向 `/unlock`。

### Cookie / session

- 复用并演进现有 `ours_partner_session`（或改名为 `ours_site_session`；若改名需迁移清除旧 Cookie）。
- Payload 建议：`{ role: "site", exp, pwdVersion }`  
  - `pwdVersion`：与 `relationship_settings` 上的密码版本对齐；改密后递增，旧 token 校验失败。
- TTL：30 天（`PARTNER_SESSION_TTL_SECONDS` 现有值）。
- 属性：`httpOnly`、`secure`（生产）、`sameSite=lax`、`path=/`。

### Middleware

- `/studio/*`：不再要求 Supabase user；要求有效站点会话。
- Experience 路径：同样要求站点会话（不再用 Auth 用户旁路）。
- `/unlock`、静态资源、必要的 public API（如 `POST /api/unlock`）放行。
- `/auth/login`：不再作为 Studio 入口；可显示「请使用站点密码解锁」并链到 `/unlock`，或 302 到 `/unlock`。

### First-time password bootstrap

若尚未设置 `access_hash`：

1. 部署时设置一次性 `SITE_BOOTSTRAP_PASSWORD`。
2. 用户在 `/unlock` 输入该密码 → 服务端写入 `access_hash`（scrypt）、`password_version = 0`，并签发站点会话。
3. 写入成功后，后续只认 `access_hash`；`SITE_BOOTSTRAP_PASSWORD` 仅在 `access_hash` 为空时生效（建议写入后从托管平台删掉该 env）。
4. 之后改密只在设置页进行，不再依赖邮箱登录。

---

## 2. Data ownership

- 新增服务端环境变量 `SITE_OWNER_ID`（UUID，对应当前 `relationship_settings.owner_id` / profiles 行）。
- 所有原 `user.id` 作用域的 Studio 读写改为 `SITE_OWNER_ID`。
- API 内使用 **Service Role** 客户端（仅服务端），在确认站点会话有效后操作。
- 禁止把 Service Role Key 下发客户端（沿用项目硬规则）。

RLS：现有 policy 以 `auth.uid()` 为 owner。改用 Service Role 后服务端绕过 RLS；仍须在应用层强制 `owner_id = SITE_OWNER_ID`，防止误写他行。

---

## 3. Unlock UX

### Success screen

替换当前 `Welcome back, {partnerName}`：

```text
欢迎回来，乖宝和臭宝
```

动态拼接：`欢迎回来，${partner_name}和${owner_name}`。

副标题可保留轻量英文（如 `Identity confirmed`），主句用中文。

### Unlock API response

`POST /api/unlock` 成功时返回：

```json
{
  "ok": true,
  "ownerName": "臭宝",
  "partnerName": "乖宝"
}
```

### Hint copy

解锁页辅助文案从「密码在 Studio → 设置 中配置」改为双方都适用的说明（例如「密码在设置里可以更改」）；首次进入 Studio 也经同一 Cookie，不再暗示必须先管理员登录。

---

## 4. Settings：称呼

### UI

在 `/studio/settings` 将现有只读「称呼（Mock）」改为表单：

- 男生称呼 → `owner_name`（默认展示/种子：臭宝）
- 女生称呼 → `partner_name`（默认展示/种子：乖宝）

保存按钮；成功后提示已更新（影响解锁欢迎语与 AI 关系上下文）。

**不做**：关系标题、默认日记语气编辑；Supabase / Drive / 缩略图存储行保持只读状态展示。

### API

- `POST /api/settings/names`（或并入现有 settings 路由）  
  Body（Zod）：`{ ownerName: string, partnerName: string }`  
  校验：非空、合理长度（如 1–20）、trim。  
  需有效站点会话；更新 `relationship_settings` where `owner_id = SITE_OWNER_ID`。

### Seed / defaults

更新 `scripts/seed-relationship.ts` 与任何 upsert 默认值：

- `owner_name: "臭宝"`
- `partner_name: "乖宝"`

Mock 展示与未配置 DB 时的 fallback 同步。

### Password settings

- 现有「设置解锁密码」改为「站点共用密码」文案。
- 改密成功后递增 `password_version`（需 migration 加列，默认 0），使旧 Cookie 失效。
- 改密 API 鉴权改为站点会话（不再 `getUser()`）。  
  **注意**：改密本身需要已持有有效会话，或持有旧密码验证——推荐「已解锁状态下在设置页改密」。

---

## 5. Schema changes

```sql
alter table public.relationship_settings
  add column if not exists password_version integer not null default 0;
```

改密时：`access_hash = <new hash>`，`password_version = password_version + 1`。

无需为称呼加列（已有 `owner_name` / `partner_name`）。

---

## 6. API auth migration pattern

对每个原 `getUser()` 保护的 Studio API：

1. 读 Cookie → `verifySiteSessionToken`（含 `pwdVersion` 与 DB 当前版本比对，或把版本编入 HMAC 校验所需的服务端查找）。
2. 无效 → `401`。
3. 有效 → `ownerId = process.env.SITE_OWNER_ID`，用 service client 查询/写入并始终带 `owner_id` 过滤。

可抽公共 helper：`requireSiteSession(request) → { ownerId }`。

Experience 只读路径（published loaders、signed thumbnail/original）同样改为「站点会话」而非「partner **或** auth user」。

---

## 7. Env

| Variable | Required | Notes |
| --- | --- | --- |
| `SITE_OWNER_ID` | yes（生产） | 档案主人 UUID |
| `SESSION_SIGNING_SECRET` | yes | 已有 |
| `SITE_BOOTSTRAP_PASSWORD` | optional | 仅首次写入 `access_hash` |
| Supabase URL / anon / service role | yes | DB + Storage；Auth 日常可不用 |

更新 `.env.example`、`docs/deploy.md`、隐私清单相关条目。

---

## 8. Tests & docs

- 单测：session 含 `pwdVersion`；改密后旧 token 失败；names Zod。
- e2e：解锁 → 见欢迎文案含乖宝/臭宝 → 可进 `/studio` 无需 Auth login。
- 更新 DECISIONS.md、TASKS.md（本轮作为 Phase 8 微调 / 访问模型变更）。
- README / deploy：说明共用密码与 `SITE_OWNER_ID`。

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| 链接+密码泄露则两人内容全暴露 | 可改密使旧会话失效；勿公开分享密码 |
| Service Role 误用面变大 | 统一 `requireSiteSession` + 强制 `SITE_OWNER_ID` |
| 现有数据已绑 Auth owner | `SITE_OWNER_ID` 必须等于当前档案 `owner_id` |
| RLS 与 App 层双重假设 | 文档写明：Studio 走 service role + app 过滤 |

---

## Approval

请确认本文件后回复「规格 OK」或列出要改的点。通过后进入实现计划（writing-plans），再动手改代码。
