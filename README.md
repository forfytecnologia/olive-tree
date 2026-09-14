# IZOTON Digital Showcase

# Prompt: Catálogo Digital + Painel Administrativo — IZOTON

Copie e cole o prompt abaixo (em uma ferramenta de geração de código, ex: Claude, Lovable, v0, Bolt, etc.) para gerar o catálogo. Ajuste os pontos marcados com [ ] antes de enviar.

---

## PROMPT

Quero criar um catálogo digital de roupas masculinas para a marca **IZOTON** (Instagram: @izotonoficial), com um painel administrativo simples para gerenciar os produtos. Não é uma loja com carrinho/checkout completo — a venda final acontece via WhatsApp (modelo "vitrine digital").

### 1. Identidade visual (seguir rigorosamente)
- **Cores**: fundo verde-oliva escuro (#2B2E1E aproximado) como cor primária de destaque; creme/dourado claro (#DCCFA0 aproximado) como cor secundária/texto sobre fundo escuro; branco para fundo de conteúdo/catálogo.
- **Logo**: símbolo de pássaro/beija-flor estilizado (fornecerei os arquivos), sempre com respiro ao redor.
- **Tipografia**: fonte sem serifa, minimalista, espaçamento entre letras levemente aumentado no wordmark (estilo "IZOTON").
- **Tom de marca**: "Praia chique. Urbano minimalista. A leveza também é poder. Natural. Atemporal."
- **Sensação geral**: sofisticado, clean, "menos é mais" — bastante espaço em branco, fotos de produto em destaque, nada poluído.

### 2. Estrutura do catálogo (parte pública)
- **Home**: banner/hero com o logo e a frase de posicionamento da marca, seguido de vitrine de produtos em destaque/lançamentos.
- **Listagem de produtos**: grid de cards (foto, nome, preço, categoria), com filtros por:
  - Categoria (ex: camisas, camisetas, bermudas, calças, acessórios)
  - Tamanho (P, M, G, GG)
  - Cor
  - Faixa de preço
- **Página de produto individual**: galeria de fotos (múltiplas imagens, zoom), descrição, tabela de tamanhos, seletor de cor/tamanho, e um botão destacado **"Comprar via WhatsApp"** que abre o WhatsApp já com uma mensagem pré-preenchida contendo o nome do produto, tamanho e cor escolhidos (usar link wa.me com o número da loja).
- **Busca** por nome/categoria.
- **Página "Sobre"** com a identidade da marca (texto de posicionamento).
- Design 100% responsivo, mobile-first (a maior parte do tráfego deve vir do Instagram/WhatsApp no celular).

### 3. Painel administrativo (área logada, separada do catálogo público)
- **Login** simples (usuário/senha, sem necessidade de sistema de permissões complexo por enquanto).
- **CRUD de produtos**: criar, editar, excluir e ativar/desativar produtos, com campos:
  - Nome, descrição, categoria, preço
  - Tamanhos disponíveis (com controle de estoque por tamanho, se possível)
  - Cores disponíveis
  - Upload de múltiplas fotos por produto
  - Status: ativo / esgotado / rascunho
- **CRUD de categorias** (criar/editar/reordenar categorias exibidas no catálogo).
- **Dashboard simples**: total de produtos ativos, produtos com estoque baixo/zerado, produtos mais visualizados (se houver tracking).
- **Configurações da loja**: número de WhatsApp de vendas, textos institucionais (Sobre, mensagem de boas-vindas), links de redes sociais.

### 4. Requisitos técnicos
- [Preencher: stack preferida, ex: "Next.js + Tailwind + Supabase" ou deixar em aberto para a ferramenta escolher a stack mais adequada]
- Banco de dados para persistir produtos, categorias e imagens.
- Upload/armazenamento de imagens (ex: Supabase Storage, Cloudinary, ou similar).
- Painel admin protegido por autenticação, inacessível ao público.
- Performance: imagens otimizadas/lazy-load, já que o catálogo depende fortemente de fotos.

### 5. Fora de escopo (não incluir)
- Carrinho de compras e checkout com pagamento integrado.
- Cadastro de conta para o cliente final (o cliente não precisa logar, só navegar e clicar em "comprar via WhatsApp").
- Integração com gateways de pagamento.

---

## O que ajustar antes de usar
- [ ] Número de WhatsApp de vendas (para o botão "Comprar via WhatsApp")
- [ ] Stack técnica desejada (ou deixar em aberto)
- [ ] Se quer multi-idioma, multi-moeda, ou só PT-BR/R$
- [ ] Se quer controle de estoque de verdade ou só "disponível/esgotado"

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://izoton.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8dac05bc-23e5-4c59-ac07-cf333f310ec6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
