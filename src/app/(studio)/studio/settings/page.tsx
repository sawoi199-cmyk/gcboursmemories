import { FadeIn } from "@/components/motion/fade-in";
import { ChapterLabelsForm } from "@/components/studio/chapter-labels-form";
import { NamesForm } from "@/components/studio/names-form";
import { StudioLogoutButton } from "@/components/studio/studio-logout-button";
import { UnlockPasswordForm } from "@/components/studio/unlock-password-form";
import { buttonVariants } from "@/components/ui/button";
import { resolveChapterLabels, type ChapterId } from "@/config/chapters";
import { mockRelationship } from "@/config/mock-data";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import { getDriveConfigStatus, isDriveConfigured } from "@/lib/google-drive/gas-client";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const DEFAULT_OWNER_NAME = "臭宝";
const DEFAULT_PARTNER_NAME = "乖宝";

export default async function StudioSettingsPage() {
  const driveStatus = await getDriveConfigStatus();
  const supabaseReady = isSupabaseConfigured();

  let passwordSet = false;
  let ownerName = DEFAULT_OWNER_NAME;
  let partnerName = DEFAULT_PARTNER_NAME;
  let chapterLabels = resolveChapterLabels(null);
  let settingsAvailable = false;

  if (supabaseReady) {
    try {
      const ownerId = getSiteOwnerId();
      const admin = createServiceClient();
      const { data } = await admin
        .from("relationship_settings")
        .select("access_hash, chapter_labels, owner_name, partner_name")
        .eq("owner_id", ownerId)
        .maybeSingle();
      passwordSet = Boolean(data?.access_hash);
      ownerName = data?.owner_name ?? DEFAULT_OWNER_NAME;
      partnerName = data?.partner_name ?? DEFAULT_PARTNER_NAME;
      chapterLabels = resolveChapterLabels(
        (data?.chapter_labels as Partial<Record<ChapterId, string>> | null) ?? null,
      );
      settingsAvailable = true;
    } catch {
      passwordSet = false;
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <FadeIn>
        <p className="text-xs tracking-[0.2em] text-gold uppercase">Settings</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">设置</h1>
        <p className="mt-2 text-sm text-muted-ours">
          在这里配置站点共用密码与称呼。Drive 通过 Google Apps Script 网关接入。
        </p>
      </FadeIn>

      <dl className="mt-10 space-y-4">
        <Row label="关系标题" value={mockRelationship.relationshipTitle} />
        <Row label="默认日记语气" value="温柔日记" />
        <Row
          label="Supabase"
          value={supabaseReady ? "已配置" : "未配置"}
        />
        <Row label="原图存储" value="Google Drive via GAS" />
        <Row label="缩略图存储" value="Supabase 私有桶 memory-thumbnails" />
      </dl>

      {settingsAvailable ? <NamesForm initialOwnerName={ownerName} initialPartnerName={partnerName} /> : null}
      {settingsAvailable ? <UnlockPasswordForm initiallySet={passwordSet} /> : null}
      {settingsAvailable ? <ChapterLabelsForm initialLabels={chapterLabels} /> : null}

      <div className="mt-10 rounded-2xl border border-line bg-paper px-5 py-6">
        <h2 className="font-serif text-xl text-ink">Google Drive（GAS 网关）</h2>
        <p className="mt-2 text-sm text-muted-ours">{driveStatus.message}</p>
        <ul className="mt-4 space-y-1 text-xs text-muted-ours">
          <li>Web App URL：{driveStatus.gasUrlConfigured ? "已配置" : "缺失"}</li>
          <li>共享密钥：{driveStatus.sharedSecretConfigured ? "已配置" : "缺失"}</li>
          <li>根文件夹 ID：{driveStatus.rootFolderConfigured ? "已配置" : "可选/缺失"}</li>
          <li>连通性：打开页不自动探测（避免 GAS 冷启动拖慢设置页）</li>
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          {isDriveConfigured() ? (
            <a href="/api/drive/status" className={cn(buttonVariants({ variant: "outline" }))}>
              检查连通性（JSON）
            </a>
          ) : (
            <button
              type="button"
              disabled
              className={cn(buttonVariants({ variant: "outline" }), "opacity-60")}
            >
              先配置 GAS_WEB_APP_URL / GAS_SHARED_SECRET
            </button>
          )}
        </div>

        <p className="mt-4 text-xs leading-6 text-muted-ours">
          部署步骤见仓库文档 <code className="rounded bg-background px-1">docs/deploy.md</code>
          ，GAS 脚本模板在 <code className="rounded bg-background px-1">gas/OursDriveGateway.gs</code>
          。
        </p>
      </div>

      <div className="mt-8">
        <StudioLogoutButton />
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-3">
      <dt className="text-sm text-muted-ours">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}
