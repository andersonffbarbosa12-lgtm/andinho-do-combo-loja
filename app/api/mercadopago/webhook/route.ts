import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function validateSignature(
  request: NextRequest,
  dataId: string
) {
  const secret =
    process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const xSignature =
    request.headers.get("x-signature");

  const xRequestId =
    request.headers.get("x-request-id");

  if (!xSignature) {
    return false;
  }

  const parts = xSignature.split(",");

  let ts = "";
  let receivedHash = "";

  for (const rawPart of parts) {
    const part = rawPart.trim();
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = part
      .slice(0, separatorIndex)
      .trim();

    const value = part
      .slice(separatorIndex + 1)
      .trim();

    if (key === "ts") {
      ts = value;
    }

    if (key === "v1") {
      receivedHash = value;
    }
  }

  if (!ts || !receivedHash) {
    return false;
  }

  /*
    O Mercado Pago orienta montar o manifesto
    somente com os valores presentes.
  */
  let manifest = "";

  if (dataId) {
    manifest += `id:${dataId};`;
  }

  if (xRequestId) {
    manifest +=
      `request-id:${xRequestId};`;
  }

  manifest += `ts:${ts};`;

  const calculatedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    const calculatedBuffer =
      Buffer.from(
        calculatedHash,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        receivedHash,
        "utf8"
      );

    if (
      calculatedBuffer.length !==
      receivedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      calculatedBuffer,
      receivedBuffer
    );
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const type =
      request.nextUrl.searchParams.get("type") ||
      body.type ||
      body.topic;

    const paymentId =
      request.nextUrl.searchParams.get("data.id") ||
      body.data?.id?.toString();

    // Ignora notificações que não sejam de pagamento
    if (
      type !== "payment" ||
      !paymentId
    ) {
      return NextResponse.json(
        { received: true },
        { status: 200 }
      );
    }

    // Tenta validar a assinatura recebida.
    const signatureValid =
      validateSignature(
        request,
        paymentId
      );

    if (!signatureValid) {
      /*
        Não confiamos no conteúdo do webhook.
        Em vez de atualizar o pedido diretamente,
        seguimos para a consulta oficial do pagamento
        na API do Mercado Pago usando nosso Access Token.
      */
      console.warn(
        "Assinatura do webhook não validou; confirmando pagamento diretamente na API do Mercado Pago."
      );
    }

    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago não configurado.",
        },
        { status: 500 }
      );
    }

    // Consulta o pagamento diretamente no Mercado Pago
    const paymentResponse =
      await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache: "no-store",
        }
      );

    const payment =
      await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error(
        "Erro consultando pagamento:",
        payment
      );

      return NextResponse.json(
        {
          error:
            "Erro consultando pagamento.",
        },
        { status: 500 }
      );
    }

    const externalReference =
      payment.external_reference;

    if (!externalReference) {
      console.error(
        "Pagamento sem external_reference:",
        paymentId
      );

      return NextResponse.json(
        { received: true },
        { status: 200 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRole
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase servidor não configurado.",
        },
        { status: 500 }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRole,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    let orderStatus =
      "pending_payment";

    switch (payment.status) {
      case "approved":
        orderStatus = "paid";
        break;

      case "pending":
      case "in_process":
      case "authorized":
        orderStatus =
          "pending_payment";
        break;

      case "rejected":
        orderStatus =
          "payment_rejected";
        break;

      case "cancelled":
        orderStatus =
          "cancelled";
        break;

      case "refunded":
        orderStatus =
          "refunded";
        break;

      default:
        orderStatus =
          "pending_payment";
    }

    const { data: order, error } =
      await supabase
        .from("orders")
        .update({
          status: orderStatus,
        })
        .eq(
          "id",
          externalReference
        )
        .select("id")
        .maybeSingle();

    if (error) {
      console.error(
        "Erro atualizando pedido:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Erro atualizando pedido.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      console.error(
        "Pedido não encontrado:",
        externalReference
      );

      return NextResponse.json(
        {
          received: true,
          orderFound: false,
        },
        { status: 200 }
      );
    }

    console.log(
      `Pagamento ${paymentId}: pedido ${externalReference} atualizado para ${orderStatus}. Assinatura válida: ${signatureValid}`
    );

    return NextResponse.json(
      {
        received: true,
        orderFound: true,
        status: orderStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Erro webhook Mercado Pago:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook error",
      },
      { status: 500 }
    );
  }
}
