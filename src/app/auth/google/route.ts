import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { googleAvailability } from "@/lib/auth-providers";
import { safeNext } from "@/lib/auth";
import { sameOrigin } from "@/lib/request-origin";
export async function POST(request: NextRequest) {
  const origin = sameOrigin(request);
  if (!origin)
    return NextResponse.json(
      { error: "This request is not allowed." },
      { status: 403 },
    );
  try {
    const provider = await googleAvailability();
    if (!provider.enabled)
      return NextResponse.json(
        {
          error:
            "Google sign-in is not available right now. Please use email and password.",
        },
        { status: 503 },
      );
    const body = await request.json();
    const db = await serverClient();
    const { data, error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: origin + "/auth/callback",
        scopes: "openid email profile",
        queryParams: { prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url)
      return NextResponse.json(
        { error: "Google sign-in could not be started. Please try again." },
        { status: 503 },
      );
    const response = NextResponse.json(
      { url: data.url },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(
      "communityhub-auth-next",
      safeNext(typeof body.next === "string" ? body.next : null),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/auth/callback",
        maxAge: 600,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Google sign-in could not be started. Please try again." },
      { status: 503 },
    );
  }
}
