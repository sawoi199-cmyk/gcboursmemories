import Link from "next/link";
import { StudioLogoutButton } from "@/components/studio/studio-logout-button";

const studioLinks = [
  { href: "/studio", label: "概览" },
  { href: "/studio/upload", label: "上传" },
  { href: "/studio/drafts", label: "回忆" },
  { href: "/studio/templates", label: "模板" },
  { href: "/studio/settings", label: "设置" },
] as const;

export function StudioNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <nav
        aria-label="Studio 导航"
        className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 text-sm text-muted-ours"
      >
        <span className="mr-2 shrink-0 font-serif text-base text-ink">OURS Studio</span>
        {studioLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-md px-2 py-1 hover:bg-background hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
        <StudioLogoutButton
          label="退出"
          className="ml-auto shrink-0 rounded-md border-0 bg-transparent px-2 py-1 shadow-none hover:bg-background hover:text-ink"
        />
        <Link
          href="/"
          className="shrink-0 rounded-md px-2 py-1 hover:bg-background hover:text-ink"
        >
          前台
        </Link>
      </nav>
    </header>
  );
}
