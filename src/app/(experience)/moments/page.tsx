import { MomentsGrid } from "@/components/experience/moments-grid";
import { getMomentsFeed } from "@/features/moments/moments";
import {
  DEFAULT_OWNER_NAME,
  DEFAULT_PARTNER_NAME,
} from "@/features/relationship-profile/couple-names";

export const dynamic = "force-dynamic";

export default async function MomentsPage() {
  const feed = await getMomentsFeed();

  return (
    <MomentsGrid
      initialMoments={feed?.moments ?? []}
      initialCursor={feed?.nextCursor ?? null}
      names={feed?.names ?? { owner: DEFAULT_OWNER_NAME, partner: DEFAULT_PARTNER_NAME }}
      canEdit={feed !== null}
    />
  );
}
