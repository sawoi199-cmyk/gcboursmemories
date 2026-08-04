# Shared Site Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dual Auth+unlock gates with one shared site password (30-day cookie) for experience + Studio; welcome「欢迎回来，乖宝和臭宝」; editable nicknames in settings.

**Architecture:** Evolve HMAC session cookie to include `pwdVersion`; middleware and APIs require that cookie; data scoped to `SITE_OWNER_ID` via service-role client; bootstrap password env for first unlock; password change bumps version and invalidates old cookies.

**Tech Stack:** Next.js App Router, Supabase (service role + existing tables), Node crypto (scrypt + HMAC), Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-04-shared-site-password-design.md`

## Global Constraints

- Do not edit relationship title / default diary tone UI this round
- Service Role Key never reaches the client
- Always filter writes with `owner_id = SITE_OWNER_ID`
- AI never auto-publishes
- No plaintext passwords in Git / localStorage / client bundles
- `.env.local` secrets never committed
- Prefer small diffs; update TASKS.md + DECISIONS.md when done
- Run `npm run validate` before claiming complete
- Commits only when the user explicitly asks (skip commit steps unless requested)

---

## File map

| File | Role |
| --- | --- |
| `supabase/migrations/20260804200000_password_version.sql` | `password_version` column |
| `src/lib/security/site-session.ts` | Cookie sign/verify with `pwdVersion` (evolves partner-session) |
| `src/lib/security/require-site-session.ts` | Cookie + version check → `{ ownerId }` |
| `src/lib/config/site-owner.ts` | `getSiteOwnerId()` from env |
| `src/app/api/unlock/route.ts` | Shared password + bootstrap + return both names |
| `src/app/api/settings/unlock-password/route.ts` | Site-session gated; bump `password_version` |
| `src/app/api/settings/names/route.ts` | Save owner/partner names |
| `src/middleware.ts` | Studio + experience require site cookie |
| `src/components/experience/unlock-screen.tsx` | 欢迎回来，{partner}和{owner} |
| `src/components/studio/names-form.tsx` | 称呼表单 |
| `src/components/studio/unlock-password-form.tsx` | 文案改为站点共用密码 |
| Feature modules under `src/features/**` | `createClient` → `createServiceClient` for owner-scoped ops |
| All Studio API routes | `getUser()` → `requireSiteSession()` |
| `.env.example`, `docs/deploy.md`, e2e, DECISIONS, TASKS | Docs + env + smoke |

---

### Task 1: Migration + site owner + session with pwdVersion

**Files:**
- Create: `supabase/migrations/20260804200000_password_version.sql`
- Create: `src/lib/config/site-owner.ts`
- Create: `src/lib/config/site-owner.test.ts`
- Modify: `src/lib/security/partner-session.ts` (evolve in place; keep cookie name)
- Modify: `src/lib/security/partner-session.test.ts`
- Modify: `src/types/database.ts` (add `password_version`)

**Interfaces:**
- Produces:
  - `getSiteOwnerId(): string` — throws if `SITE_OWNER_ID` missing/invalid UUID
  - `createPartnerSessionToken(pwdVersion: number, nowMs?: number, ttlSeconds?: number): Promise<string>`
  - `verifyPartnerSessionToken(token, nowMs?): Promise<{ ok: true; exp: number; pwdVersion: number } | { ok: false; reason: string }>`
  - Payload shape: `{ role: "site"; exp: number; pwdVersion: number }`
  - Cookie name stays `ours_partner_session`

- [ ] **Step 1: Write failing tests for pwdVersion + site owner**

`src/lib/config/site-owner.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getSiteOwnerId } from "@/lib/config/site-owner";

describe("getSiteOwnerId", () => {
  const previous = process.env.SITE_OWNER_ID;
  afterEach(() => {
    if (previous === undefined) delete process.env.SITE_OWNER_ID;
    else process.env.SITE_OWNER_ID = previous;
  });

  it("returns SITE_OWNER_ID", () => {
    process.env.SITE_OWNER_ID = "00000000-0000-4000-8000-000000000099";
    expect(getSiteOwnerId()).toBe("00000000-0000-4000-8000-000000000099");
  });

  it("throws when missing", () => {
    delete process.env.SITE_OWNER_ID;
    expect(() => getSiteOwnerId()).toThrow(/SITE_OWNER_ID/);
  });
});
```

Update `partner-session.test.ts` — token carries `pwdVersion`; verify returns it; wrong secret / expired still fail.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run --config vitest.config.mts src/lib/config/site-owner.test.ts src/lib/security/partner-session.test.ts`

- [ ] **Step 3: Migration**

```sql
alter table public.relationship_settings
  add column if not exists password_version integer not null default 0;
```

- [ ] **Step 4: Implement `getSiteOwnerId`**

```ts
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getSiteOwnerId(): string {
  const id = process.env.SITE_OWNER_ID?.trim();
  if (!id || !UUID_RE.test(id)) {
    throw new Error("SITE_OWNER_ID is missing or not a valid UUID.");
  }
  return id;
}
```

- [ ] **Step 5: Evolve partner-session payload**

Change `PartnerSessionPayload` to:

```ts
type PartnerSessionPayload = {
  role: "site";
  exp: number;
  pwdVersion: number;
};
```

`createPartnerSessionToken(pwdVersion: number, nowMs = Date.now(), ttlSeconds = PARTNER_SESSION_TTL_SECONDS)`  
`verifyPartnerSessionToken` requires `role === "site"` and `typeof pwdVersion === "number"`; return `pwdVersion` on success.

Update all existing call sites of `createPartnerSessionToken()` to pass `0` temporarily until Task 2 (or `pwdVersion` from DB).

- [ ] **Step 6: Update `database.ts` Row/Insert for `password_version: number`**

- [ ] **Step 7: Run tests — expect PASS**

- [ ] **Step 8: Commit** (only if user asked)

```bash
git add supabase/migrations/20260804200000_password_version.sql src/lib/config/site-owner.ts src/lib/config/site-owner.test.ts src/lib/security/partner-session.ts src/lib/security/partner-session.test.ts src/types/database.ts
git commit -m "feat: site owner env and session password_version"
```

---

### Task 2: `requireSiteSession` helper

**Files:**
- Create: `src/lib/security/require-site-session.ts`
- Create: `src/lib/security/require-site-session.test.ts` (unit-test pure helpers; mock cookie/DB lightly or extract `assertSessionMatchesVersion`)

**Interfaces:**
- Consumes: `verifyPartnerSessionToken`, `getSiteOwnerId`, `createServiceClient`, `PARTNER_COOKIE_NAME`
- Produces:
  - `requireSiteSession(cookieHeaderOrStore): Promise<{ ownerId: string; pwdVersion: number }>`
  - Throws or returns Result — prefer returning  
    `{ ok: true; ownerId; pwdVersion } | { ok: false; status: 401|503; message: string }`

- [ ] **Step 1: Implement**

```ts
import { cookies } from "next/headers";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import {
  PARTNER_COOKIE_NAME,
  verifyPartnerSessionToken,
} from "@/lib/security/partner-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function requireSiteSession(): Promise<
  | { ok: true; ownerId: string; pwdVersion: number }
  | { ok: false; status: 401 | 503; message: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, message: "Supabase not configured" };
  }
  let ownerId: string;
  try {
    ownerId = getSiteOwnerId();
  } catch {
    return { ok: false, status: 503, message: "SITE_OWNER_ID not configured" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const verified = await verifyPartnerSessionToken(token);
  if (!verified.ok) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  const admin = createServiceClient();
  const { data } = await admin
    .from("relationship_settings")
    .select("password_version")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const currentVersion = data?.password_version ?? 0;
  if (verified.pwdVersion !== currentVersion) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true, ownerId, pwdVersion: currentVersion };
}
```

For middleware (Edge), also export a lighter `verifySiteSessionTokenAgainstVersion(token, currentVersion)` used after a minimal settings fetch, OR middleware only checks HMAC + exp and APIs enforce version (acceptable short window). **Prefer middleware also checks version** via service client if Edge allows `@supabase/supabase-js` (already used in middleware today for Auth).

- [ ] **Step 2: Add a small pure test** for version mismatch logic if extracted; otherwise cover via partner-session tests + integration later.

- [ ] **Step 3: Commit** (only if user asked)

---

### Task 3: Unlock API — shared password, bootstrap, both names

**Files:**
- Modify: `src/app/api/unlock/route.ts`
- Modify: `src/components/experience/unlock-screen.tsx`
- Modify: `src/lib/security/unlock-schema.ts` if needed (keep `code` field)

**Interfaces:**
- Consumes: `hashPassword`, `verifyPassword`, `createPartnerSessionToken`, `getSiteOwnerId`
- Produces JSON: `{ ok: true, ownerName, partnerName }`

- [ ] **Step 1: Unlock route logic**

1. Rate-limit unchanged.
2. Resolve settings for `getSiteOwnerId()` (not first row globally).
3. Select `access_hash, password_version, owner_name, partner_name`.
4. If no `access_hash`:
   - If `process.env.SITE_BOOTSTRAP_PASSWORD` matches `parsed.data.code` (timing-safe string compare via `verifyPassword` only works on hashes — use `timingSafeEqual` on utf8 buffers of equal length, or hash bootstrap once):
   - On match: `hashPassword(code)`, upsert settings row with defaults `owner_name: "臭宝"`, `partner_name: "乖宝"`, `relationship_title: "OURS"`, `access_hash`, `password_version: 0`.
5. Else verify against `access_hash`.
6. Issue cookie with `createPartnerSessionToken(settings.password_version)`.
7. Return both names (fallback 臭宝/乖宝).

Bootstrap compare helper:

```ts
function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
```

- [ ] **Step 2: Unlock screen success UI**

```tsx
// on success:
setOwnerName(json.ownerName ?? "臭宝");
setPartnerName(json.partnerName ?? "乖宝");
setStatus("success");

// success branch:
<p className="text-xs tracking-[0.3em] text-gold uppercase">Identity confirmed</p>
<h1 className="font-serif text-3xl md:text-4xl">
  欢迎回来，{partnerName}和{ownerName}
</h1>
```

Hint text: `密码在设置里可以更改`（去掉「必须先管理员登录」暗示）。

- [ ] **Step 3: Manual / e2e later** — unit not required if covered by e2e in Task 7.

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 4: Middleware — one gate for Studio + experience

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/lib/supabase/middleware.ts` if still used for Auth redirects — simplify or stop requiring Auth for `/studio`

- [ ] **Step 1: Rewrite gate**

```ts
// Pseudocode
const needsGate =
  isStudioRoute(pathname) || isExperiencePath(pathname);

if (pathname === "/unlock" || isAuthRoute) {
  // /auth/login → redirect to /unlock (optional but preferred)
  if (pathname.startsWith("/auth/login")) {
    return NextResponse.redirect(new URL("/unlock", request.url));
  }
  return NextResponse.next();
}

if (needsGate) {
  const token = request.cookies.get(PARTNER_COOKIE_NAME)?.value;
  const verified = token ? await verifyPartnerSessionToken(token) : { ok: false };
  // Optionally fetch password_version for SITE_OWNER_ID and compare
  if (!verified.ok /* || version mismatch */) {
    return NextResponse.redirect(new URL("/unlock", request.url));
  }
}
```

Remove Supabase Auth requirement for `/studio`. Keep creating supabase server client only if still needed for something else; otherwise drop Auth branch from studio gate.

- [ ] **Step 2: Update e2e expectations in Task 7** (`/studio` → `/unlock` not `/auth/login`)

- [ ] **Step 3: Commit** (only if user asked)

---

### Task 5: Settings — password (version bump) + names form

**Files:**
- Modify: `src/app/api/settings/unlock-password/route.ts`
- Create: `src/app/api/settings/names/route.ts`
- Create: `src/components/studio/names-form.tsx`
- Modify: `src/components/studio/unlock-password-form.tsx`
- Modify: `src/app/(studio)/studio/settings/page.tsx`
- Modify: `scripts/seed-relationship.ts` defaults → 臭宝 / 乖宝
- Modify: `src/config/mock-data.ts` → 臭宝 / 乖宝

**Interfaces:**
- Names body Zod: `{ ownerName: z.string().trim().min(1).max(20), partnerName: z.string().trim().min(1).max(20) }`
- Password POST: require site session; update hash; `password_version: current + 1`; clear cookie on response so client re-unlocks OR leave cookie invalid until re-unlock (clear is clearer UX)

- [ ] **Step 1: Password API**

Replace `getUser()` with `requireSiteSession()`. Use `createServiceClient()`, filter `owner_id = session.ownerId`. On update:

```ts
.update({
  access_hash: accessHash,
  password_version: (existing.password_version ?? 0) + 1,
})
```

On insert defaults: `owner_name: "臭宝"`, `partner_name: "乖宝"`.

Response: clear site cookie (`maxAge: 0`) so user must unlock with new password; return `{ ok: true, passwordSet: true, mustReunlock: true }`.

- [ ] **Step 2: Names API**

```ts
export async function POST(request: Request) {
  const session = await requireSiteSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
  }
  const parsed = NamesBodySchema.safeParse(await request.json());
  // ...
  await admin.from("relationship_settings").upsert({
    owner_id: session.ownerId,
    owner_name: parsed.data.ownerName,
    partner_name: parsed.data.partnerName,
    // required fields if insert: relationship_title OURS, etc.
  }, { onConflict: "owner_id" });
}
```

Prefer update-if-exists; if missing row, insert with full defaults.

- [ ] **Step 3: `NamesForm` client component** — two inputs 男生称呼 / 女生称呼, save to `/api/settings/names`.

- [ ] **Step 4: Settings page** — load real names via service client + `SITE_OWNER_ID` (not mock); render `NamesForm`; keep storage rows read-only; rename password form copy to「站点共用密码」.

- [ ] **Step 5: Seed + mock defaults**

- [ ] **Step 6: Commit** (only if user asked)

---

### Task 6: Migrate Studio APIs + features off Auth user

**Files (API — replace getUser with requireSiteSession, pass ownerId):**
- `src/app/api/uploads/route.ts`
- `src/app/api/uploads/group/route.ts`
- `src/app/api/memories/[id]/route.ts`
- `src/app/api/memories/[id]/publish/route.ts`
- `src/app/api/memories/[id]/unpublish/route.ts`
- `src/app/api/memories/[id]/split/route.ts`
- `src/app/api/memories/[id]/versions/route.ts`
- `src/app/api/memories/[id]/versions/restore/route.ts`
- `src/app/api/memories/merge/route.ts`
- `src/app/api/ai/analyze-memory/route.ts`
- `src/app/api/drive/status/route.ts`
- `src/app/api/settings/chapter-labels/route.ts`
- `src/app/api/signed-original/route.ts` — site session only (drop Auth OR)

**Files (features — use `createServiceClient()` instead of user-scoped `createClient()`):**
- `src/features/uploads/upload-photo.ts`
- `src/features/uploads/create-draft-events.ts`
- `src/features/memories/publish-memory.ts`
- `src/features/memories/save-memory.ts`
- `src/features/memories/merge-split.ts`
- `src/features/memories/get-editor-memory.ts`
- `src/features/diary-generation/analyze-memory.ts`

**Studio pages that call getUser:**
- `src/app/(studio)/studio/page.tsx`
- `src/app/(studio)/studio/drafts/page.tsx`
- `src/app/(studio)/studio/memories/[id]/edit/page.tsx`
- `src/app/(studio)/studio/settings/page.tsx`
- `src/components/studio/studio-nav.tsx` — logout: call `/api/unlock/logout` instead of `/auth/logout` (or both)

Pattern for each API:

```ts
const session = await requireSiteSession();
if (!session.ok) {
  return NextResponse.json({ ok: false, message: session.message }, { status: session.status });
}
// use session.ownerId; features use createServiceClient()
```

- [ ] **Step 1: Switch features to `createServiceClient()`** while keeping `ownerId` filters.
- [ ] **Step 2: Switch all listed API routes.**
- [ ] **Step 3: Switch Studio RSC pages to service client + `getSiteOwnerId()` / require session via cookie check (middleware already gates; pages can assume cookie but still use service client + SITE_OWNER_ID).**
- [ ] **Step 4: `signed-original` — require site session only; keep published-only check for non-draft access as today for partner path (now everyone is "site").** Studio editing may need original for any photo owned by SITE_OWNER_ID — if current code allows Auth user any owned photo, preserve that for site session (owner of archive).
- [ ] **Step 5: Run `npm run typecheck` and fix breakages.**
- [ ] **Step 6: Commit** (only if user asked)

---

### Task 7: Env, docs, e2e, DECISIONS, TASKS, validate

**Files:**
- Modify: `.env.example` — add `SITE_OWNER_ID=`, `SITE_BOOTSTRAP_PASSWORD=`
- Modify: `docs/deploy.md` — shared password flow
- Modify: `e2e/smoke.spec.ts`
- Modify: `DECISIONS.md`
- Modify: `TASKS.md`
- Modify: `src/features/memories/phase8-publish-unlock.test.ts` if session API changed
- Update unlock-password upsert defaults elsewhere (`chapter-labels` insert defaults → 臭宝/乖宝)

- [ ] **Step 1: e2e**

```ts
test("studio requires site unlock", async ({ page }) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/unlock/);
});

test("auth login redirects to unlock", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page).toHaveURL(/\/unlock/);
});
```

Keep unlock page reachable test.

- [ ] **Step 2: DECISIONS entry** — shared site password; Auth retired from daily path; SITE_OWNER_ID; welcome copy; names editable.

- [ ] **Step 3: TASKS.md** — note this micro-change under Phase 8 微调.

- [ ] **Step 4: Run full validate**

```bash
npm run validate
npm run test:e2e
```

Expected: lint/typecheck/test/build pass; e2e smoke pass.

- [ ] **Step 5: Commit** (only if user asked)

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| Shared cookie for experience + Studio | 4, 6 |
| 30-day TTL | 1 (existing constant) |
| 欢迎回来，乖宝和臭宝 | 3 |
| Editable owner/partner names | 5 |
| No title/tone editors | — (explicitly skipped) |
| password_version invalidate on change | 1, 5 |
| SITE_OWNER_ID + service role | 1, 2, 6 |
| SITE_BOOTSTRAP_PASSWORD | 3 |
| Auth login not main path | 4 |
| Tests / docs / e2e | 7 |

## Placeholder / consistency self-review

- Cookie name kept `ours_partner_session`; role value `"site"` — consistent across tasks.
- `createPartnerSessionToken(pwdVersion)` signature used in Tasks 1–5.
- Defaults 臭宝 / 乖宝 aligned in unlock, seed, names, settings inserts.
- No relationship title / tone form tasks included.
