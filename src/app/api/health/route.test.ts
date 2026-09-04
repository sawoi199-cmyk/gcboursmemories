import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, isSupabaseConfigured, limit, select } = vi.hoisted(() => ({
  from: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: () => ({ from }),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    from.mockReturnValue({ select });
    select.mockReturnValue({ limit });
    limit.mockResolvedValue({ error: null });
  });

  it("returns an uncached successful health response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: "healthy",
    });
    expect(from).toHaveBeenCalledWith("relationship_settings");
    expect(select).toHaveBeenCalledWith("id");
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns 503 when Supabase is unavailable", async () => {
    limit.mockResolvedValue({ error: new Error("Database unavailable") });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: "unhealthy",
    });
  });

  it("returns 503 when Supabase is not configured", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(from).not.toHaveBeenCalled();
  });
});
