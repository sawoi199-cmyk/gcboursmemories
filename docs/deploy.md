# Deploy OURS to production

This guide covers Vercel + Supabase + GAS for the private couple archive.

## Prerequisites

- GitHub repo connected (this project: `asushi199/gcbours`)
- Supabase project (production)
- Google Apps Script web app deployed (`gas/OursDriveGateway.gs`)
- Strong random values for secrets (do not reuse local `.env.local`)

## 1. Production Supabase

Region must be **Southeast Asia (Singapore)** (`ap-southeast-1`), same as Vercel Functions (`sin1`). Check: Dashboard → **Project Settings → General → Region**. Supabase cannot change region after creation — if it is not Singapore, create a new project there and migrate.

1. Create / open the production Supabase project.
2. In SQL Editor, run migrations **in order**:
   - `supabase/migrations/20260804000000_init.sql`
   - `supabase/migrations/20260804010000_memory_user_note.sql`
   - `supabase/migrations/20260804120000_access_hash.sql`
   - `supabase/migrations/20260804140000_chapter_labels.sql`
   - `supabase/migrations/20260804200000_password_version.sql`
   - `supabase/migrations/20260804210000_relationship_start_date.sql`
   - `supabase/migrations/20260809110000_letter_replies.sql`
   - `supabase/migrations/20261015000000_wishes.sql`
   - `supabase/migrations/20261016000000_moments.sql`
3. Create the admin Auth user (email/password) if you still need it for seeding or recovery — **daily access no longer requires Auth login**.
4. Note the admin user's UUID; it becomes `SITE_OWNER_ID` (must match `relationship_settings.owner_id` for existing data).
5. Ensure Storage bucket `memory-thumbnails` exists and is **private** (created by init migration / policies).
6. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

Optional: run `npm run seed` locally against production only if you understand it writes relationship settings.

## 2. GAS Drive gateway

Follow [`docs/phase-2-setup.md`](./phase-2-setup.md). Production must use:

- `GAS_WEB_APP_URL`
- `GAS_SHARED_SECRET` (same as Script Property)
- `GAS_ROOT_FOLDER_ID`

Never make Drive folders “anyone with the link”.

After pulling code that adds photo/memory delete, **redeploy** the Apps Script Web App so `deleteFile` is live. Without redeploy, Studio can still delete DB rows but Drive originals may remain (API returns `warnings`).

Gateway actions: `ping` / `ensureFolders` / `upload` / `getFile` / `deleteFile` (trash).

## 3. Shared site password (access model)

The experience **and** Studio share one site password. After unlock, a 30-day HMAC cookie (`ours_partner_session`, role `site`) gates all routes.

**First visit / bootstrap**

1. Set `SITE_BOOTSTRAP_PASSWORD` in Vercel (strong random; temporary).
2. Set `SITE_OWNER_ID` to the archive owner UUID.
3. Deploy. Visit `/unlock` and enter the bootstrap password once.
4. The app writes `access_hash` to `relationship_settings` with default nicknames (臭宝 / 乖宝).
5. **Remove `SITE_BOOTSTRAP_PASSWORD`** from Vercel after the first successful unlock — it only applies when `access_hash` is empty.

**Ongoing**

- Change the site password in Studio → Settings →「站点共用密码」. This bumps `password_version` and invalidates old cookies.
- Edit nicknames in Settings; welcome copy shows「欢迎回来，{partner}和{owner}」.
- `/auth/login` redirects to `/unlock`; Supabase Auth is not the daily entry path.

## 4. Vercel project

1. Import the GitHub repo into Vercel.
2. Framework preset: Next.js.
3. Function region is pinned in `vercel.json` to **Singapore** (`sin1`), next to the Singapore Supabase project. Hobby allows one region. Confirm after deploy: **Project Settings → Functions → Function Regions**. Static assets stay on the global CDN.
4. Set Environment Variables (Production + Preview as needed):

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret, server only |
| `SITE_OWNER_ID` | Secret, UUID of archive owner |
| `SITE_BOOTSTRAP_PASSWORD` | Secret, optional — first unlock only; delete after use |
| `GAS_WEB_APP_URL` | Secret |
| `GAS_SHARED_SECRET` | Secret |
| `GAS_ROOT_FOLDER_ID` | Secret |
| `SESSION_SIGNING_SECRET` | Secret, ≥16 chars, site session cookie HMAC |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://your-domain.vercel.app` |
| `AI_PROVIDER` | `mock` or `openai_compatible` |
| `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` | Only if using real AI |
| `AI_VISION` | usually `false` |

5. Deploy. Confirm:
   - `/unlock` loads
   - `/` and `/studio` redirect to `/unlock` without a session cookie
   - After unlock with bootstrap or stored password, welcome shows nicknames and both experience + Studio are reachable
   - Publish a memory; unlocked visitor sees it on `/timeline`
   - Fullscreen original loads via `/api/signed-original`

## 5. Post-deploy checklist

- [ ] `SITE_OWNER_ID` matches production `relationship_settings.owner_id`
- [ ] Site password set (bootstrap or Studio settings)
- [ ] `SITE_BOOTSTRAP_PASSWORD` removed from env after first unlock
- [ ] At least one published memory visible after unlock
- [ ] Draft memories not visible without unlock session
- [ ] Service role / GAS secret not present in browser Network payloads
- [ ] Custom domain HTTPS only (if used)
- [ ] Vercel Function region is Singapore (`sin1`); Supabase region is Southeast Asia (Singapore)

## 6. Local validation before each deploy

```bash
npm run validate
npm run test:e2e
```
