import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.mercadopago.com/v1/payment_methods",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Erro Mercado Pago payment_methods:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar os meios de pagamento.",
        },
        { status: 502 }
      );
    }

    const methods = Array.isArray(data)
      ? data.map((method) => ({
          id: method.id,
          name: method.name,
          payment_type_id:
            method.payment_type_id,
          status: method.status,
        }))
      : [];

    return NextResponse.json({
      methods,
    });
  } catch (error) {
    console.error(
      "Erro consultando payment methods:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao consultar meios de pagamento.",
      },
      { status: 500 }
    );
  }
  }
