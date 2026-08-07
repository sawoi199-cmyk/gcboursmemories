"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UnlockScreen() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerName, setOwnerName] = useState("臭宝");
  const [partnerName, setPartnerName] = useState("乖宝");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus("idle");
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        ownerName?: string;
        partnerName?: string;
      };
      if (!response.ok || !json.ok) {
        setStatus("error");
        setError(json.message ?? "解锁失败");
        return;
      }
      setOwnerName(json.ownerName ?? "臭宝");
      setPartnerName(json.partnerName ?? "乖宝");
      setStatus("success");
      // Hard navigate so the new session cookie is included in the next document
      // request. Soft client navigation can leave users stuck on this success UI.
      window.setTimeout(() => {
        window.location.assign("/");
      }, 450);
    } catch {
      setStatus("error");
      setError("网络错误，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col items-center justify-center overflow-hidden bg-night px-6 py-16 text-center text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.35) 3px)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,161,91,0.12),transparent_55%)]" />

      {status === "success" ? (
        <FadeIn className="relative z-10 space-y-4">
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Identity confirmed</p>
          <h1 className="font-serif text-3xl md:text-4xl">
            欢迎回来，{partnerName}和{ownerName}
          </h1>
        </FadeIn>
      ) : (
        <FadeIn className="relative z-10 w-full max-w-md">
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Personal memory archive</p>
          <h1 className="mt-6 font-serif text-3xl leading-tight md:text-4xl">
            Identity verification required
          </h1>
          <p className="mt-4 text-sm leading-7 text-paper/65">
            This archive belongs to us.
            <br />
            Enter the date only we remember.
          </p>

          <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto mt-10 w-full max-w-xs">
            <label className="block text-left text-[11px] tracking-[0.2em] text-paper/50" htmlFor="unlock-code">
              专属密码
            </label>
            <input
              id="unlock-code"
              name="unlock-code"
              type="password"
              autoComplete="off"
              value={code}
              disabled={busy}
              onChange={(event) => {
                setCode(event.target.value);
                setStatus("idle");
                setError(null);
              }}
              placeholder="••••"
              className="mt-2 w-full border-b border-gold/40 bg-transparent py-3 text-center text-2xl tracking-[0.5em] text-paper outline-none placeholder:text-paper/25 focus-visible:border-gold"
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? "unlock-error" : undefined}
            />
            {status === "error" ? (
              <p id="unlock-error" className="mt-3 text-xs text-accent-ours">
                {error}
              </p>
            ) : (
              <p className="mt-3 text-xs text-paper/35">密码在设置里可以更改</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "mt-8 w-full border border-gold/30 bg-transparent text-paper hover:bg-paper/10",
              )}
            >
              {busy ? "验证中…" : "ENTER"}
            </button>
          </form>
        </FadeIn>
      )}
    </section>
  );
}
