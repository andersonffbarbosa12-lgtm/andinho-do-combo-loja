"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Address = {
  id: string;
  label: string;
  address: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  cep: string | null;
  is_default: boolean;
};

type Order = {
  id: string;
  total: number;
  status: string;
  order_type: string | null;
  created_at: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    pending_payment: "Aguardando pagamento",
    paid: "Pago",
    preparing: "Preparando",
    ready: "Pronto para retirada",
    out_for_delivery: "Saiu para entrega",
    delivered: "Finalizado",
    cancelled: "Cancelado",
    payment_rejected: "
