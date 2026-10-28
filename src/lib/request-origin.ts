/** Production uses an explicit canonical origin; local development uses Host. */
export function requestOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN;
  if (configured) {
    const origin = new URL(configured);
    if (
      origin.protocol !== "https:" ||
      origin.origin !== configured ||
      origin.username ||
      origin.password
    )
      throw new Error(
        "APP_ORIGIN must be an HTTPS origin without a path or trailing slash.",
      );
    return origin.origin;
  }
  const target = new URL(request.url);
  const host = request.headers.get("host");
  if (host) target.host = host;
  return target.origin;
}

/** Match the browser's origin against the incoming Host, not Next's internal dev hostname. */
export function sameOrigin(request: Request): string | null {
  const value = request.headers.get("origin");
  if (!value) return null;
  try {
    const origin = new URL(value);
    if (origin.origin !== value || origin.origin !== requestOrigin(request))
      return null;
    return origin.origin;
  } catch {
    return null;
  }
}
