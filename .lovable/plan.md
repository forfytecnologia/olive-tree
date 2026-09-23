# Atualizar os endereços da InfinitePay

A InfinitePay mudou os endereços usados pela loja para criar o link de pagamento e para conferir se o pagamento foi feito. Enquanto os antigos não forem trocados, a InfinitePay segue enviando o alerta diário e, no futuro, os endereços antigos deixam de funcionar.

## O que muda

| Uso | Antes | Agora |
| --- | --- | --- |
| Criar o link de pagamento | api.infinitepay.io/invoices/public/checkout/links | api.checkout.infinitepay.io/links |
| Conferir se o pedido foi pago | api.infinitepay.io/invoices/public/checkout/payment_check | api.checkout.infinitepay.io/payment_check |

Nada mais muda: os dados enviados continuam iguais, o aviso automático continua igual, e nenhuma configuração do painel precisa ser refeita.

## Alterações técnicas

- `src/lib/payments.functions.ts`: trocar a constante `IP_API` por `https://api.checkout.infinitepay.io` e ajustar os três pontos de chamada para os novos caminhos `/links` e `/payment_check` — em `createGatewayCheckout`, em `testPaymentConfig` e em `confirmInfinitePayPayment`.
- Manter o tratamento de erro atual (link indisponível volta ao modo simulado, eventos registrados na aba Diagnóstico).

## Verificação

- Build e typecheck.
- Chamada real de teste ao novo endereço de criação de link com o usuário configurado, confirmando que a resposta volta com um link válido (ou, sem usuário configurado, que o erro tratado aparece corretamente).
- Conferir a aba Pagamento no painel: botão "Testar conexão" respondendo pelo novo endereço.
