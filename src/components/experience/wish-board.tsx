"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ImagePlus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  AuthorToggle,
  authorName,
  useIsClient,
  useRememberedAuthor,
} from "@/components/experience/author-toggle";
import { MomentComposer } from "@/components/experience/moment-composer";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/status-blocks";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import { patchWish, postWish, removeWish } from "@/features/wishes/wish-api-client";
import {
  WISH_NOTE_MAX,
  WISH_TITLE_MAX,
  type WishAuthor,
} from "@/features/wishes/wish-schema";
import type { Wish } from "@/features/wishes/wishes";
import { cn } from "@/lib/utils";
import { formatDottedDate, todayLocalIsoDate } from "@/lib/utils/date";

export type WishTab = "wish" | "done";

type WishBoardProps = {
  initialWishes: Wish[];
  names: CoupleNames;
  canEdit: boolean;
  initialTab?: WishTab;
};

type WishResult = { ok: true; data: Wish } | { ok: false; message: string };

function sortWishes(wishes: Wish[]) {
  return [...wishes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function sortDone(wishes: Wish[]) {
  return [...wishes].sort(
    (a, b) =>
      (b.doneOn ?? "").localeCompare(a.doneOn ?? "") || b.createdAt.localeCompare(a.createdAt),
  );
}

export function WishBoard({ initialWishes, names, canEdit, initialTab = "wish" }: WishBoardProps) {
  const [wishes, setWishes] = useState(initialWishes);
  const [tab, setTab] = useState<WishTab>(initialTab);
  const [author, chooseAuthor] = useRememberedAuthor();
  const [rememberFor, setRememberFor] = useState<Wish | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = useMemo(() => sortWishes(wishes.filter((w) => w.status === "wish")), [wishes]);
  const done = useMemo(() => sortDone(wishes.filter((w) => w.status === "done")), [wishes]);
  const visible = tab === "wish" ? pending : done;

  function upsert(wish: Wish) {
    setWishes((current) => {
      const exists = current.some((w) => w.id === wish.id);
      return exists ? current.map((w) => (w.id === wish.id ? wish : w)) : [wish, ...current];
    });
  }

  function drop(id: string) {
    setWishes((current) => current.filter((w) => w.id !== id));
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Wishes</p>
        <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">愿望清单</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-ours">
          想和你一起做的事，一件一件写下来，再一件一件实现。
        </p>
      </FadeIn>

      {canEdit ? (
        <WishComposer
          author={author}
          names={names}
          onAuthorChange={chooseAuthor}
          onCreated={(wish) => {
            upsert(wish);
            setTab("wish");
          }}
        />
      ) : null}

      <div role="tablist" aria-label="愿望分组" className="mt-10 flex gap-6 border-b border-line">
        <TabButton active={tab === "wish"} onClick={() => setTab("wish")}>
          想做的 <span className="text-muted-ours">{pending.length}</span>
        </TabButton>
        <TabButton active={tab === "done"} onClick={() => setTab("done")}>
          已实现 <span className="text-muted-ours">{done.length}</span>
        </TabButton>
      </div>

      {notice ? <p className="mt-4 text-sm text-accent-ours">{notice}</p> : null}

      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={tab === "wish" ? "还没有愿望" : "还没有实现的愿望"}
          description={
            tab === "wish"
              ? "写下第一件想一起做的事吧。"
              : "实现一个愿望后，它会在这里留下日期。"
          }
        />
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {visible.map((wish) => (
            <WishItem
              key={wish.id}
              wish={wish}
              names={names}
              canEdit={canEdit}
              onChange={upsert}
              onDelete={drop}
              onRemember={(target) => {
                setNotice(null);
                setRememberFor(target);
              }}
            />
          ))}
        </ul>
      )}

      {rememberFor ? (
        <MomentComposer
          names={names}
          title="为这个愿望留一条流光"
          initialCaption={rememberFor.title}
          initialTakenOn={rememberFor.doneOn ?? undefined}
          wishId={rememberFor.id}
          onClose={() => setRememberFor(null)}
          onCreated={(moment, warnings) => {
            setRememberFor(null);
            if (warnings.length > 0) {
              setNotice(warnings.join(" "));
              return;
            }
            upsert({ ...rememberFor, moment: { id: moment.id, thumbnailUrl: moment.thumbnailUrl } });
            setTab("done");
          }}
        />
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-1 pb-3 font-serif text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        active ? "border-gold text-ink" : "border-transparent text-muted-ours hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function WishComposer({
  author,
  names,
  onAuthorChange,
  onCreated,
}: {
  author: WishAuthor;
  names: CoupleNames;
  onAuthorChange: (author: WishAuthor) => void;
  onCreated: (wish: Wish) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);

    const result = await postWish({ title, note: showNote ? note : null, author });
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setTitle("");
    setNote("");
    setShowNote(false);
    onCreated(result.data);
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="mt-8 rounded-2xl border border-line bg-paper px-4 py-4 sm:px-5"
    >
      <label htmlFor="wish-title" className="sr-only">
        新愿望
      </label>
      <input
        id="wish-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={WISH_TITLE_MAX}
        placeholder="想和你一起…"
        autoComplete="off"
        className="w-full bg-transparent font-serif text-lg text-ink outline-none placeholder:text-muted-ours/70"
      />
      {showNote ? (
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={WISH_NOTE_MAX}
          rows={2}
          aria-label="备注"
          placeholder="补一句备注（可选）"
          className="mt-3 w-full resize-y rounded-xl border border-line bg-background px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-gold"
        />
      ) : null}
      {error ? <p className="mt-2 text-sm text-accent-ours">{error}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AuthorToggle author={author} names={names} onChange={onAuthorChange} />
        {!showNote ? (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-xs text-muted-ours underline-offset-4 hover:text-ink hover:underline"
          >
            加备注
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className={cn(buttonVariants(), "ml-auto")}
        >
          {busy ? "保存中…" : "许个愿"}
        </button>
      </div>
    </form>
  );
}

function WishItem({
  wish,
  names,
  canEdit,
  onChange,
  onDelete,
  onRemember,
}: {
  wish: Wish;
  names: CoupleNames;
  canEdit: boolean;
  onChange: (wish: Wish) => void;
  onDelete: (id: string) => void;
  onRemember: (wish: Wish) => void;
}) {
  const [mode, setMode] = useState<"view" | "complete" | "edit">("view");
  const [doneOn, setDoneOn] = useState(() => todayLocalIsoDate());
  const [title, setTitle] = useState(wish.title);
  const [note, setNote] = useState(wish.note ?? "");
  const [editAuthor, setEditAuthor] = useState<WishAuthor>(wish.author);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isClient = useIsClient();

  const isDone = wish.status === "done";

  async function run(action: () => Promise<WishResult>): Promise<Wish | null> {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    setMode("view");
    onChange(result.data);
    return result.data;
  }

  async function complete(withMoment: boolean) {
    const updated = await run(() => patchWish(wish.id, { status: "done", doneOn }));
    if (updated && withMoment) onRemember(updated);
  }

  async function revert() {
    if (
      wish.moment &&
      !window.confirm("撤回后，这个愿望和流光的关联会解除（流光本身会保留）。继续吗？")
    ) {
      return;
    }
    await run(() => patchWish(wish.id, { status: "wish" }));
  }

  async function onRemove() {
    if (!window.confirm(`删除愿望「${wish.title}」？删除后无法恢复。`)) return;
    setBusy(true);
    setError(null);
    const result = await removeWish(wish.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onDelete(wish.id);
  }

  function startEdit() {
    setTitle(wish.title);
    setNote(wish.note ?? "");
    setEditAuthor(wish.author);
    setMode("edit");
  }

  return (
    <li id={`wish-${wish.id}`} className="scroll-mt-24 py-5">
      {mode === "edit" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => patchWish(wish.id, { title, note, author: editAuthor }));
          }}
          className="space-y-3"
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={WISH_TITLE_MAX}
            aria-label="愿望"
            required
            className="w-full rounded-xl border border-line bg-background px-3 py-2 font-serif text-lg text-ink outline-none focus:border-gold"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={WISH_NOTE_MAX}
            rows={2}
            aria-label="备注"
            placeholder="备注（可选）"
            className="w-full resize-y rounded-xl border border-line bg-background px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-gold"
          />
          <AuthorToggle author={editAuthor} names={names} onChange={setEditAuthor} label="谁的愿望" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !title.trim()} className={buttonVariants({ size: "sm" })}>
              {busy ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 grid size-5 shrink-0 place-items-center rounded-full border",
              isDone ? "border-gold bg-gold text-paper" : "border-line",
            )}
          >
            {isDone ? <Check className="size-3" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-serif text-lg leading-snug break-words",
                isDone ? "text-ink/80" : "text-ink",
              )}
            >
              {wish.title}
            </p>
            {wish.note ? (
              <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap text-muted-ours">
                {wish.note}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs text-muted-ours">
              {authorName(wish.author, names)}
              {isClient ? ` · ${formatDottedDate(todayLocalIsoDate(new Date(wish.createdAt)))}` : ""} 许愿
              {isDone && wish.doneOn ? (
                <span className="whitespace-nowrap text-gold"> · {formatDottedDate(wish.doneOn)} 实现</span>
              ) : null}
            </p>

            {isDone && wish.moment ? (
              <Link
                href={`/moments/${wish.moment.id}`}
                className="group mt-3 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              >
                <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg bg-paper bg-[linear-gradient(135deg,#efe4d6,#f7efe6)]">
                  {wish.moment.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={wish.moment.thumbnailUrl}
                      alt={`「${wish.title}」那天的流光`}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </span>
                <span className="text-xs text-muted-ours group-hover:text-ink">那天的流光 →</span>
              </Link>
            ) : null}

            {mode === "complete" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void complete(false);
                }}
                className="mt-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`done-on-${wish.id}`} className="text-xs text-muted-ours">
                    实现日期
                  </label>
                  <input
                    id={`done-on-${wish.id}`}
                    type="date"
                    value={doneOn}
                    max={todayLocalIsoDate()}
                    onChange={(event) => setDoneOn(event.target.value)}
                    required
                    className="rounded-lg border border-line bg-background px-2 py-1 text-sm text-ink outline-none focus:border-gold"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || !doneOn}
                    onClick={() => void complete(true)}
                    className={cn(buttonVariants({ size: "sm" }), "gap-1")}
                  >
                    <ImagePlus aria-hidden />
                    实现了，发一条流光
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !doneOn}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    {busy ? "保存中…" : "只打勾"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                  >
                    取消
                  </button>
                </div>
              </form>
            ) : null}

            {error ? <p className="mt-2 text-sm text-accent-ours">{error}</p> : null}
          </div>

          {canEdit && mode === "view" ? (
            <div className="flex shrink-0 items-center gap-0.5">
              {isDone ? (
                <>
                  {!wish.moment ? (
                    <IconAction label="补一条流光" disabled={busy} onClick={() => onRemember(wish)}>
                      <ImagePlus />
                    </IconAction>
                  ) : null}
                  <IconAction label="撤回为未实现" disabled={busy} onClick={() => void revert()}>
                    <RotateCcw />
                  </IconAction>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDoneOn(todayLocalIsoDate());
                    setMode("complete");
                  }}
                  className="mr-1 rounded-full border border-gold/60 px-2.5 py-1 text-xs text-ink transition-colors hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  实现了
                </button>
              )}
              <IconAction label="编辑" disabled={busy} onClick={startEdit}>
                <Pencil />
              </IconAction>
              <IconAction label="删除" disabled={busy} onClick={() => void onRemove()}>
                <Trash2 />
              </IconAction>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-muted-ours transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
