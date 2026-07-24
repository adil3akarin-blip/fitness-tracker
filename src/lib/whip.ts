// Фирменная анимация «прогиб под весом»: чем тяжелее подход — тем сильнее и дольше пружинит.
// Утилита выставляет CSS-переменные амплитуды/длительности и перезапускает класс .whipping.

export type WhipInput = { weight: number; reps: number; repsBased?: boolean; pr?: boolean }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Нагрузка 0..1: чем тяжелее подход, тем сильнее прогиб. */
export function whipLoad(i: WhipInput): number {
  if (i.pr) return 1
  if (i.repsBased || i.weight <= 0) return clamp(i.reps / 30, 0.1, 0.6)
  return clamp((i.weight - 20) / 130, 0.1, 1)
}

/** Выставляет --whip-a/--whip-d на элементе и перезапускает класс .whipping. */
export function whip(el: HTMLElement | null, input: WhipInput): void {
  if (!el) return
  const load = whipLoad(input)
  const amp = 3 + 11 * load // px, вниз
  const dur = 360 + 340 * load // ms
  el.style.setProperty('--whip-a', `${amp.toFixed(1)}px`)
  el.style.setProperty('--whip-d', `${Math.round(dur)}ms`)
  // перезапуск анимации без ремаунта (приём как в WeightVisual)
  el.classList.remove('whipping')
  void el.offsetWidth
  el.classList.add('whipping')
}
