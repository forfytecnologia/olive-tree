import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, CopyPlus, Pause, Pencil, Play, Plus, Search, Shuffle, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/catalog";
import {
  COUPON_TYPE_LABEL,
  couponDiscount,
  couponStatus,
  describeCoupon,
  normalizeCode,
  type Coupon,
  type CouponStatus,
  type CouponType,
} from "@/lib/coupons";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  component: CuponsAdmin,
  head: () => ({ meta: [{ title: "Cupons · Painel Olive Tree" }] }),
});

const input =
  "mt-1 w-full border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

const STATUS_LABEL: Record<CouponStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  agendado: "Agendado",
  expirado: "Expirado",
  esgotado: "Esgotado",
};
const STATUS_CLASS: Record<CouponStatus, string> = {
  ativo: "bg-primary text-primary-foreground",
  pausado: "bg-muted text-muted-foreground",
  agendado: "bg-accent text-accent-foreground",
  expirado: "bg-muted text-muted-foreground line-through",
  esgotado: "bg-secondary text-secondary-foreground",
};

type Form = {
  id?: string;
  code: string;
  type: CouponType;
  value: string;
  min_subtotal: string;
  starts_at: string;
  ends_at: string;
  max_uses: string;
  max_uses_per_email: string;
  active: boolean;
};

const EMPTY: Form = {
  code: "",
  type: "percent",
  value: "10",
  min_subtotal: "",
  starts_at: "",
  ends_at: "",
  max_uses: "",
  max_uses_per_email: "",
  active: true,
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "OLIVE" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function loadCoupons() {
  const [{ data: coupons, error }, { data: orders }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("coupon_code,discount_amount,payment_status").neq("coupon_code", ""),
  ]);
  if (error) throw error;
  const stats = new Map<string, { orders: number; saved: number }>();
  for (const o of orders ?? []) {
    if (o.payment_status === "cancelado") continue;
    const k = String(o.coupon_code).toUpperCase();
    const s = stats.get(k) ?? { orders: 0, saved: 0 };
    s.orders += 1;
    s.saved += Number(o.discount_amount);
    stats.set(k, s);
  }
  return (coupons ?? []).map((c) => ({
    ...(c as unknown as Coupon),
    value: Number(c.value),
    min_subtotal: Number(c.min_subtotal),
    saved: stats.get(c.code.toUpperCase())?.saved ?? 0,
  }));
}

function CuponsAdmin() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: loadCoupons });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | CouponStatus>("todos");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(
    () =>
      coupons.filter(
        (c) =>
          c.code.includes(q.toUpperCase()) && (filter === "todos" || couponStatus(c) === filter),
      ),
    [coupons, q, filter],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  function edit(c: Coupon, duplicate = false) {
    setForm({
      id: duplicate ? undefined : c.id,
      code: duplicate ? randomCode() : c.code,
      type: c.type,
      value: String(c.value),
      min_subtotal: c.min_subtotal ? String(c.min_subtotal) : "",
      starts_at: toLocalInput(c.starts_at),
      ends_at: toLocalInput(c.ends_at),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      max_uses_per_email: c.max_uses_per_email != null ? String(c.max_uses_per_email) : "",
      active: duplicate ? true : c.active,
    });
  }

  async function save() {
    if (!form) return;
    const code = normalizeCode(form.code);
    const value = Number(form.value.replace(",", "."));
    if (code.length < 3) return toast.error("O código precisa ter pelo menos 3 letras ou números.");
    if (form.type !== "free_shipping" && !(value > 0))
      return toast.error("Informe o valor do desconto.");
    if (form.type === "percent" && value > 100) return toast.error("A porcentagem vai até 100%.");
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at)
      return toast.error("A data final precisa ser depois da data de início.");
    const num = (v: string) => (v.trim() ? Math.max(0, Math.floor(Number(v))) : null);
    const payload = {
      code,
      type: form.type,
      value: form.type === "free_shipping" ? 0 : value,
      min_subtotal: Number(form.min_subtotal.replace(",", ".")) || 0,
      starts_at: form.starts_at ? new Date(form.starts_at + "T00:00:00").toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at + "T23:59:59").toISOString() : null,
      max_uses: num(form.max_uses),
      max_uses_per_email: num(form.max_uses_per_email),
      active: form.active,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from("coupons").update(payload).eq("id", form.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível salvar.",
      );
      return;
    }
    toast.success(form.id ? "Cupom atualizado" : "Cupom criado");
    setForm(null);
    refresh();
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error("Não foi possível alterar.");
    toast.success(c.active ? "Cupom pausado" : "Cupom ativado");
    refresh();
  }

  async function remove(c: Coupon) {
    if (c.uses_count > 0) {
      if (!confirm(`O cupom ${c.code} já foi usado. Para manter o histórico, ele será pausado. Continuar?`)) return;
      await supabase.from("coupons").update({ active: false }).eq("id", c.id);
      toast.success("Cupom pausado");
    } else {
      if (!confirm(`Excluir o cupom ${c.code}?`)) return;
      const { error } = await supabase.from("coupons").delete().eq("id", c.id);
      if (error) return toast.error("Não foi possível excluir.");
      toast.success("Cupom excluído");
    }
    refresh();
  }

  const previewBase = 200;
  const previewValue = Number((form?.value ?? "0").replace(",", ".")) || 0;
  const previewDisc = form
    ? couponDiscount(previewBase, { code: "", type: form.type, value: previewValue })
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Cupons de desconto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie códigos para suas clientes usarem na hora de finalizar a compra.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY, code: randomCode() })}
          className="flex items-center gap-2 bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo cupom
        </button>
      </div>

      <details open={coupons.length === 0} className="bg-card p-6 text-sm">
        <summary className="cursor-pointer font-medium">Como funcionam os cupons</summary>
        <div className="mt-4 space-y-3 text-muted-foreground">
          <p>
            Um cupom é uma palavra (ex.: <strong>BEMVINDA10</strong>) que a cliente digita no
            campo "Tem um cupom?" antes de pagar. O desconto aparece na hora no resumo.
          </p>
          <p>
            <strong>Tipos:</strong> porcentagem (ex.: 10% nos produtos), valor fixo (ex.: R$ 20
            a menos) ou frete grátis.
          </p>
          <p>
            <strong>O desconto vale sobre os produtos.</strong> Se ela pagar no Pix, os 5% do
            Pix entram depois, em cima do valor já com cupom.
          </p>
          <p>
            <strong>Ideias:</strong> BEMVINDA10 (10% na primeira compra, 1 uso por cliente),
            FRETEGRATIS com compra mínima de R$ 250, BLACK20 valendo só num fim de semana.
          </p>
          <p>
            Você pode pausar um cupom a qualquer momento. Cupom já usado não é apagado, só
            pausado, para você não perder o histórico dos pedidos.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            placeholder="Buscar código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {(["todos", "ativo", "pausado", "agendado", "expirado", "esgotado"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "px-3 py-1.5 text-xs uppercase tracking-[0.15em] " +
              (filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")
            }
          >
            {f === "todos" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : list.length === 0 ? (
        <div className="bg-card p-10 text-center text-sm text-muted-foreground">
          {coupons.length === 0 ? "Nenhum cupom criado ainda." : "Nenhum cupom com esse filtro."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => {
            const st = couponStatus(c);
            return (
              <div key={c.id} className="flex flex-col bg-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xl tracking-widest">{c.code}</p>
                    <p className="mt-1 text-sm">{describeCoupon(c)}</p>
                  </div>
                  <span className={"px-2 py-1 text-[10px] uppercase tracking-[0.15em] " + STATUS_CLASS[st]}>
                    {STATUS_LABEL[st]}
                  </span>
                </div>
                <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                  {c.min_subtotal > 0 && <li>Compra mínima de {formatPrice(c.min_subtotal)}</li>}
                  {(c.starts_at || c.ends_at) && (
                    <li>
                      {c.starts_at ? `De ${new Date(c.starts_at).toLocaleDateString("pt-BR")} ` : ""}
                      {c.ends_at ? `até ${new Date(c.ends_at).toLocaleDateString("pt-BR")}` : "sem data final"}
                    </li>
                  )}
                  {c.max_uses_per_email != null && <li>{c.max_uses_per_email} uso(s) por cliente</li>}
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Usos</p>
                    <p>
                      {c.uses_count}
                      {c.max_uses != null ? ` de ${c.max_uses}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total descontado</p>
                    <p>{formatPrice(c.saved)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                  <IconBtn label="Editar" onClick={() => edit(c)}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn label={c.active ? "Pausar" : "Ativar"} onClick={() => toggle(c)}>
                    {c.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn
                    label="Copiar código"
                    onClick={() => navigator.clipboard.writeText(c.code).then(() => toast.success("Código copiado"))}
                  >
                    <Copy className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Duplicar" onClick={() => edit(c, true)}><CopyPlus className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Excluir" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40" onClick={() => setForm(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl">{form.id ? "Editar cupom" : "Novo cupom"}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setForm(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm">
                Código que a cliente vai digitar
                <div className="flex gap-2">
                  <input
                    className={input + " font-mono uppercase tracking-widest"}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })}
                  />
                  <button
                    type="button"
                    title="Gerar código"
                    onClick={() => setForm({ ...form, code: randomCode() })}
                    className="mt-1 border border-border px-3"
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Só letras e números, sem espaço. Ex.: BEMVINDA10
                </span>
              </label>

              <div className="text-sm">
                Tipo de desconto
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(Object.keys(COUPON_TYPE_LABEL) as CouponType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={
                        "border px-2 py-3 text-xs " +
                        (form.type === t ? "border-primary bg-secondary" : "border-border")
                      }
                    >
                      {COUPON_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              {form.type !== "free_shipping" && (
                <label className="block text-sm">
                  {form.type === "percent" ? "Porcentagem de desconto (%)" : "Valor do desconto (R$)"}
                  <input
                    className={input}
                    inputMode="decimal"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </label>
              )}

              <label className="block text-sm">
                Compra mínima (R$) — opcional
                <input
                  className={input}
                  inputMode="decimal"
                  placeholder="Sem mínimo"
                  value={form.min_subtotal}
                  onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Começa em
                  <input type="date" className={input} value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </label>
                <label className="block text-sm">
                  Termina em
                  <input type="date" className={input} value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </label>
              </div>
              <p className="-mt-3 text-xs text-muted-foreground">Deixe em branco para valer sempre.</p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Limite total de usos
                  <input className={input} inputMode="numeric" placeholder="Sem limite" value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value.replace(/\D/g, "") })} />
                </label>
                <label className="block text-sm">
                  Usos por cliente
                  <input className={input} inputMode="numeric" placeholder="Sem limite" value={form.max_uses_per_email}
                    onChange={(e) => setForm({ ...form, max_uses_per_email: e.target.value.replace(/\D/g, "") })} />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Cupom ligado (as clientes já podem usar)
              </label>

              <div className="bg-secondary p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Exemplo</p>
                <p className="mt-1">
                  {form.type === "free_shipping"
                    ? "A cliente não paga o frete."
                    : `Em uma compra de ${formatPrice(previewBase)}, a cliente paga ${formatPrice(previewBase - previewDisc)} nos produtos.`}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setForm(null)}
                  className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]">
                  Cancelar
                </button>
                <button type="button" disabled={saving} onClick={save}
                  className="flex-1 bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50">
                  {saving ? "Salvando…" : "Salvar cupom"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
      {children}
    </button>
  );
}
