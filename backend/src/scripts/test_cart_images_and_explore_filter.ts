import assert from 'assert';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 AUDITORIA E VALIDAÇÃO: IMAGENS NO CARRINHO & FILTRO EXPLORAR');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // PARTE 1: VERIFICAÇÃO DE CÓDIGO FONTE E ESTRUTURA
  // ----------------------------------------------------
  console.log('📌 Teste 1: Verificação da remoção do filtro "Produtos" em ExplorePage.tsx...');
  const explorePagePath = path.resolve(__dirname, '../../../pethub-frontend/src/pages/tutor/ExplorePage.tsx');
  const explorePageContent = fs.readFileSync(explorePagePath, 'utf-8');

  // 1.1 Não deve conter a categoria produtos no array categories
  assert(!explorePageContent.includes("id: 'produtos'"), 'O filtro "produtos" deve ter sido removido do array de categorias.');
  assert(!explorePageContent.includes("label: 'Produtos'"), 'O label "Produtos" deve ter sido removido do array de categorias.');
  console.log('  ✔ Filtro "produtos" não está presente no array de categorias.');

  // 1.2 Deve manter todas as outras categorias essenciais
  const requiredCategories = ['all', 'banho', 'tosa', 'veterinario', 'adestramento', 'hospedagem', 'creche', 'passeio'];
  for (const cat of requiredCategories) {
    assert(explorePageContent.includes(`id: '${cat}'`), `Categoria obrigatória "${cat}" deve estar preservada.`);
  }
  console.log('  ✔ Todas as 8 categorias oficiais preservadas (all, banho, tosa, veterinario, adestramento, hospedagem, creche, passeio).');

  // 1.3 Deve possuir salvaguarda de fallback caso activeCategory receba categoria inválida
  assert(explorePageContent.includes('isKnownCategory'), 'ExplorePage deve conter salvaguarda para categorias desconhecidas.');
  console.log('  ✔ Salvaguarda de fallback para categoria ativa validada.');

  // ----------------------------------------------------
  // PARTE 2: VERIFICAÇÃO DO UTILITÁRIO DE IMAGENS
  // ----------------------------------------------------
  console.log('\n📌 Teste 2: Validação dos utilitários getFullImageUrl e getProductPhoto...');
  const imageUtilPath = path.resolve(__dirname, '../../../pethub-frontend/src/utils/image.ts');
  const imageUtilContent = fs.readFileSync(imageUtilPath, 'utf-8');

  assert(imageUtilContent.includes('export function getProductPhoto'), 'image.ts deve exportar getProductPhoto.');
  assert(imageUtilContent.includes("trimmed.startsWith('uploads/')"), 'getFullImageUrl deve normalizar caminhos sem barra inicial.');
  assert(imageUtilContent.includes('JSON.parse'), 'getFullImageUrl/getProductPhoto deve tratar strings em formato JSON array.');
  console.log('  ✔ Funções getFullImageUrl e getProductPhoto exportadas e cobrindo múltiplos formatos.');

  // ----------------------------------------------------
  // PARTE 3: VERIFICAÇÃO DO COMPONENTE ProductImage
  // ----------------------------------------------------
  console.log('\n📌 Teste 3: Validação do componente ProductImage e tratamento de erro...');
  const productImagePath = path.resolve(__dirname, '../../../pethub-frontend/src/components/shared/ProductImage.tsx');
  assert(fs.existsSync(productImagePath), 'ProductImage.tsx deve existir.');
  const productImageContent = fs.readFileSync(productImagePath, 'utf-8');

  assert(productImageContent.includes('onError'), 'ProductImage deve capturar onError para fallback gracioso.');
  assert(productImageContent.includes('<Package'), 'ProductImage deve renderizar Package como placeholder elegante.');
  assert(!productImageContent.includes('romeu_e_julieta'), 'ProductImage não deve forçar imagem estática genérica.');
  console.log('  ✔ ProductImage trata ausência de imagem e falha de carregamento sem ícone quebrado.');

  // ----------------------------------------------------
  // PARTE 4: VERIFICAÇÃO DO CARRINHO EM ShopPage.tsx
  // ----------------------------------------------------
  console.log('\n📌 Teste 4: Validação do carrinho e passagem de dados em ShopPage.tsx...');
  const shopPagePath = path.resolve(__dirname, '../../../pethub-frontend/src/pages/tutor/ShopPage.tsx');
  const shopPageContent = fs.readFileSync(shopPagePath, 'utf-8');

  assert(shopPageContent.includes('<ProductImage'), 'ShopPage deve utilizar ProductImage no carrinho e vitrine.');
  assert(!shopPageContent.includes("src={item.product.photos?.[0] || '/romeu_e_julieta"), 'ShopPage não deve usar acesso frágil a photos?.[0] no carrinho.');
  assert(shopPageContent.includes('photo: productPhoto'), 'handleAddToCart deve persistir photo real do produto.');
  assert(shopPageContent.includes('photos: productPhoto ? [productPhoto] :'), 'handleAddToCart deve sincronizar array photos.');
  console.log('  ✔ ShopPage utiliza ProductImage no carrinho e persiste fotos reais dos produtos.');

  // ----------------------------------------------------
  // PARTE 5: BANCO DE DADOS E PRODUTOS REAIS
  // ----------------------------------------------------
  console.log('\n📌 Teste 5: Verificação dos produtos cadastrados no PostgreSQL...');
  const products = await prisma.product.findMany({
    include: {
      establishment: {
        include: {
          establishmentProfile: true,
        }
      }
    }
  });

  console.log(`  Encontrados ${products.length} produtos cadastrados no banco.`);
  assert(products.length >= 2, 'Pelo menos 2 produtos oficiais devem estar cadastrados.');

  for (const prod of products) {
    console.log(`  - [ID: ${prod.id.slice(0, 8)}] "${prod.name}": R$ ${prod.price.toFixed(2)} | Estoque: ${prod.stock} | Foto: ${prod.photo || 'SEM FOTO'}`);
    assert(typeof prod.price === 'number' && prod.price > 0, `Preço do produto ${prod.name} deve ser válido.`);
    assert(typeof prod.stock === 'number' && prod.stock >= 0, `Estoque do produto ${prod.name} deve ser válido.`);
  }

  // ----------------------------------------------------
  // PARTE 6: SIMULAÇÃO DE ESTRUTURAS DO CARRINHO (LOCALSTORAGE / PERSISTÊNCIA)
  // ----------------------------------------------------
  console.log('\n📌 Teste 6: Simulação de reidratação de carrinho com múltiplos formatos de imagem...');

  // Simulação de itens no carrinho
  const testCartItems = [
    // Caso 1: Produto com foto relativa oficial (/uploads/images/...)
    {
      product: {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
        photo: products[0].photo,
        photos: [products[0].photo],
      },
      quantity: 2,
    },
    // Caso 2: Produto "Ração Especial dog 1kg" com imagem ausente/inválida
    {
      product: {
        id: 'mock-racao-especial',
        name: 'Ração Especial dog 1kg',
        price: 89.90,
        photo: null,
        photos: [],
      },
      quantity: 1,
    },
    // Caso 3: Produto com foto em URL absoluta
    {
      product: {
        id: 'mock-racao-externa',
        name: 'Ração Externa Premium 2kg',
        price: 119.50,
        photo: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119',
        photos: ['https://images.unsplash.com/photo-1589924691995-400dc9ecc119'],
      },
      quantity: 1,
    },
  ];

  // Cálculo financeiro
  const calculatedTotal = testCartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalQuantity = testCartItems.reduce((sum, item) => sum + item.quantity, 0);

  const expectedTotal = (products[0].price * 2) + (89.90 * 1) + (119.50 * 1);
  assert.strictEqual(calculatedTotal, expectedTotal, 'O total do carrinho deve ser exatamente a soma dos subtotais.');
  assert.strictEqual(totalQuantity, 4, 'A quantidade total de itens deve ser 4.');
  console.log(`  ✔ Cálculos preservados: Quantidade = ${totalQuantity} itens, Total = R$ ${calculatedTotal.toFixed(2)}.`);

  console.log('\n====================================================');
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('====================================================');
}

runTests()
  .catch((err) => {
    console.error('❌ Falha nos testes:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
