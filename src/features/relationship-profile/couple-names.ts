import { createServiceClient } from "@/lib/supabase/admin";

export const DEFAULT_OWNER_NAME = "臭宝";
export const DEFAULT_PARTNER_NAME = "乖宝";

export type CoupleNames = {
  owner: string;
  partner: string;
};

/** Display names from Studio settings, falling back to the defaults. */
export async function getCoupleNames(ownerId: string): Promise<CoupleNames> {
  const { data, error } = await createServiceClient()
    .from("relationship_settings")
    .select("owner_name, partner_name")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    owner: data?.owner_name?.trim() || DEFAULT_OWNER_NAME,
    partner: data?.partner_name?.trim() || DEFAULT_PARTNER_NAME,
  };
}
