"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LetterReplyFormProps = {
  letterId: string;
  initialReply: string | null;
};

export function LetterReplyForm({ letterId, initialReply }: LetterReplyFormProps) {
  const [body, setBody] = useState(initialReply ?? "");
  const [savedReply, setSavedReply] = useState(initialReply);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/letters/${letterId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await response.json()) as { ok?: boolean; body?: string; message?: string };

      if (!response.ok || !json.ok || !json.body) {
        setError(json.message ?? "保存回信失败，请稍后重试。");
        return;
      }

      setBody(json.body);
      setSavedReply(json.body);
      setMessage("回信已保存。你可以随时回来修改。");
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-line bg-paper px-6 py-7 md:px-8">
      {savedReply ? (
        <div className="border-b border-line pb-6">
          <p className="text-xs tracking-[0.2em] text-gold uppercase">Reply</p>
          <h2 className="mt-2 font-serif text-2xl text-ink">你的回信</h2>
          <p className="mt-4 whitespace-pre-wrap font-serif text-base leading-8 text-ink/90">
            {savedReply}
          </p>
        </div>
      ) : null}

      <form onSubmit={(event) => void onSubmit(event)} className={savedReply ? "pt-6" : ""}>
        <label htmlFor="letter-reply" className="font-serif text-xl text-ink">
          {savedReply ? "修改回信" : "写一封回信"}
        </label>
        <p className="mt-1 text-sm text-muted-ours">这封回信只会保存在你们的私密档案里。</p>
        <textarea
          id="letter-reply"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          rows={8}
          required
          className="mt-4 w-full resize-y rounded-xl border border-line bg-background px-4 py-3 text-sm leading-7 text-ink outline-none transition-colors focus:border-gold"
          placeholder="写下你想回应的话…"
        />
        <p className="mt-1 text-right text-xs text-muted-ours">{body.length}/3000</p>
        {error ? <p className="mt-2 text-sm text-accent-ours">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-muted-ours">{message}</p> : null}
        <button type="submit" disabled={busy} className={cn(buttonVariants(), "mt-4")}>
          {busy ? "保存中…" : savedReply ? "保存修改" : "保存回信"}
        </button>
      </form>
    </section>
  );
}
