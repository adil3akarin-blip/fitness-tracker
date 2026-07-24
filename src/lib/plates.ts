// Чистая математика раскладки блинов на гриф — без React и без побочных эффектов.

import type { Units } from './units'

// вес грифа и набор блинов зависят от системы единиц (метрика / имперская)
export const BAR: Record<Units, number> = { kg: 20, lb: 45 }
export const PLATE_SET: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}
const MAX: Record<Units, number> = { kg: 300, lb: 660 } // клампим сверху, чтобы визуал не разъезжался

/** Жадная раскладка блинов на одну сторону грифа. totalDisplay — общий вес
 *  в ЕДИНИЦАХ показа (не кг). remainder — вес на сторону, который блинами не
 *  набирается (свободный ввод). Пример: platesPerSide(77,'kg') → { plates:[25,2.5], remainder:1 }. */
export function platesPerSide(totalDisplay: number, u: Units): { plates: number[]; remainder: number } {
  const total = Math.min(totalDisplay, MAX[u])
  let perSide = (total - BAR[u]) / 2
  const plates: number[] = []
  if (perSide <= 0) return { plates, remainder: 0 }
  for (const p of PLATE_SET[u]) {
    while (perSide + 1e-6 >= p) {
      plates.push(p)
      perSide = +(perSide - p).toFixed(4)
    }
  }
  return { plates, remainder: perSide < 1e-6 ? 0 : +perSide.toFixed(2) }
}
