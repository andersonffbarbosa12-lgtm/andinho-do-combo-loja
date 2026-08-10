import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              response.cookies.set(
                name,
                value,
                options
              )
          );
        },
      },
    }
  );

  const { data } =
    await supabase.auth.getClaims();

  const isLoggedIn = Boolean(
    data?.claims?.sub
  );

  const pathname =
    request.nextUrl.pathname;

  const publicRoutes = [
    "/entrar",
    "/cadastro",
  ];

  const isPublicRoute =
    publicRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  const isAdmin =
    pathname === "/admin" ||
    pathname.startsWith(
      "/admin/"
    );

  const isApi =
    pathname.startsWith("/api/");

  const isPaymentCallback =
    pathname.startsWith(
      "/pagamento/"
    );

  if (
    !isLoggedIn &&
    !isPublicRoute &&
    !isAdmin &&
    !isApi &&
    !isPaymentCallback
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/entrar";

    return NextResponse.redirect(url);
  }

  if (
    isLoggedIn &&
    isPublicRoute
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/";

    return NextResponse.redirect(url);
  }

  return response;
            }
