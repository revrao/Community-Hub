/** Use the incoming Host instead of Next's internal development hostname. */
export function requestOrigin(request: Request): string {
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
