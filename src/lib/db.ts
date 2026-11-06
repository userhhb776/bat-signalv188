import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type TableName = "render_servers" | "gateways" | "orders" | "agents" | "flows" | "messages" | "funnels";
export type Row<N extends keyof T> = T[N]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Faça login");
  return data.user.id;
}

export function useRows<N extends TableName>(table: N, opts?: { since?: string; limit?: number }) {
  return useQuery({
    queryKey: [table, opts?.since ?? "", opts?.limit ?? 0],
    queryFn: async () => {
      let q = supabase.from(table).select("*").order("created_at", { ascending: false });
      if (opts?.since) q = q.gte("created_at", opts.since);
      q = q.limit(opts?.limit ?? 5000);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Row<N>[];
    },
  });
}

export function useSave<N extends TableName>(table: N) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Row<N>> & { id?: string }) => {
      const user_id = await uid();
      const payload = { ...row, user_id } as never;
      const { data, error } = row.id
        ? await supabase.from(table).update(payload).eq("id" as never, row.id as never).select("*").single()
        : await supabase.from(table).insert(payload).select("*").single();
      if (error) throw error;
      return data as unknown as Row<N>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useRemove(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const user_id = await uid();
      const { data } = await supabase.from("settings").select("*").eq("user_id", user_id).maybeSingle();
      if (data) return data;
      const { data: created, error } = await supabase.from("settings").insert({ user_id }).select("*").single();
      if (error) throw error;
      return created;
    },
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<T["settings"]["Update"]>) => {
      const user_id = await uid();
      const { error } = await supabase.from("settings").update(patch).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const statusLabel: Record<string, string> = {
  approved: "Aprovado", pending: "Pendente", abandoned: "Carrinho abandonado", refunded: "Reembolsado", chargeback: "Chargeback", canceled: "Cancelado",
};
export const methodLabel: Record<string, string> = { cartao: "Cartão", boleto: "Boleto", pix: "Pix", outro: "Outro" };
export const channelLabel: Record<string, string> = { whatsapp: "WhatsApp", telegram: "Telegram", sms: "SMS", email: "E-mail" };
