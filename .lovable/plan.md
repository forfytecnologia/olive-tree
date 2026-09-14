# Olive Tree — catálogo com compra pela própria cliente

Transformar o catálogo atual (marca IZOTON, venda por WhatsApp) em uma loja Olive Tree onde a cliente escolhe, calcula frete e finaliza a compra sozinha. Frete e pagamento ficam simulados agora, com o código já separado para plugar Melhor Envio e Mercado Pago depois.

## 1. Identidade Olive Tree

- Paleta obrigatória: vinho `#4f1a27` (cor principal), verde-sálvia `#aeb7a6` (apoio/detalhes), areia `#eee9e0` (fundo). Branco para respiro.
- Logos enviados viram arquivos da marca: o "O" vinho como ícone/favicon, o "O" areia e o branco para fundos escuros, a assinatura horizontal "OLIVE TREE Acessórios" no topo e no rodapé (versão areia sobre vinho, versão preta sobre claro).
- Tipografia leve e espaçada, no espírito do logo: títulos em serifada fina, textos em sans discreto.
- Todos os textos "Izoton" trocados por "Olive Tree".

## 2. Compra sem WhatsApp

- **Sacola**: botão "Adicionar à sacola" no produto (com tamanho/cor), ícone de sacola no topo com contador, painel lateral com itens, quantidades e subtotal. A sacola fica salva no navegador.
- **Checkout em etapas**, numa página só:
  1. Dados da cliente (nome, e-mail, telefone, CPF)
  2. Endereço por CEP (busca automática) + escolha do frete
  3. Pagamento
  4. Confirmação com número do pedido
- **Frete (simulado)**: lista opções tipo PAC / SEDEX / Mini Envios com preço e prazo, calculados por faixa de CEP e peso estimado. Um único arquivo concentra essa lógica para depois virar chamada real ao Melhor Envio.
- **Pagamento (simulado)**: Pix (mostra chave e QR falso), cartão e boleto. Ao confirmar, o pedido nasce como "aguardando pagamento" e um botão de teste marca como pago. Também isolado num arquivo só, para trocar por Mercado Pago.
- O WhatsApp continua existindo, mas como "dúvidas", não como forma de comprar.

## 3. Provador virtual embutido

- Nova página `/provador` que carrega o provador da cliente (`provoulevou.com.br/catalogo/?loja=olivetree`) dentro da própria página, em tela cheia, com o cabeçalho Olive Tree em volta — é o "iframe" (site dentro do site).
- Link "Provador virtual" no menu e um atalho na página de produto.
- Aviso curto caso o provador não carregue, com link para abrir em nova aba.

## 4. Pedidos no admin

- Nova aba "Pedidos" na área administrativa: lista com cliente, valor, status de pagamento e envio, e tela de detalhe com itens, endereço, frete escolhido e histórico. Permite mudar status e registrar código de rastreio.

## Detalhes técnicos

- Backend: continua no Supabase já ligado ao projeto (tudo que hoje existe segue funcionando). Novas tabelas `orders` e `order_items` com RLS: inserção pública para o checkout, leitura/edição apenas para admin; GRANTs explícitos.
- Adaptadores isolados: `src/lib/shipping.ts` (interface `quote(cep, items)`) e `src/lib/payments.ts` (interface `createPayment(order)`), ambos com implementação mock exportada por trás da mesma assinatura — trocar por Melhor Envio/Mercado Pago depois será substituir só a implementação, chamada de um server function.
- Sacola em `localStorage` via contexto React; totais recalculados sempre a partir do preço vindo do banco.
- Tokens de cor reescritos em `src/styles.css` em oklch a partir dos três hex da paleta; nada de cor fixa nos componentes.
- Logos enviados publicados como assets de CDN e importados; favicon trocado pelo "O" vinho.
- Cada rota nova (`/provador`, `/sacola`, `/checkout`, `/pedido/$id`) com título e descrição próprios.
