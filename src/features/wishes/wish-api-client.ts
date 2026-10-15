import type { CreateWishInput, UpdateWishInput } from "@/features/wishes/wish-schema";
import type { Wish } from "@/features/wishes/wishes";

type WishApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type WishResponse = { ok?: boolean; wish?: Wish; message?: string };

async function request(url: string, init: RequestInit): Promise<WishApiResult<WishResponse>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const json = (await response.json()) as WishResponse;
    if (!response.ok || !json.ok) {
      return { ok: false, message: json.message ?? "操作失败，请稍后重试。" };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, message: "网络错误，请稍后重试。" };
  }
}

function unwrapWish(result: WishApiResult<WishResponse>): WishApiResult<Wish> {
  if (!result.ok) return result;
  if (!result.data.wish) return { ok: false, message: "操作失败，请稍后重试。" };
  return { ok: true, data: result.data.wish };
}

export async function postWish(input: CreateWishInput) {
  return unwrapWish(await request("/api/wishes", { method: "POST", body: JSON.stringify(input) }));
}

export async function patchWish(id: string, input: UpdateWishInput) {
  return unwrapWish(
    await request(`/api/wishes/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  );
}

export async function removeWish(id: string): Promise<WishApiResult<null>> {
  const result = await request(`/api/wishes/${id}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : result;
}
