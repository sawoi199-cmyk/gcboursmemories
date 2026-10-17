import { NextResponse } from "next/server";
import { authorizeMomentRoute, momentRouteError } from "@/app/api/moments/route-helpers";
import { CreateCommentSchema } from "@/features/moments/moment-schema";
import { addComment } from "@/features/moments/moment-social";
import { createServiceClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await authorizeMomentRoute(context.params);
    if (!auth.ok) return auth.response;

    const parsed = CreateCommentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "评论不能为空，最多 300 字。" },
        { status: 400 },
      );
    }

    const comment = await addComment(createServiceClient(), auth.ownerId, auth.ids.id, parsed.data);
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return momentRouteError(error, "发表评论失败");
  }
}
