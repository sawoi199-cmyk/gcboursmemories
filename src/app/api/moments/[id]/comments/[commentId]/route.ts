import { NextResponse } from "next/server";
import { authorizeMomentRoute, momentRouteError } from "@/app/api/moments/route-helpers";
import { deleteComment } from "@/features/moments/moment-social";
import { createServiceClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await authorizeMomentRoute(context.params);
    if (!auth.ok) return auth.response;

    const deleted = await deleteComment(
      createServiceClient(),
      auth.ownerId,
      auth.ids.id,
      auth.ids.commentId,
    );
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "找不到这条评论。" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return momentRouteError(error, "删除评论失败");
  }
}
