import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const login = request.nextUrl.pathname === "/login";
  const deny = () => {
    const result = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "Sign in to search foods." },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
    return result;
  };
  if (!url || !key) return login ? response : deny();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !login) return deny();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Only public application assets bypass auth. Page/API paths never use extension-based exemptions.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|offline.html).*)",
  ],
};
