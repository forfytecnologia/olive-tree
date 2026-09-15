
insert into public.categories (name, slug, position, active) values
  ('Aviador','aviador',1,true),
  ('Oval','oval',2,true),
  ('Gatinho','gatinho',3,true),
  ('Geométrico','geometrico',4,true),
  ('Retangular','retangular',5,true)
on conflict do nothing;

with data(name, slug, description, cat, price, colors, featured, img) as (values
  ('CO 0001 · Noemi','co-0001-noemi','Armação hexagonal em rose gold com lentes degradê rosé. Leve, delicada e feita para quem gosta de ser notada sem dizer uma palavra.','geometrico',189.90, array['Rosé','Dourado'], true, '/__l5e/assets-v1/18fae84b-dde2-48f6-a451-318e80802798/p10.jpg'),
  ('CO 0002 · Quetura','co-0002-quetura','Oval clássico em acetato preto brilhante. O modelo coringa que combina com qualquer look, do dia a dia ao fim de semana.','oval',159.90, array['Preto'], false, '/__l5e/assets-v1/60fa736f-7c3b-422e-a59f-e1b74e71bb65/p2.jpg'),
  ('CO 0003 · Rebeca','co-0003-rebeca','Oval em acetato âmbar translúcido com lentes marrons. Um toque retrô quente que valoriza a pele.','oval',139.90, array['Âmbar','Caramelo'], false, '/__l5e/assets-v1/2f2904bb-7c89-4c43-9213-3d99513539f4/p3.jpg'),
  ('CO 0004 · Raquel','co-0004-raquel','Linhas geométricas em metal prateado com lentes degradê cinza. Moderno, anguloso e elegante.','geometrico',159.90, array['Prata','Preto'], false, '/__l5e/assets-v1/f61b539a-2372-4adc-af6f-af45eb19da11/p4.jpg'),
  ('CO 0005 · Milca','co-0005-milca','Aviador dourado com lentes âmbar. Presença absoluta, do sol da praia ao trânsito da cidade.','aviador',189.90, array['Dourado','Âmbar'], true, '/__l5e/assets-v1/c0ca2e17-d9c0-4f07-95cf-155e1e905637/p5.jpg'),
  ('CO 0006 · Eva','co-0006-eva','Retangular em acetato cristal pêssego com lentes degradê. Suave, moderno e surpreendentemente versátil.','retangular',159.90, array['Cristal','Pêssego'], true, '/__l5e/assets-v1/498aaceb-0d15-43d9-83ed-9e5c9ec8dff9/p6.jpg'),
  ('CO 0007 · Agar','co-0007-agar','Gatinho em acetato preto, desenho fino e alongado. Feminino e atemporal.','gatinho',139.90, array['Preto'], true, '/__l5e/assets-v1/4971ad5f-7f2c-4bdb-9068-210872dec458/p7.jpg'),
  ('CO 0008 · Lia','co-0008-lia','Quadrado oversized em tartaruga com detalhes dourados. Sofisticação em estado puro.','retangular',189.90, array['Tartaruga','Dourado'], false, '/__l5e/assets-v1/99e309e4-341d-45a3-87ed-b90e56eada12/p8.jpg'),
  ('CO 0009 · Tamar','co-0009-tamar','Aviador preto com lentes degradê violeta. Clássico com um detalhe que ninguém espera.','aviador',139.90, array['Preto','Violeta'], false, '/__l5e/assets-v1/611c7a5d-a91e-4696-b9a0-33ad035d9e90/p9.jpg'),
  ('CO 0010 · Ada','co-0010-ada','Hexagonal em metal dourado com lentes degradê cinza. Estrutura marcante e acabamento fino.','geometrico',189.90, array['Dourado','Cinza'], true, '/__l5e/assets-v1/0084352d-eb87-4340-810c-a3b90978f2d7/p1.jpg')
), ins as (
  insert into public.products (name, slug, description, category_id, price, colors, status, featured)
  select d.name, d.slug, d.description, c.id, d.price, d.colors, 'ativo', d.featured
  from data d join public.categories c on c.slug = d.cat
  returning id, slug
)
insert into public.product_images (product_id, url, position)
select ins.id, d.img, 0 from ins join data d on d.slug = ins.slug
union all
select ins.id, '/__l5e/assets-v1/7f960e1e-0735-401e-921e-34d09051fb51/brand.jpg', 1 from ins;

insert into public.product_variants (product_id, size, stock)
select p.id, v.size, v.stock
from public.products p
cross join (values ('Único', 8)) as v(size, stock)
where p.slug like 'co-00%';

update public.store_settings set
  whatsapp = '5551992896189',
  instagram_url = 'https://instagram.com/useolivetree',
  welcome_message = 'Mais do que acessórios, identidade.',
  about_text = 'A Olive Tree nasceu do desejo de oferecer óculos de sol que dizem algo sobre quem usa. Cada modelo é escolhido a dedo, com lentes de proteção UV400 e armações confortáveis para o dia a dia.

Atendemos com carinho de Porto Alegre para todo o Brasil, com entrega em mãos na Grande POA e envio para as demais cidades.'
where id = true;
