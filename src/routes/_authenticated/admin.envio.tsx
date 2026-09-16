import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getShippingConfig,
  saveShippingConfig,
  testShippingConfig,
  type LiveQuote,
} from "@/lib/shipping.functions";
import { formatPrice } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/envio")({
  component: EnvioAdmin,
  head: () => ({
    meta: [{ title: "Envio · Painel Olive Tree" }],
  }),
});

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function EnvioAdmin() {
  const load = useServerFn(getShippingConfig);
  const save = useServerFn(saveShippingConfig);
  const test = useServerFn(testShippingConfig);

  const { data, refetch } = useQuery({ queryKey: ["shipping-config"], queryFn: () => load() });

  const [token, setToken] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [insurance, setInsurance] = useState(true);
  const [origin, setOrigin] = useState("94931130");
  const [box, setBox] = useState({ length: 20, width: 12, height: 8, weight: 0.35 });
  const [saving, setSaving] = useState(false);
  const [testZip, setTestZip] = useState("01310100");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<LiveQuote[] | null>(null);

  useEffect(() => {
    if (!data) return;
    setSandbox(data.sandbox);
    setEnabled(data.enabled);
    setInsurance(data.insurance_enabled);
    setOrigin(data.origin_zip);
    setBox({
      length: data.box_length,
      width: data.box_width,
      height: data.box_height,
      weight: data.box_weight,
    });
  }, [data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (origin.replace(/\D/g, "").length !== 8) {
      toast.error("Informe um CEP de origem válido.");
      return;
    }
    if (enabled && !data?.hasToken && !token.trim()) {
      toast.error("Cole o token do Melhor Envio antes de ligar o cálculo automático.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          token: token.trim() || undefined,
          sandbox,
          origin_zip: origin,
          box_length: Number(box.length),
          box_width: Number(box.width),
          box_height: Number(box.height),
          box_weight: Number(box.weight),
          insurance_enabled: insurance,
          enabled,
        },
      });
      setToken("");
      await refetch();
      toast.success("Configuração de envio salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setResult(null);
    try {
      const res = await test({ data: { zip: testZip } });
      if (res.error) toast.error(res.error);
      setResult(res.options);
      if (res.options.length) toast.success("Conexão com o Melhor Envio funcionando.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no teste.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl">Envio · Melhor Envio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cole aqui o token da sua conta Melhor Envio para o site calcular o frete real
          (Correios, Jadlog e outras) no checkout. Sem token, o site usa uma estimativa
          própria. O token fica guardado com segurança e não aparece nesta tela depois de
          salvo.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <div className="space-y-5 bg-card p-6">
          <label className="block">
            <span className="eyebrow">
              Token do Melhor Envio {data?.hasToken ? `(salvo: ${data.tokenPreview})` : ""}
            </span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputClass + " mt-2"}
              placeholder={data?.hasToken ? "Deixe em branco para manter o atual" : "Cole o token aqui"}
              autoComplete="off"
            />
            <span className="mt-2 block text-xs text-muted-foreground">
              No site do Melhor Envio: Configurações → Tokens → gerar token com a permissão
              de cálculo de frete (shipping-calculate).
            </span>
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Usar cálculo automático no checkout
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => setSandbox(e.target.checked)}
            />
            Conta de testes (sandbox)
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={insurance}
              onChange={(e) => setInsurance(e.target.checked)}
            />
            Declarar valor da encomenda (seguro)
          </label>
        </div>

        <div className="space-y-5 bg-card p-6">
          <label className="block">
            <span className="eyebrow">CEP de origem (de onde os pedidos saem)</span>
            <input
              value={origin}
              maxLength={9}
              onChange={(e) => setOrigin(e.target.value)}
              className={inputClass + " mt-2"}
            />
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["length", "Comprimento (cm)"],
                ["width", "Largura (cm)"],
                ["height", "Altura (cm)"],
                ["weight", "Peso (kg)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="eyebrow">{label}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={box[key]}
                  onChange={(e) => setBox((b) => ({ ...b, [key]: Number(e.target.value) }))}
                  className={inputClass + " mt-2"}
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <div className="space-y-4 bg-card p-6">
        <h2 className="text-lg">Testar conexão</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="eyebrow">CEP de destino</span>
            <input
              value={testZip}
              maxLength={9}
              onChange={(e) => setTestZip(e.target.value)}
              className={inputClass + " mt-2"}
            />
          </label>
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="border border-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary disabled:opacity-60"
          >
            {testing ? "Consultando…" : "Testar"}
          </button>
        </div>

        {result && result.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {result.map((o) => (
              <li key={o.id} className="flex justify-between py-2">
                <span>
                  {o.carrier} · {o.service}
                  {o.days ? ` · ${o.days} dia(s)` : ""}
                </span>
                <span>{formatPrice(o.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
