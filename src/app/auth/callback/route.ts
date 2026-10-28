import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { requestOrigin } from "@/lib/request-origin";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthReturn = request.cookies.get("communityhub-auth-next")?.value;
  const next = safeNext(
    request.nextUrl.searchParams.get("next") ?? oauthReturn,
  );
  const finish = (path: string) => {
    const response = NextResponse.redirect(
      new URL(path, requestOrigin(request)),
    );
    response.cookies.set("communityhub-auth-next", "", {
      path: "/auth/callback",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await db.auth.getUser();
      if (
        data.user?.identities?.some(
          (identity) => identity.provider === "google",
        )
      ) {
        const sync = await db.rpc("sync_google_profile");
        if (sync.error) return finish("/profile?notice=profile_setup");
      }
      return finish(next);
    }
  }
  return finish(
    "/login?error=" +
      (oauthReturn || request.nextUrl.searchParams.has("error")
        ? "oauth"
        : "confirmation"),
  );
}
