const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function tryGetSiteOwnerId(): string | null {
  const id = process.env.SITE_OWNER_ID?.trim();
  if (!id || !UUID_RE.test(id)) {
    return null;
  }
  return id;
}

export function getSiteOwnerId(): string {
  const id = tryGetSiteOwnerId();
  if (!id) {
    throw new Error("SITE_OWNER_ID is missing or not a valid UUID.");
  }
  return id;
}
