# Phase 2 setup (Supabase + Google Drive via GAS)

## 1. Supabase

1. Create a free Supabase project.
2. Open SQL Editor and run [`supabase/migrations/20260804000000_init.sql`](../supabase/migrations/20260804000000_init.sql).
3. Create an Auth user (Email/Password) for yourself — this is the Studio admin.
4. Copy Project URL + `anon` key + `service_role` key into `.env.local`.
5. Optional seed:

```bash
# .env.local also needs SEED_OWNER_ID=<your auth user uuid>
npm run seed
```

## 2. Google Drive via Apps Script（不走 Studio OAuth）

1. 在 Google Drive 建文件夹 `OURS`（其下脚本会自动建 `originals` / `audio`）。
2. 打开 [script.google.com](https://script.google.com) → 新建项目。
3. 粘贴仓库里的 [`gas/OursDriveGateway.gs`](../gas/OursDriveGateway.gs)。
4. **项目设置 → 脚本属性**：
   - `OURS_SHARED_SECRET` = 一串长随机密钥（与 `.env.local` 的 `GAS_SHARED_SECRET` 相同）
   - `OURS_ROOT_FOLDER_ID` = `OURS` 文件夹 ID（可选，也可只写在 `.env.local` 的 `GAS_ROOT_FOLDER_ID`）
5. **部署 → 新部署 → 类型：Web 应用**
   - 执行身份：我
   - 具有访问权限的用户：任何人（鉴权靠共享密钥，**不要**省略密钥校验）
6. 把 Web App URL 写入 `.env.local` 的 `GAS_WEB_APP_URL`。
7. 重启 `npm run dev`，打开 Studio → 设置，应显示「GAS 网关可达」。
8. 网关 action：`ping` / `ensureFolders` / `upload` / `getFile` / `deleteFile`（进回收站）。仓库更新 GAS 脚本后须**重新部署** Web App，否则删除回忆/照片无法清 Drive。

不要把 Drive 文件设成「知道链接的任何人可查看」。网站读原图仍走服务端 `/api/signed-image`（Phase 6）经 GAS `getFile` 拉取。

## 3. Local run

```bash
cp .env.example .env.local
# fill values
npm run dev
```

Without env vars, Phase 1 UI still works; Studio shows a “Supabase 未配置” banner and login protection is inactive.
