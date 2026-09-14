# Catálogo Olive Tree: produtos de exemplo e banners da marca

Hoje o site está vazio (nenhum produto ou categoria no banco) e as fotos que sobraram são de roupa masculina (camisa de linho, bermuda, calça, boné). Vamos trocar tudo por óculos de sol e por imagens com a cara da Olive Tree.

## 1. Banner principal e imagens de apoio

- Novo banner da home: foto em clima editorial, luz natural quente, fundo areia/creme com folhagem de oliveira desfocada, modelo feminina usando óculos de sol — espaço à esquerda para a frase "Mais do que acessórios, identidade." e o botão "Ver catálogo".
- Segundo banner (faixa "A marca"): detalhe em close dos óculos sobre linho areia com ramo de oliveira, tons vinho e sálvia.
- Banner do catálogo: faixa horizontal discreta com o "O" da marca e fundo areia.
- As fotos antigas de roupa masculina saem do projeto.

## 2. Produtos de exemplo (10 modelos)

Seguindo os nomes e preços do provador virtual dela, para o site e o provador conversarem:

| Modelo | Preço | Formato |
| --- | --- | --- |
| CO 0001 · Noemi | R$ 189,90 | Hexagonal |
| CO 0002 · Quetura | R$ 159,90 | Oval |
| CO 0003 · Rebeca | R$ 139,90 | Oval |
| CO 0004 · Raquel | R$ 159,90 | Geométrico |
| CO 0005 · Milca | R$ 189,90 | Aviador |
| CO 0006 · Eva | R$ 159,90 | Retangular |
| CO 0007 · Agar | R$ 139,90 | Gatinho |
| CO 0008 · Lia | R$ 189,90 | Quadrado |
| CO 0009 · Tamar | R$ 139,90 | Aviador |
| CO 0010 · Ada | R$ 189,90 | Hexagonal |

- Cada produto ganha: 2 fotos (frente em fundo creme e uma de contexto), descrição curta no tom da marca, cores disponíveis (preto, tartaruga, dourado, âmbar, cristal conforme o modelo), estoque e "tamanho" como largura da armação (P/M — a tabela de roupa já saiu da página).
- Categorias: Aviador, Oval, Gatinho, Geométrico, Retangular.
- 4 modelos marcados como destaque para preencher a seção "Seleção da estação".
- Tudo isso entra como dados de exemplo, fácil de apagar quando ela cadastrar os produtos reais.

## Detalhes técnicos

- Imagens geradas por IA (banner + 20 fotos de produto), publicadas como assets de CDN via `lovable-assets`; os arquivos antigos em `public/images/` (camisa-linho, camiseta, bermuda, calça, bucket-hat, hero) são removidos.
- Fallback `"/images/hero.jpg"` em `src/lib/catalog.ts` e `produto.$slug.tsx` passa a apontar para o novo asset.
- Seed por migração única com `INSERT` literais em `categories`, `products`, `product_images` e `product_variants` (ids fixos via `gen_random_uuid()` em CTEs), respeitando RLS existente.
- `index.tsx` recebe o novo banner e a faixa "A marca" com imagem de fundo; `catalogo.tsx` ganha o cabeçalho com faixa.
