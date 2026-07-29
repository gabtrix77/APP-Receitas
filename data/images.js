// ============================================================
// IMAGENS DAS RECEITAS
// Como adicionar mais:
//   1. Salve a foto como  img/<id-da-receita>.webp  (ex.: img/a1.webp)
//   2. Adicione o id na lista abaixo (ex.: "a1")
// O app usa a foto automaticamente; sem foto, mostra o
// fallback elegante (gradiente + emoji). Nada quebra.
// Recomendado: WebP, 640px de largura, < 80 KB.
// ============================================================

const IMAGENS = new Set([
  "c1",  // Panqueca de banana e aveia
  "c2",  // Crepioca de frango
  "c3",  // Pão de batata-doce de frigideira
  "c4",  // Overnight oats de morango
  "c5",  // Omelete com legumes
  "c6",  // Torrada com ovo e abacate
  "a3",  // Salmão com crosta de ervas
  "a6",  // Macarrão integral com frango e legumes
  "l4",  // Iogurte proteico com crocante de castanhas
  "m2",  // Marinada de iogurte e páprica (frango)
  "m4",  // Marinada de ervas para peixe
  "b1",  // Bowl de frango
  "x43", // Beijinho fit de coco
  "x52", // Salmão com cúrcuma e legumes
  "x75", // Vitamina verde de manga
  "x76", // Iogurte com chia e frutas vermelhas
  "x84", // Frozen de iogurte com frutas vermelhas
]);
