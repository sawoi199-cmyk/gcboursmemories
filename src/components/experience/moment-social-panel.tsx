"use client";

import { useId, useState } from "react";
import { Heart, SendHorizontal, Trash2 } from "lucide-react";
import {
  AuthorToggle,
  authorName,
  useIsClient,
  useRememberedAuthor,
} from "@/components/experience/author-toggle";
import { postComment, putLike, removeComment } from "@/features/moments/moment-api-client";
import { MOMENT_COMMENT_MAX } from "@/features/moments/moment-schema";
import { orderAuthors, type MomentComment } from "@/features/moments/moment-social";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import type { WishAuthor } from "@/features/wishes/wish-schema";
import { cn } from "@/lib/utils";

type MomentSocialPanelProps = {
  momentId: string;
  initialComments: MomentComment[];
  initialLikedBy: WishAuthor[];
  names: CoupleNames;
};

/** `10.17 21:05` this year, `2025.10.17 21:05` otherwise — viewer's local time. */
function formatCommentTime(iso: string, now: Date) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return date.getFullYear() === now.getFullYear()
    ? `${day} ${time}`
    : `${date.getFullYear()}.${day} ${time}`;
}

function likeSentence(likedBy: WishAuthor[], names: CoupleNames) {
  if (likedBy.length === 2) return `${names.partner}和${names.owner}都喜欢`;
  if (likedBy.length === 1) return `${authorName(likedBy[0], names)}喜欢`;
  return "还没有人点喜欢";
}

export function MomentSocialPanel({
  momentId,
  initialComments,
  initialLikedBy,
  names,
}: MomentSocialPanelProps) {
  const inputId = useId();
  const isClient = useIsClient();
  const [author, chooseAuthor] = useRememberedAuthor();
  const [likedBy, setLikedBy] = useState(initialLikedBy);
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iLike = likedBy.includes(author);

  async function toggleLike() {
    const liked = !iLike;
    const previous = likedBy;
    // Optimistic: the heart reacts immediately, the server answer reconciles it.
    setLikedBy(orderAuthors(liked ? [...likedBy, author] : likedBy.filter((who) => who !== author)));
    setError(null);
    const result = await putLike(momentId, { author, liked });
    if (!result.ok) {
      setLikedBy(previous);
      setError(result.message);
      return;
    }
    setLikedBy(result.data);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const result = await postComment(momentId, { author, body });
    setSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setComments((current) => [...current, result.data]);
    setBody("");
  }

  async function onDelete(comment: MomentComment) {
    if (!window.confirm("删除这条评论？")) return;
    setError(null);
    const result = await removeComment(momentId, comment.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setComments((current) => current.filter((item) => item.id !== comment.id));
  }

  return (
    <section aria-label="喜欢与评论" className="mt-6 border-t border-line pt-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void toggleLike()}
          aria-pressed={iLike}
          aria-label={iLike ? "取消喜欢" : "喜欢"}
          className="grid size-10 place-items-center rounded-full transition-transform hover:bg-paper active:scale-90"
        >
          <Heart
            className={cn(
              "size-6 transition-colors",
              iLike ? "fill-[#e7799a] text-[#e7799a]" : "text-muted-ours",
            )}
          />
        </button>
        <p className="flex-1 text-sm text-muted-ours">{likeSentence(likedBy, names)}</p>
      </div>

      <h2 className="mt-5 font-serif text-lg text-ink">
        评论 <span className="text-sm text-muted-ours">{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-ours">还没有评论，说点什么吧。</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {comments.map((comment) => (
            <li key={comment.id} className="group flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-ours">
                  <span className="font-medium text-ink">{authorName(comment.author, names)}</span>
                  {isClient ? ` · ${formatCommentTime(comment.createdAt, new Date())}` : ""}
                </p>
                <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap text-ink">
                  {comment.body}
                </p>
              </div>
              <button
                type="button"
                aria-label="删除评论"
                title="删除评论"
                onClick={() => void onDelete(comment)}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-ours/70 hover:bg-paper hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void onSubmit(event)} className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3">
        <label htmlFor={inputId} className="sr-only">
          写评论
        </label>
        <textarea
          id={inputId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={MOMENT_COMMENT_MAX}
          rows={2}
          placeholder="写评论…"
          className="w-full resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-muted-ours/70"
        />
        <div className="mt-2 flex items-center gap-3">
          <AuthorToggle author={author} names={names} onChange={chooseAuthor} />
          <span className="ml-auto text-xs text-muted-ours tabular-nums">
            {body.length}/{MOMENT_COMMENT_MAX}
          </span>
          <button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label="发送评论"
            className="grid size-9 place-items-center rounded-full bg-ink text-paper transition-opacity disabled:opacity-40"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </form>

      {error ? <p className="mt-2 text-sm text-accent-ours">{error}</p> : null}
    </section>
  );
}
