import type { MomentCursor, UpdateMomentInput } from "@/features/moments/moment-schema";
import type { MomentDetail, MomentsPage } from "@/features/moments/moments";

export type MomentApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type MomentResponse = {
  ok?: boolean;
  message?: string;
  moment?: MomentDetail;
  warnings?: string[];
  moments?: MomentsPage["moments"];
  nextCursor?: MomentCursor | null;
};

async function request(url: string, init?: RequestInit): Promise<MomentApiResult<MomentResponse>> {
  try {
    const response = await fetch(url, init);
    const json = (await response.json()) as MomentResponse;
    if (!response.ok || !json.ok) {
      return { ok: false, message: json.message ?? "操作失败，请稍后重试。" };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, message: "网络错误，请稍后重试。" };
  }
}

/** `body` is multipart: file + exif fields + caption / takenOn / author / wishId. */
export async function postMoment(
  body: FormData,
): Promise<MomentApiResult<{ moment: MomentDetail; warnings: string[] }>> {
  const result = await request("/api/moments", { method: "POST", body });
  if (!result.ok) return result;
  if (!result.data.moment) return { ok: false, message: "发布失败，请稍后重试。" };
  return { ok: true, data: { moment: result.data.moment, warnings: result.data.warnings ?? [] } };
}

export async function fetchMomentsPage(cursor: MomentCursor): Promise<MomentApiResult<MomentsPage>> {
  const search = new URLSearchParams({ cursorDate: cursor.takenOn, cursorSeq: String(cursor.seq) });
  const result = await request(`/api/moments?${search.toString()}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: { moments: result.data.moments ?? [], nextCursor: result.data.nextCursor ?? null },
  };
}

export async function patchMoment(
  id: string,
  input: UpdateMomentInput,
): Promise<MomentApiResult<MomentDetail>> {
  const result = await request(`/api/moments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!result.ok) return result;
  if (!result.data.moment) return { ok: false, message: "保存失败，请稍后重试。" };
  return { ok: true, data: result.data.moment };
}

export async function removeMoment(id: string): Promise<MomentApiResult<null>> {
  const result = await request(`/api/moments/${id}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : result;
}
