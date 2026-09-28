# Cupons de desconto

## O que a cliente vai ter

**Nova aba "Cupons" no painel**
- Lista de cupons em cartões: código grande, tipo de desconto, situação (Ativo, Pausado, Expirado, Esgotado), quantas vezes foi usado e total descontado.
- Busca por código e filtro por situação.
- Botão "Novo cupom" abre um formulário lateral simples:
  - Código (com botão "Gerar código" automático, sempre em maiúsculas, sem espaços)
  - Tipo: porcentagem (ex.: 10%) ou valor fixo (ex.: R$ 20,00) ou frete grátis
  - Valor do desconto
  - Compra mínima (opcional)
  - Validade: data de início e de fim (opcionais)
  - Limite total de usos (opcional) e limite por cliente/e-mail (opcional)
  - Ligar/pausar
  - Pré-visualização ao vivo: "Em uma compra de R$ 200,00, a cliente paga R$ 180,00"
- Ações em cada cupom: editar, pausar/ativar, copiar código, duplicar, excluir (com confirmação; cupom já usado é só pausado, para não perder o histórico).
- Guia curto aberto na primeira vez, em linguagem simples ("o que é um cupom, como divulgar, exemplos prontos").
- No detalhe de cada pedido aparece o cupom usado e o valor descontado.
- No Painel inicial: card "Cupons mais usados".

**Na loja (checkout)**
- Campo "Tem um cupom?" no resumo do pedido, com botão Aplicar.
- Mensagens claras: "Cupom aplicado: -R$ 20,00", "Este cupom expirou", "Compra mínima de R$ 150,00", "Cupom esgotado", etc.
- Linha do desconto no resumo, no pedido confirmado e na página de acompanhamento.
- Botão para remover o cupom.

## Regras de cálculo
- Cupom vale sobre o valor dos produtos (subtotal).
- Ordem: subtotal → desconto do cupom → 5% do Pix sobre o valor já com cupom → frete (ou frete grátis se o cupom for desse tipo).
- Desconto nunca deixa o total dos produtos abaixo de zero.
- Um cupom por pedido.
- Tudo é conferido de novo no servidor na hora de criar o pedido — a tela não consegue forçar um desconto.
- Mercado Pago e InfinitePay recebem o total já com o cupom.

## Seu banco externo
Vou entregar o SQL pronto para colar no SQL Editor (tabela de cupons + duas colunas novas nos pedidos). Nenhuma Edge Function é necessária.

## Detalhes técnicos
- Migração: tabela `public.coupons` (id, code unique case-insensitive, type `percent|fixed|free_shipping`, value numeric, min_subtotal, starts_at, ends_at, max_uses, max_uses_per_email, active, uses_count, created_at, updated_at + trigger touch). GRANT authenticated/service_role; RLS só admin (has_role). Sem leitura pública — validação via servidor.
- `orders`: `coupon_code text default ''`, `discount_amount numeric default 0`.
- `src/lib/coupons.functions.ts`: `validateCoupon` (público, supabaseAdmin, recebe code+subtotal+email, devolve desconto ou mensagem amigável); `listCoupons/saveCoupon/deleteCoupon` com requireSupabaseAuth + checagem admin; stats de uso agregadas de `orders`.
- `src/lib/pricing.ts`: função única `computeTotals({subtotal, coupon, method, shipping})` usada por checkout, servidor e gateways.
- `createOrderOnServer`: revalida cupom, grava coupon_code/discount_amount, incrementa uses_count de forma atômica (update ... where uses_count < max_uses).
- `payments.functions.ts`: MP envia desconto do cupom como item negativo junto do Pix; InfinitePay já usa o total.
- Nova rota `src/routes/_authenticated/admin.cupons.tsx` + item no menu; ajustes em checkout.tsx, pedido.$id.tsx, admin.pedidos.$id.tsx, admin.index.tsx.
- Ícones Lucide, sem emojis; cores só pelos tokens da paleta.
- Verificação: Playwright criando cupom no painel, aplicando no checkout (percentual, fixo, frete grátis, expirado, mínimo), pedido gravado com desconto correto.
