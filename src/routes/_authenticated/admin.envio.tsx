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
          Aqui você liga o cálculo de frete automático da loja. Depois de configurado, a
          cliente digita o CEP dela no checkout e o site já mostra o preço e o prazo reais
          de Correios, Jadlog e outras transportadoras.
        </p>
      </div>

      <details className="bg-secondary/60 p-6 text-sm" open={!data?.hasToken}>
        <summary className="cursor-pointer text-base">
          Como funciona e como pegar o meu token (passo a passo)
        </summary>

        <div className="mt-5 space-y-5 text-muted-foreground">
          <div>
            <p className="text-foreground">Como funciona, em palavras simples</p>
            <p className="mt-1">
              O Melhor Envio é um site que junta várias transportadoras e consulta o preço
              do envio para você. O “token” é como uma chave da sua conta lá: ao colar essa
              chave aqui, nossa loja passa a perguntar o preço em nome da sua conta e
              mostrar o valor certinho para a cliente, já com o desconto do Melhor Envio.
              Criar a conta e consultar preços é gratuito — você só paga quando comprar uma
              etiqueta de envio.
            </p>
          </div>

          <div>
            <p className="text-foreground">Passo a passo para pegar o token</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Acesse <span className="text-foreground">melhorenvio.com.br</span> e crie a
                sua conta (ou entre, se já tiver).
              </li>
              <li>Complete o cadastro com seus dados e o endereço de onde saem os envios.</li>
              <li>
                No menu do seu nome (canto superior direito), clique em{" "}
                <span className="text-foreground">Gerenciar</span> →{" "}
                <span className="text-foreground">Tokens</span>.
              </li>
              <li>
                Clique em <span className="text-foreground">Criar token</span>, dê um nome
                (por exemplo “Site Olive Tree”) e marque a permissão de{" "}
                <span className="text-foreground">cálculo de frete</span>{" "}
                (shipping-calculate).
              </li>
              <li>
                Copie o código que aparecer. Ele é mostrado uma única vez — se perder, é só
                criar outro.
              </li>
              <li>
                Volte aqui, cole no campo <span className="text-foreground">Token</span>,
                confira o CEP de origem, marque{" "}
                <span className="text-foreground">Usar cálculo automático</span> e clique em
                Salvar.
              </li>
              <li>
                Por último, use o <span className="text-foreground">Testar conexão</span> lá
                embaixo com qualquer CEP. Se aparecer uma lista de preços, está tudo certo.
              </li>
            </ol>
          </div>

          <div>
            <p className="text-foreground">O que cada campo significa</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <span className="text-foreground">Token</span>: a chave da sua conta. Fica
                guardada em segurança e nunca aparece de novo na tela — só os últimos
                dígitos, para você reconhecer.
              </li>
              <li>
                <span className="text-foreground">Usar cálculo automático</span>: ligado, o
                checkout mostra os preços reais. Desligado, mostra a nossa estimativa.
              </li>
              <li>
                <span className="text-foreground">Conta de testes (sandbox)</span>: deixe
                desmarcado. Só serve se você criou o token no ambiente de testes do Melhor
                Envio.
              </li>
              <li>
                <span className="text-foreground">Declarar valor da encomenda</span>: informa
                o valor dos óculos para o seguro. Protege em caso de extravio e encarece um
                pouco o frete.
              </li>
              <li>
                <span className="text-foreground">CEP de origem</span>: de onde as
                encomendas saem (o seu endereço de postagem).
              </li>
              <li>
                <span className="text-foreground">Caixa padrão</span>: tamanho e peso da
                embalagem que você usa. O peso é multiplicado pela quantidade de óculos do
                pedido.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-foreground">Se algo falhar</p>
            <p className="mt-1">
              A loja nunca fica sem frete: se o Melhor Envio estiver fora do ar ou o token
              estiver errado, o checkout volta sozinho para a nossa estimativa e a cliente
              consegue finalizar a compra do mesmo jeito. A regra de frete grátis acima de
              R$ 350 continua valendo e é aplicada na opção mais barata.
            </p>
          </div>
        </div>
      </details>

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
