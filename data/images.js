// ============================================================
// IMAGENS DAS RECEITAS
// Como adicionar mais:
//   1. Salve a foto como  img/<id-da-receita>.webp  (ex.: img/v1.webp)
//   2. Adicione o id na lista abaixo
// Sem foto, o app mostra o fallback (gradiente + emoji). Nada quebra.
// Recomendado: WebP, 640px de largura, < 80 KB.
// ============================================================

const IMAGENS = new Set([
  // Café da manhã
  "c1", "c2", "c3", "c4", "c5", "c6",
  // Almoço & Jantar
  "a1", "a2", "a3", "a4", "a5", "a6",
  // Lanches
  "l1", "l2", "l3", "l4", "l5",
  // Sopas
  "s1", "s2", "s3", "s4", "s5",
  // Low carb
  "lc1", "lc2", "lc3", "lc4", "lc5",
  // Marinadas
  "m1", "m2", "m3", "m4", "m5",
  // Versáteis (faltam: v1, v2)
  "v3", "v4", "v5",
  // Bowls (falta: b5)
  "b1", "b2", "b3", "b4",
  // Sucos detox
  "d1", "d2", "d3", "d4", "d5",
  // Sobremesas
  "sb1", "sb2", "sb3", "sb4", "sb5",
  // Bônus
  "x43", "x52", "x75", "x76", "x84",
]);
