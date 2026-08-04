"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NamesFormProps = {
  initialOwnerName: string;
  initialPartnerName: string;
};

export function NamesForm({ initialOwnerName, initialPartnerName }: NamesFormProps) {
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [partnerName, setPartnerName] = useState(initialPartnerName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName, partnerName }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        ownerName?: string;
        partnerName?: string;
      };
      if (!response.ok || !json.ok) {
        setError(json.message ?? "保存失败");
        return;
      }
      if (json.ownerName) setOwnerName(json.ownerName);
      if (json.partnerName) setPartnerName(json.partnerName);
      setMessage("称呼已更新。解锁页欢迎语会显示新称呼。");
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="mt-10 rounded-2xl border border-line bg-paper px-5 py-6"
    >
      <h2 className="font-serif text-xl text-ink">称呼</h2>
      <p className="mt-2 text-sm text-muted-ours">
        解锁成功后显示「欢迎回来，{partnerName}和{ownerName}」。
      </p>
      <label className="mt-4 block text-xs text-muted-ours" htmlFor="owner-name">
        男生称呼
      </label>
      <input
        id="owner-name"
        value={ownerName}
        maxLength={20}
        onChange={(event) => setOwnerName(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        required
      />
      <label className="mt-3 block text-xs text-muted-ours" htmlFor="partner-name">
        女生称呼
      </label>
      <input
        id="partner-name"
        value={partnerName}
        maxLength={20}
        onChange={(event) => setPartnerName(event.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        required
      />
      {error ? <p className="mt-2 text-xs text-accent-ours">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-muted-ours">{message}</p> : null}
      <button type="submit" disabled={busy} className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
        {busy ? "保存中…" : "保存称呼"}
      </button>
    </form>
  );
}
