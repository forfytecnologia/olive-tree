# Pagamento com Mercado Pago (configurado pela cliente)

Mesmo modelo do frete: a cliente cola as chaves dela no painel, o site usa e, se
faltar chave, tudo continua funcionando com o pagamento simulado de hoje.

## Como vai funcionar para quem compra

1. A cliente escolhe os óculos, preenche dados e frete.
2. Ao concluir, o pedido é criado como "aguardando pagamento" e ela é levada à
   tela do Mercado Pago (Pix, cartão em até 2x e boleto).
3. Pagando, ela volta para a página do pedido já com o status atualizado.
4. Se desistir ou o pagamento falhar, ela volta para a mesma página com aviso e
   um botão para tentar de novo.
5. O Mercado Pago avisa o site automaticamente quando o pagamento é aprovado,
   mesmo que ela feche o navegador — o pedido muda para "pago" sozinho e aparece
   no painel.

O desconto de 5% no Pix e o parcelamento em 2x sem juros continuam valendo: o
valor enviado ao Mercado Pago já é o total correto conforme a forma escolhida.

## Nova aba "Pagamento" no painel

Campos que a cliente preenche:

- Access Token (a chave secreta da conta dela)
- Public Key (opcional, aparece no painel do Mercado Pago junto do token)
- Chave do aviso automático (webhook) — gerada por ela, para o site confirmar
  que o aviso veio mesmo do Mercado Pago
- Ligar/desligar o pagamento real
- Marcar se é conta de testes
- Endereço que ela deve colar no Mercado Pago (o site mostra pronto para copiar)

E um guia aberto por padrão, em linguagem simples, explicando:

- o que é o Mercado Pago e o que acontece quando ela liga a chave;
- passo a passo para pegar o Access Token (criar conta → "Seu negócio" →
  "Configurações" → "Gestão de credenciais" → copiar credenciais de produção);
- passo a passo para cadastrar o aviso automático (Webhooks → colar o endereço
  mostrado no painel → marcar "Pagamentos" → salvar a chave secreta);
- o que cada campo faz e o que acontece se algo der errado;
- aviso de que sem chave a loja continua no modo simulado.

Também terá um botão "Testar conexão", que consulta a conta no Mercado Pago e
diz em português se a chave está válida.

## SQL para rodar no seu Supabase externo

O plano inclui um arquivo pronto (SQL Editor → colar → executar) criando a
tabela de configuração de pagamento, com acesso só para administradores, e
adicionando ao pedido os campos de referência do pagamento no Mercado Pago.

**Você não precisa criar nenhuma Edge Function.** O aviso automático do Mercado
Pago chega num endereço do próprio site (publicado na Vercel), não no Supabase.

## Detalhes técnicos

- Migração (aplicada aqui e entregue como SQL para o banco externo):
  `public.payment_settings` — linha única (`id boolean primary key default true`),
  colunas `mp_access_token`, `mp_public_key`, `mp_webhook_secret`, `sandbox`,
  `enabled`, `updated_at`; GRANT para `authenticated`/`service_role`, RLS com
  política única `has_role(auth.uid(),'admin')`, trigger `touch_updated_at`.
  Em `orders`: `payment_provider text default ''`, `payment_link text default ''`
  (o token do Mercado Pago nunca chega ao navegador).
- `src/lib/payments.functions.ts` (novo):
  - `createMercadoPagoCheckout` — pública, lê as configurações via
    `supabaseAdmin`, cria uma preferência em
    `POST https://api.mercadopago.com/checkout/preferences` com itens, frete,
    `external_reference` = id do pedido, `back_urls` para `/pedido/$id` e
    `notification_url`; devolve só o link. Se estiver desligado ou falhar,
    devolve `null` e o checkout segue no simulado.
  - `getPaymentConfig` / `savePaymentConfig` / `testPaymentConfig` — admin,
    token mascarado na leitura, igual ao padrão de `shipping.functions.ts`.
- `src/routes/api/public/mercadopago/webhook.ts` (server route): valida a
  assinatura `x-signature` com a chave secreta, consulta o pagamento em
  `GET /v1/payments/{id}`, e só então atualiza o pedido (`pago`, `cancelado` ou
  `estornado`) por `external_reference`, via `supabaseAdmin`.
- `src/lib/payments.ts` mantém a assinatura atual de `createPayment`: tenta o
  Mercado Pago e cai no mock quando não houver chave.
- `src/routes/checkout.tsx`: se vier link, redireciona; senão, fluxo atual.
  `src/routes/pedido.$id.tsx`: trata a volta (`?status=`) e mostra botão
  "Pagar agora" enquanto estiver aguardando.
- `src/routes/_authenticated/admin.envio.tsx` como molde para
  `admin.pagamento.tsx`; novo item "Pagamento" no menu do painel.
- Variável extra na Vercel: nenhuma — as chaves ficam no banco.
