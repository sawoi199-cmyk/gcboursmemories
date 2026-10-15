import { notFound } from "next/navigation";
import { z } from "zod";
import { MomentView } from "@/components/experience/moment-view";
import { getMomentPage } from "@/features/moments/moments";

export const dynamic = "force-dynamic";

type MomentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MomentPage({ params }: MomentPageProps) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const page = await getMomentPage(id.data);
  if (!page) notFound();

  return <MomentView initialMoment={page.moment} names={page.names} />;
}
