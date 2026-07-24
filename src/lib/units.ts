import type { Settings } from '../types'
import { ruNum } from './util'

export type Units = Settings['units'] // 'kg' | 'lb'

export const LB_PER_KG = 2.20462262

/** Ярлык единицы для подписей. */
export const weightLabel = (u: Units): string => (u === 'lb' ? 'фунт' : 'кг')

/** кг → число в текущих единицах, округлённое на «читаемую» сетку
 *  (кг — до 0,5; фунты — до целого). Сетка стабильна: обратная fromDisplayWeight
 *  вернёт эти же кг, поэтому повторный вызов даёт то же число (нет дрейфа). */
export function toDisplayWeight(kg: number, u: Units): number {
  if (u === 'lb') return Math.round(kg * LB_PER_KG)
  return Math.round(kg * 2) / 2
}

/** число в текущих единицах → кг для хранения. */
export function fromDisplayWeight(shown: number, u: Units): number {
  if (u === 'lb') return +(shown / LB_PER_KG).toFixed(3)
  return +shown.toFixed(2)
}

/** Готовая строка веса: 60 → "60 кг" / "132 фунт". reps-режим форматируется вызывающим. */
export function fmtWeight(kg: number, u: Units): string {
  return `${ruNum(toDisplayWeight(kg, u))} ${weightLabel(u)}`
}

/** Агрегатный объём: кг → тонны «т», фунты → тысячи «тыс lb». Принимает кг. */
export function fmtVolume(kg: number, u: Units): { value: string; unit: string } {
  if (u === 'lb') return { value: ((kg * LB_PER_KG) / 1000).toFixed(1), unit: 'тыс lb' }
  return { value: (kg / 1000).toFixed(1), unit: 'т' }
}

/** Шаг степпера в отображаемых единицах (кг — как было; фунты — «спортивная» сетка). */
export function weightStepDisplay(eq: string, u: Units): number {
  if (u === 'lb') return eq === 'Свой вес' ? 1 : eq === 'Штанга' || eq === 'Тренажёр' ? 5 : 2.5
  return eq === 'Штанга' || eq === 'Тренажёр' ? 2.5 : eq === 'Свой вес' ? 1 : 2
}
