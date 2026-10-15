import { WishBoard } from "@/components/experience/wish-board";
import {
  DEFAULT_OWNER_NAME,
  DEFAULT_PARTNER_NAME,
} from "@/features/relationship-profile/couple-names";
import { getWishBoard } from "@/features/wishes/wishes";

export const dynamic = "force-dynamic";

type WishesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function WishesPage({ searchParams }: WishesPageProps) {
  const [board, query] = await Promise.all([getWishBoard(), searchParams]);

  return (
    <WishBoard
      initialWishes={board?.wishes ?? []}
      names={board?.names ?? { owner: DEFAULT_OWNER_NAME, partner: DEFAULT_PARTNER_NAME }}
      canEdit={board !== null}
      initialTab={query.tab === "done" ? "done" : "wish"}
    />
  );
}
