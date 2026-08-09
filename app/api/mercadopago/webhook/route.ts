import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  getSupabaseAdmin,
} from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

function safeEqualHex(
  calculated: string,
  received: string
) {
  try {
    const a =
      Buffer.from(
        calculated,
        "hex"
      );

    const b =
      Buffer.from(
        received,
        "hex"
      );

    if (
      a.length === 0 ||
      a.length !== b.length
    ) {
      return false;
    }

    return crypto
      .timingSafeEqual(
        a,
        b
      );
  } catch {
    return false;
  }
}

function validateSignature(
  request: NextRequest,
  dataId: string
) {
  const secret =
    process.env
      .MERCADO_PAGO_WEBHOOK_SECRET
      ?.trim();

  if (!secret) {
    console.error(
      "MERCADO_PAGO_WEBHOOK_SECRET não configurado."
    );

    return false;
  }

  const xSignature =
    request.headers.get(
      "x-signature"
    );

  const xRequestId =
    request.headers.get(
      "x-request-id"
    );

  if (
    !xSignature ||
    !xRequestId
  ) {
    return false;
  }

  let timestamp = "";
  let receivedHash = "";

  for (
    const rawPart
    of xSignature.split(",")
  ) {
    const [
      rawKey,
      ...rawValue
    ] =
      rawPart
        .trim()
        .split("=");

    const key =
      rawKey?.trim();

    const value =
      rawValue
        .join("=")
        .trim();

    if (
      key === "ts"
    ) {
      timestamp =
        value;
    }

    if (
      key === "v1"
    ) {
      receivedHash =
        value;
    }
  }

  if (
    !timestamp ||
    !receivedHash
  ) {
    return false;
  }

  let manifest = "";

  if (dataId) {
    manifest +=
      `id:${dataId.toLowerCase()};`;
  }

  if (xRequestId) {
    manifest +=
      `request-id:${xRequestId};`;
  }

  manifest +=
    `ts:${timestamp};`;

  const calculated =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(manifest)
      .digest("hex");

  return safeEqualHex(
    calculated,
    receivedHash
  );
}

function mapPaymentStatus(
  paymentStatus: string
) {
  switch (
    paymentStatus
  ) {
    case "approved":
      return "paid";

    case "pending":
    case "in_process":
    case "authorized":
      return "pending_payment";

    case "rejected":
      return "payment_rejected";

    case "cancelled":
      return "cancelled";

    case "refunded":
      return "refunded";

    default:
      return "pending_payment";
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    let body: any = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const type =
      request.nextUrl
        .searchParams
        .get("type") ||
      body.type ||
      body.topic;

    /*
      Outros tipos de notificação
      podem ser ignorados.
    */
    if (
      type !== "payment"
    ) {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    const paymentId =
      request.nextUrl
        .searchParams
        .get("data.id") ||
      body.data?.id
        ?.toString();

    if (!paymentId) {
      return NextResponse.json(
        {
          error:
            "Pagamento não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !validateSignature(
        request,
        paymentId
      )
    ) {
      console.warn(
        "Webhook Mercado Pago rejeitado: assinatura inválida."
      );

      return NextResponse.json(
        {
          error:
            "Invalid signature",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      );
    }

    /*
      Mesmo com assinatura válida,
      buscamos os dados reais
      diretamente no Mercado Pago.
    */
    const paymentResponse =
      await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(
          paymentId
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              15_000
            ),
        }
      );

    const payment =
      await paymentResponse
        .json();

    if (
      !paymentResponse.ok
    ) {
      console.error(
        "Erro consultando pagamento:",
        payment
      );

      return NextResponse.json(
        {
          error:
            "Erro consultando pagamento.",
        },
        {
          status: 502,
        }
      );
    }

    const externalReference =
      typeof payment
        .external_reference ===
      "string"
        ? payment
            .external_reference
            .trim()
        : "";

    if (
      !externalReference
    ) {
      return NextResponse.json(
        {
          received: true,
          orderFound: false,
        },
        {
          status: 200,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const {
      data: order,
      error: orderError,
    } =
      await supabase
        .from("orders")
        .select(`
          id,
          total,
          status,
          payment_method,
          mercado_pago_payment_id
        `)
        .eq(
          "id",
          externalReference
        )
        .maybeSingle();

    if (orderError) {
      console.error(
        "Erro buscando pedido:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Erro buscando pedido.",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      console.warn(
        "Pedido não encontrado:",
        externalReference
      );

      return NextResponse.json(
        {
          received: true,
          orderFound: false,
        },
        {
          status: 200,
        }
      );
    }

    /*
      A mesma cobrança não pode
      pertencer a outro pedido.
    */
    if (
      order.mercado_pago_payment_id &&
      order.mercado_pago_payment_id !==
        String(payment.id)
    ) {
      console.error(
        "Pedido já vinculado a outro pagamento."
      );

      return NextResponse.json(
        {
          error:
            "Pagamento incompatível.",
        },
        {
          status: 409,
        }
      );
    }

    const expectedTotal =
      Number(
        Number(
          order.total
        ).toFixed(2)
      );

    const paidAmount =
      Number(
        Number(
          payment.transaction_amount
        ).toFixed(2)
      );

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      Math.abs(
        expectedTotal -
        paidAmount
      ) > 0.01
    ) {
      console.error(
        "Valor do pagamento não corresponde ao pedido.",
        {
          expectedTotal,
          paidAmount,
          orderId:
            order.id,
        }
      );

      return NextResponse.json(
        {
          error:
            "Valor incompatível.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      payment.currency_id !==
      "BRL"
    ) {
      console.error(
        "Moeda inválida no pagamento:",
        payment.currency_id
      );

      return NextResponse.json(
        {
          error:
            "Moeda incompatível.",
        },
        {
          status: 409,
        }
      );
    }

    const orderStatus =
      mapPaymentStatus(
        String(
          payment.status ?? ""
        )
      );

    const updateData: {
      status: string;
      mercado_pago_payment_id: string;
      payment_status_detail:
        string | null;
      paid_at?: string;
      updated_at: string;
    } = {
      status:
        orderStatus,

      mercado_pago_payment_id:
        String(
          payment.id
        ),

      payment_status_detail:
        payment.status_detail
          ? String(
              payment.status_detail
            )
          : null,

      updated_at:
        new Date()
          .toISOString(),
    };

    if (
      payment.status ===
      "approved"
    ) {
      updateData.paid_at =
        payment.date_approved
          ? new Date(
              payment.date_approved
            ).toISOString()
          : new Date()
              .toISOString();
    }

    const {
      error:
        updateError,
    } =
      await supabase
        .from("orders")
        .update(
          updateData
        )
        .eq(
          "id",
          order.id
        );

    if (updateError) {
      console.error(
        "Erro atualizando pedido:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Erro atualizando pedido.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      `Pagamento ${payment.id}: pedido ${order.id} → ${orderStatus}`
    );

    return NextResponse.json(
      {
        received: true,
        orderFound: true,
        status:
          orderStatus,
      },
      {
        status: 200,
      }
    );
    } catch (error) {
    console.error(
      "Erro webhook Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        error: "Webhook error",
      },
      {
        status: 500,
      }
    );
  }
}
