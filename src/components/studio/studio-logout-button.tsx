"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StudioLogoutButtonProps = {
  className?: string;
  label?: string;
};

export function StudioLogoutButton({
  className,
  label = "退出登录",
}: StudioLogoutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock/logout", { method: "POST" });
      if (!response.ok) {
        setError("退出失败，请重试");
        return;
      }
      router.push("/unlock");
      router.refresh();
    } catch {
      setError("退出失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleLogout()}
        className={cn(buttonVariants({ variant: "outline" }), "disabled:opacity-60", className)}
      >
        {label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
