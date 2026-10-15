import { WishBoard } from "@/components/experience/wish-board";
import {
  DEFAULT_OWNER_NAME,
  DEFAULT_PARTNER_NAME,
} from "@/features/relationship-profile/couple-names";
import { getWishBoard } from "@/features/wishes/wishes";

export const dynamic = "force-dynamic";

export default async function WishesPage() {
  const board = await getWishBoard();

  return (
    <WishBoard
      initialWishes={board?.wishes ?? []}
      names={board?.names ?? { owner: DEFAULT_OWNER_NAME, partner: DEFAULT_PARTNER_NAME }}
      canEdit={board !== null}
    />
  );
}
