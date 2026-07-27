// Разметка упражнений по конкретным мышцам и её единственный публичный выход —
// muscleShares(). Потребителю (карта нагрузки) не нужно знать про деление на
// первичные/вторичные и про откаты: он получает список «мышца → доля работы».

import { MUSCLES, MUSCLE_IDS, type Exercise, type ID, type Muscle, type MuscleGroup } from '../types'

/** Вклад вторичной мышцы: половина работы подхода. */
export const SECONDARY_SHARE = 0.5

export interface MuscleSplit {
  primary: Muscle[]
  secondary: Muscle[]
}

/** Разметка системного каталога по id упражнения. Живёт в коде, а не в данных,
 *  чтобы детализация появилась и в уже записанной истории. Ключи — id из seed.ts. */
const BY_EXERCISE_ID: Record<ID, MuscleSplit> = {
  'ex-squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lower-back', 'abs'] },
  'ex-bench': { primary: ['chest'], secondary: ['triceps', 'front-delt'] },
  'ex-row': { primary: ['lats', 'upper-back'], secondary: ['biceps', 'rear-delt', 'lower-back'] },
  'ex-curl': { primary: ['biceps'], secondary: [] },
  'ex-dead': { primary: ['lower-back', 'glutes', 'hamstrings'], secondary: ['upper-back', 'lats', 'quads'] },
  'ex-ohp': { primary: ['front-delt', 'side-delt'], secondary: ['triceps', 'upper-back', 'abs'] },
  'ex-pullup': { primary: ['lats'], secondary: ['biceps', 'upper-back', 'rear-delt'] },
  'ex-hyper': { primary: ['lower-back'], secondary: ['glutes', 'hamstrings'] },
  'ex-fsquat': { primary: ['quads'], secondary: ['glutes', 'abs', 'upper-back'] },
  'ex-dbbench': { primary: ['chest'], secondary: ['triceps', 'front-delt'] },
  'ex-latpull': { primary: ['lats'], secondary: ['biceps', 'upper-back', 'rear-delt'] },
  'ex-triceps': { primary: ['triceps'], secondary: [] },
  'ex-legpress': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'ex-lateral': { primary: ['side-delt'], secondary: ['front-delt', 'upper-back'] },
  'ex-legcurl': { primary: ['hamstrings'], secondary: ['calves'] },
  'ex-tbar': { primary: ['lats', 'upper-back'], secondary: ['biceps', 'rear-delt'] },
}

/** Мышцы каждой группы — для отката, когда у упражнения нет разметки. */
export const MUSCLES_OF_GROUP = MUSCLE_IDS.reduce((acc, m) => {
  const g = MUSCLES[m].group
  ;(acc[g] ??= []).push(m)
  return acc
}, {} as Record<MuscleGroup, Muscle[]>)

/** Есть ли у упражнения точная разметка (иначе карта работает по группе — грубее). */
export const hasMuscleDetail = (ex: Exercise) =>
  !!BY_EXERCISE_ID[ex.id] || !!ex.primaryMuscles?.length

function splitOf(ex: Exercise): MuscleSplit | null {
  const own = BY_EXERCISE_ID[ex.id]
  if (own) return own
  if (ex.primaryMuscles?.length) return { primary: ex.primaryMuscles, secondary: ex.secondaryMuscles ?? [] }
  return null
}

/** Как работа упражнения распределяется по мышцам: первичная — 1, вторичная — 0.5.
 *  Упражнение без разметки (своё, только с группой) размазывается по мышцам группы
 *  равномерно: не знаем, какая часть работала, поэтому не завышаем ни одну. */
export function muscleShares(ex: Exercise): { muscle: Muscle; share: number }[] {
  const split = splitOf(ex)
  if (!split) {
    const ms = MUSCLES_OF_GROUP[ex.muscleGroup] ?? []
    return ms.map((muscle) => ({ muscle, share: 1 / ms.length }))
  }
  const out = split.primary.map((muscle) => ({ muscle, share: 1 }))
  for (const muscle of split.secondary)
    if (!split.primary.includes(muscle)) out.push({ muscle, share: SECONDARY_SHARE })
  return out
}
