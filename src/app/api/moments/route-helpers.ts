import { NextResponse } from "next/server";
import { z } from "zod";
import { MomentRequestError } from "@/features/moments/moment-errors";
import { requireSiteSession } from "@/lib/security/require-site-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const IdSchema = z.uuid();

type Authorized<K extends string> = { ok: true; ownerId: string; ids: Record<K, string> };
type Rejected = { ok: false; response: NextResponse };

/** Site session + UUID route params for the moment social routes. */
export async function authorizeMomentRoute<K extends string>(
  params: Promise<Record<K, string>>,
): Promise<Authorized<K> | Rejected> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Supabase 未配置" }, { status: 503 }),
    };
  }

  const session = await requireSiteSession();
  if (!session.ok) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: session.message }, { status: session.status }),
    };
  }

  const raw = await params;
  const ids = {} as Record<K, string>;
  for (const key of Object.keys(raw) as K[]) {
    const parsed = IdSchema.safeParse(raw[key]);
    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json({ ok: false, message: "找不到这条内容。" }, { status: 404 }),
      };
    }
    ids[key] = parsed.data;
  }

  return { ok: true, ownerId: session.ownerId, ids };
}

export function momentRouteError(error: unknown, fallback: string) {
  if (error instanceof MomentRequestError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { ok: false, message: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}
