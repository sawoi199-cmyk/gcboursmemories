import { NextResponse } from "next/server";
import { authorizeMomentRoute, momentRouteError } from "@/app/api/moments/route-helpers";
import { SetLikeSchema } from "@/features/moments/moment-schema";
import { setLike } from "@/features/moments/moment-social";
import { createServiceClient } from "@/lib/supabase/admin";
import { invalidPayloadResponse } from "@/lib/validation/invalid-payload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Body `{ author, liked }` — idempotent like/unlike; returns who likes the moment now. */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await authorizeMomentRoute(context.params);
    if (!auth.ok) return auth.response;

    const parsed = SetLikeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return invalidPayloadResponse(parsed.error, { author: "点赞人", liked: "点赞状态" });
    }

    const likedBy = await setLike(createServiceClient(), auth.ownerId, auth.ids.id, parsed.data);
    return NextResponse.json({ ok: true, likedBy });
  } catch (error) {
    return momentRouteError(error, "点赞失败");
  }
}
