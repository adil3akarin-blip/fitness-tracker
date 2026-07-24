// Чистая математика раскладки блинов на гриф — без React и без побочных эффектов.

export const BAR_KG = 20
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

const MAX_KG = 300 // клампим сверху, чтобы визуал не разъезжался на абсурдных весах

/** Жадная раскладка блинов на одну сторону грифа.
 *  remainder — вес на сторону, который блинами не набирается (свободный ввод, напр. 77 кг).
 *  Пример: platesPerSide(77) → на сторону 28,5 → { plates: [25, 2.5], remainder: 1 }. */
export function platesPerSide(totalKg: number): { plates: number[]; remainder: number } {
  const total = Math.min(totalKg, MAX_KG)
  let perSide = (total - BAR_KG) / 2
  const plates: number[] = []
  if (perSide <= 0) return { plates, remainder: 0 }
  for (const p of PLATES) {
    while (perSide + 1e-6 >= p) {
      plates.push(p)
      perSide = +(perSide - p).toFixed(4)
    }
  }
  return { plates, remainder: perSide < 1e-6 ? 0 : +perSide.toFixed(2) }
}
