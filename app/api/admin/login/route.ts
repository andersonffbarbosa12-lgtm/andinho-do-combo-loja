import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminSessionValue,
} from "../../../../lib/admin-auth";

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return new NextResponse("ADMIN_PASSWORD não configurada.", {
      status: 500,
    });
  }

  const formData = await request.formData();
  const password = formData.get("password")?.toString() ?? "";

  if (password !== adminPassword) {
    return NextResponse.redirect(
      new URL("/admin?erro=1", request.url),
      303
    );
  }

  const response = NextResponse.redirect(
    new URL("/admin", request.url),
    303
  );

  response.cookies.set(
    ADMIN_COOKIE,
    getAdminSessionValue(),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  return response;
}
