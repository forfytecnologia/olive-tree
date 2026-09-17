import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getPaymentConfig,
  savePaymentConfig,
  testPaymentConfig,
  type PaymentProvider,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/pagamento")({
  component: PagamentoAdmin,
  head: () => ({
    meta: [{ title: "Pagamento · Painel Olive Tree" }],
  }),
});

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function PagamentoAdmin() {
  const load = useServerFn(getPaymentConfig);
  const save = useServerFn(savePaymentConfig);
  const test = useServerFn(testPaymentConfig);

  const { data, refetch } = useQuery({ queryKey: ["payment-config"], queryFn: () => load() });

  const [provider, setProvider] = useState<PaymentProvider>("mercadopago");
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [handle, setHandle] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setProvider(data.provider);
    setPublicKey(data.publicKey);
    setHandle(data.infinitepayHandle);
    setSandbox(data.sandbox);
    setEnabled(data.enabled);
  }, [data]);

  const isMP = provider === "mercadopago";
  const configured = isMP ? Boolean(data?.hasToken) : Boolean(data?.infinitepayHandle);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (enabled && isMP && !data?.hasToken && !accessToken.trim()) {
      toast.error("Cole a chave de acesso do Mercado Pago antes de ligar o pagamento.");
      return;
    }
    if (enabled && !isMP && !handle.trim()) {
      toast.error("Informe o seu usuário da InfinitePay antes de ligar o pagamento.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          provider,
          access_token: accessToken.trim() || undefined,
          public_key: publicKey.trim(),
          webhook_secret: webhookSecret.trim() || undefined,
          infinitepay_handle: handle.trim(),
          sandbox,
          enabled,
        },
      });
      setAccessToken("");
      setWebhookSecret("");
      await refetch();
      toast.success("Configuração de pagamento salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const res = await test();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no teste.");
    } finally {
      setTesting(false);
    }
  }

  async function copyWebhook() {
    if (!data?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(data.webhookUrl);
      toast.success("Endereço copiado.");
    } catch {
      toast.error("Copie o endereço manualmente.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl">Pagamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aqui você liga o pagamento de verdade da loja. Escolha por onde quer receber: Mercado
          Pago ou InfinitePay. Enquanto nada estiver configurado, a loja continua no modo
          simulado (nada é cobrado da cliente).
        </p>
      </div>

      <div className="space-y-4 bg-card p-6">
        <p className="eyebrow">Por onde quero receber</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setProvider("mercadopago")}
            className={
              "border p-4 text-left text-sm " +
              (isMP ? "border-primary bg-secondary/60" : "border-border")
            }
          >
            <span className="block">Mercado Pago</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Pix, cartão em até 2x e boleto. O pedido vira “pago” sozinho, sem você conferir
              nada. Recomendado.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setProvider("infinitepay")}
            className={
              "border p-4 text-left text-sm " +
              (!isMP ? "border-primary bg-secondary/60" : "border-border")
            }
          >
            <span className="block">InfinitePay</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Pix e cartão pelo link de pagamento da sua maquininha. Só precisa do seu usuário —
              não tem senha nem chave para copiar.
            </span>
          </button>
        </div>
      </div>

      {isMP ? (
        <details className="bg-secondary/60 p-6 text-sm" open={!configured}>
          <summary className="cursor-pointer text-base">
            Mercado Pago — como funciona e como pegar as minhas chaves
          </summary>

          <div className="mt-5 space-y-5 text-muted-foreground">
            <div>
              <p className="text-foreground">Como funciona, em palavras simples</p>
              <p className="mt-1">
                O Mercado Pago é quem recebe o dinheiro das suas vendas. Quando a cliente clica
                em “Concluir pedido”, ela é levada para a tela do Mercado Pago, escolhe como
                pagar e volta para a página do pedido. Assim que o pagamento é aprovado, o
                Mercado Pago avisa o site automaticamente e o pedido muda para “pago” aqui no
                painel — mesmo que a cliente feche o navegador. Criar a conta é gratuito; o
                Mercado Pago cobra uma taxa por venda.
              </p>
            </div>

            <div>
              <p className="text-foreground">Passo 1 — pegar a chave de acesso</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Acesse <span className="text-foreground">mercadopago.com.br</span> e entre na
                  conta da loja (ou crie uma).
                </li>
                <li>
                  Vá em <span className="text-foreground">Seu negócio</span> →{" "}
                  <span className="text-foreground">Configurações</span> →{" "}
                  <span className="text-foreground">Gestão de credenciais</span>.
                </li>
                <li>
                  Escolha <span className="text-foreground">Credenciais de produção</span> (é o
                  modo que recebe dinheiro de verdade). Se quiser apenas testar antes, use as
                  credenciais de teste e marque a opção “Conta de testes” aqui embaixo.
                </li>
                <li>
                  Copie o <span className="text-foreground">Access Token</span> e cole no campo
                  “Chave de acesso”. Copie também a{" "}
                  <span className="text-foreground">Public Key</span> e cole no campo ao lado
                  (opcional).
                </li>
                <li>
                  Marque{" "}
                  <span className="text-foreground">Receber pagamentos de verdade</span> e clique
                  em Salvar.
                </li>
              </ol>
            </div>

            <div>
              <p className="text-foreground">Passo 2 — avisar o site quando o pagamento cair</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>
                  Ainda na mesma tela de credenciais, procure por{" "}
                  <span className="text-foreground">Webhooks</span> (ou “Notificações”) e clique
                  em configurar.
                </li>
                <li>
                  Cole o endereço que aparece aqui embaixo, no campo{" "}
                  <span className="text-foreground">Endereço do aviso automático</span> (use o
                  botão Copiar).
                </li>
                <li>
                  Marque o evento <span className="text-foreground">Pagamentos</span> e salve.
                </li>
                <li>
                  O Mercado Pago vai mostrar uma{" "}
                  <span className="text-foreground">chave secreta</span>. Copie e cole no campo
                  “Chave do aviso automático” aqui, e salve de novo.
                </li>
              </ol>
            </div>

            <div>
              <p className="text-foreground">O que cada campo significa</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <span className="text-foreground">Chave de acesso</span>: a senha da sua conta
                  para o site cobrar em seu nome. Fica guardada em segurança e nunca aparece de
                  novo na tela — só os últimos dígitos.
                </li>
                <li>
                  <span className="text-foreground">Public Key</span>: um código público da sua
                  conta. Não é segredo e é opcional.
                </li>
                <li>
                  <span className="text-foreground">Chave do aviso automático</span>: serve para
                  o site ter certeza de que o aviso de pagamento veio mesmo do Mercado Pago.
                </li>
                <li>
                  <span className="text-foreground">Conta de testes</span>: use só se colou as
                  credenciais de teste. Nesse modo nenhum dinheiro é movimentado.
                </li>
              </ul>
            </div>

            <div>
              <p className="text-foreground">Se algo falhar</p>
              <p className="mt-1">
                A loja nunca trava: se o Mercado Pago estiver fora do ar ou a chave estiver
                errada, o pedido continua sendo registrado e a cliente vê o pagamento simulado,
                como hoje. Você consegue acompanhar tudo em Pedidos e marcar manualmente como
                pago se precisar.
              </p>
            </div>
          </div>
        </details>
      ) : (
        <details className="bg-secondary/60 p-6 text-sm" open={!configured}>
          <summary className="cursor-pointer text-base">
            InfinitePay — como funciona e onde achar o meu usuário
          </summary>

          <div className="mt-5 space-y-5 text-muted-foreground">
            <div>
              <p className="text-foreground">Como funciona, em palavras simples</p>
              <p className="mt-1">
                A InfinitePay é a mesma conta da sua maquininha. Quando a cliente clica em
                “Concluir pedido”, o site cria um link de pagamento InfinitePay com o valor
                exato do pedido e leva a cliente para lá. Ela paga por Pix ou cartão e volta para
                a página do pedido; o site confere com a InfinitePay se o pagamento entrou e
                marca o pedido como “pago”. O dinheiro cai direto na sua conta InfinitePay.
              </p>
            </div>

            <div>
              <p className="text-foreground">Passo a passo</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Abra o aplicativo da InfinitePay e entre na conta da loja.</li>
                <li>
                  Procure por <span className="text-foreground">Link de pagamento</span> ou{" "}
                  <span className="text-foreground">Minha loja</span>. Ali aparece o seu usuário,
                  no formato <span className="text-foreground">$suaLoja</span>.
                </li>
                <li>
                  Escreva esse usuário no campo abaixo (pode colar com ou sem o cifrão).
                </li>
                <li>
                  Clique em <span className="text-foreground">Testar</span> para conferir se a
                  InfinitePay reconhece a sua conta.
                </li>
                <li>
                  Marque <span className="text-foreground">Receber pagamentos de verdade</span> e
                  clique em Salvar.
                </li>
              </ol>
            </div>

            <div>
              <p className="text-foreground">Diferença importante para o Mercado Pago</p>
              <p className="mt-1">
                A InfinitePay não envia aviso automático de pagamento. O site confere o pagamento
                quando a cliente volta da tela de pagamento — o que funciona na maioria das
                vezes. Se ela fechar o navegador antes de voltar, o pedido pode ficar como
                “aguardando pagamento”: nesse caso confira no aplicativo da InfinitePay e marque
                o pedido como pago na tela de Pedidos.
              </p>
            </div>

            <div>
              <p className="text-foreground">Se algo falhar</p>
              <p className="mt-1">
                A loja nunca trava: se a InfinitePay estiver fora do ar ou o usuário estiver
                errado, o pedido continua sendo registrado e a cliente vê o pagamento simulado.
              </p>
            </div>
          </div>
        </details>
      )}

      <form onSubmit={onSave} className="space-y-6">
        {isMP ? (
          <div className="space-y-5 bg-card p-6">
            <label className="block">
              <span className="eyebrow">
                Chave de acesso (Access Token){" "}
                {data?.hasToken ? `(salva: ${data.tokenPreview})` : ""}
              </span>
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className={inputClass + " mt-2"}
                placeholder={
                  data?.hasToken ? "Deixe em branco para manter a atual" : "Cole a chave aqui"
                }
                autoComplete="off"
              />
              <span className="mt-2 block text-xs text-muted-foreground">
                No Mercado Pago: Seu negócio → Configurações → Gestão de credenciais. Veja o
                passo a passo completo acima.
              </span>
            </label>

            <label className="block">
              <span className="eyebrow">Public Key (opcional)</span>
              <input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className={inputClass + " mt-2"}
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className="eyebrow">
                Chave do aviso automático {data?.hasWebhookSecret ? "(salva)" : ""}
              </span>
              <input
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className={inputClass + " mt-2"}
                placeholder={
                  data?.hasWebhookSecret
                    ? "Deixe em branco para manter a atual"
                    : "Cole a chave secreta do webhook"
                }
                autoComplete="off"
              />
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={sandbox}
                onChange={(e) => setSandbox(e.target.checked)}
              />
              Conta de testes (credenciais de teste)
            </label>
          </div>
        ) : (
          <div className="space-y-5 bg-card p-6">
            <label className="block">
              <span className="eyebrow">Meu usuário na InfinitePay</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className={inputClass + " mt-2"}
                placeholder="$minhaloja"
                autoComplete="off"
              />
              <span className="mt-2 block text-xs text-muted-foreground">
                É o nome que aparece no seu link de pagamento da InfinitePay, como
                “$olivetree”. Não é senha e não tem problema ficar visível.
              </span>
            </label>
          </div>
        )}

        <div className="space-y-5 bg-card p-6">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Receber pagamentos de verdade ({isMP ? "Mercado Pago" : "InfinitePay"})
          </label>
          <p className="text-xs text-muted-foreground">
            Desligado, a loja segue no modo simulado: o pedido é registrado, mas nada é cobrado.
          </p>
        </div>

        {isMP && (
          <div className="space-y-3 bg-card p-6">
            <p className="eyebrow">Endereço do aviso automático (webhook)</p>
            <p className="break-all border border-dashed border-border p-3 text-xs">
              {data?.webhookUrl || "—"}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyWebhook}
                className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]"
              >
                Copiar endereço
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole esse endereço no Mercado Pago, em Webhooks, marcando o evento “Pagamentos”.
              Use o endereço do site publicado (o do seu domínio), não o da prévia.
            </p>
          </div>
        )}

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
        <p className="text-sm text-muted-foreground">
          Confere se o que você salvou conversa com a sua conta
          {isMP ? " do Mercado Pago" : " da InfinitePay"}.
        </p>
        <button
          type="button"
          onClick={onTest}
          disabled={testing}
          className="border border-primary px-6 py-3 text-xs uppercase tracking-[0.25em] text-primary disabled:opacity-60"
        >
          {testing ? "Consultando…" : "Testar"}
        </button>
      </div>
    </div>
  );
}
