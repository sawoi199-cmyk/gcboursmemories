"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UnlockPasswordFormProps = {
  initiallySet: boolean;
};

export function UnlockPasswordForm({ initiallySet }: UnlockPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSet, setPasswordSet] = useState(initiallySet);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/unlock-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        mustReunlock?: boolean;
      };
      if (!response.ok || !json.ok) {
        setError(json.message ?? "保存失败");
        return;
      }
      setPasswordSet(true);
      setPassword("");
      setConfirmPassword("");
      if (json.mustReunlock) {
        setMessage("密码已更新，请用新密码重新解锁。");
        router.push("/unlock");
        return;
      }
      setMessage("站点共用密码已更新。");
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-10 rounded-2xl border border-line bg-paper px-5 py-6">
      <h2 className="font-serif text-xl text-ink">站点共用密码</h2>
      <p className="mt-2 text-sm text-muted-ours">
        进入整站（前台与 Studio）需输入此密码。当前状态：
        <span className="text-ink">{passwordSet ? "已设置" : "未设置"}</span>
      </p>
      <label className="mt-4 block text-xs text-muted-ours" htmlFor="unlock-password">
        新密码
      </label>
      <input
        id="unlock-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        autoComplete="new-password"
        minLength={4}
        required
      />
      <label className="mt-3 block text-xs text-muted-ours" htmlFor="unlock-password-confirm">
        确认密码
      </label>
      <input
        id="unlock-password-confirm"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        autoComplete="new-password"
        minLength={4}
        required
      />
      {error ? <p className="mt-2 text-xs text-accent-ours">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-muted-ours">{message}</p> : null}
      <button type="submit" disabled={busy} className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
        {busy ? "保存中…" : "保存站点密码"}
      </button>
    </form>
  );
}
