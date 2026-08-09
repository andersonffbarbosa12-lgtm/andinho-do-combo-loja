import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  safeCompare,
} from "../../../../lib/admin-auth";

import {
  checkRateLimit,
  getRequestFingerprint,
} from "../../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const adminPassword =
      process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error(
        "ADMIN_PASSWORD não configurada."
      );

      return new NextResponse(
        "Configuração do Admin inválida.",
        {
          status: 500,
        }
      );
    }

    const fingerprint =
      getRequestFingerprint(
        request.headers
      );

    /*
      Máximo de 5 tentativas
      a cada 15 minutos.
    */
    const rateLimit =
      await checkRateLimit({
        keyHash: fingerprint,
        action: "admin_login",
        limit: 5,
        windowSeconds: 15 * 60,
      });

    if (!rateLimit.allowed) {
      console.warn(
        "Login Admin bloqueado por excesso de tentativas."
      );

      return NextResponse.redirect(
        new URL(
          "/admin?erro=1",
          request.url
        ),
        303
      );
    }

    const formData =
      await request.formData();

    const password =
      formData
        .get("password")
        ?.toString() ?? "";

    if (
      password.length > 200 ||
      !safeCompare(
        password,
        adminPassword
      )
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin?erro=1",
          request.url
        ),
        303
      );
    }

    const response =
      NextResponse.redirect(
        new URL(
          "/admin",
          request.url
        ),
        303
      );

    response.cookies.set(
      ADMIN_COOKIE,
      createAdminSessionToken(),
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "strict",

        path: "/",

        maxAge:
          ADMIN_SESSION_MAX_AGE,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Erro no login Admin:",
      error
    );

    return new NextResponse(
      "Erro interno.",
      {
        status: 500,
      }
    );
  }
}
