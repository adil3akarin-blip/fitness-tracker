import { MUSCLE_IDS, type Exercise, type ID, type LoggedSet, type Muscle, type WorkoutSession } from '../types'
import { muscleShares } from './muscles'

/** Оценка одноповторного максимума по формуле Эпли. */
export const epley1RM = (weight: number, reps: number) =>
  weight <= 0 ? 0 : Math.round(weight * (1 + reps / 30))

/** Суммарный объём (тоннаж) сессии = Σ вес × повторения. */
export const sessionVolume = (s: WorkoutSession) =>
  s.sets.reduce((a, x) => a + x.weight * x.reps, 0)

export const workingSets = (sets: LoggedSet[]) => sets.filter((x) => !x.warmup)

export interface ExercisePR {
  maxWeight: number
  best1RM: number
  maxReps: number
}

export function exercisePR(sessions: WorkoutSession[], exerciseId: ID): ExercisePR {
  let maxWeight = 0, best1RM = 0, maxReps = 0
  for (const s of sessions)
    for (const set of s.sets) {
      if (set.exerciseId !== exerciseId || set.warmup) continue
      maxWeight = Math.max(maxWeight, set.weight)
      maxReps = Math.max(maxReps, set.reps)
      best1RM = Math.max(best1RM, epley1RM(set.weight, set.reps))
    }
  return { maxWeight, best1RM, maxReps }
}

/** Самый тяжёлый рабочий подход за каждую сессию (для графика роста веса). */
export function topWeightSeries(
  sessions: WorkoutSession[],
  exerciseId: ID,
): { date: string; weight: number }[] {
  const out: { date: string; weight: number }[] = []
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const s of ordered) {
    let top = 0
    for (const set of s.sets)
      if (set.exerciseId === exerciseId && !set.warmup) top = Math.max(top, set.weight)
    if (top > 0) out.push({ date: s.startedAt, weight: top })
  }
  return out
}

/** id упражнений, по которым есть весовая история (для рекордов на «Главной»). */
export function weightedExerciseIds(sessions: WorkoutSession[]): ID[] {
  const seen = new Set<ID>()
  for (const s of sessions)
    for (const set of s.sets)
      if (!set.warmup && set.weight > 0) seen.add(set.exerciseId)
  return [...seen]
}

/** id всех упражнений с рабочей историей (вес ИЛИ свой вес) — для списка на «Прогрессе». */
export function progressableExerciseIds(sessions: WorkoutSession[]): ID[] {
  const seen = new Set<ID>()
  for (const s of sessions)
    for (const set of s.sets)
      if (!set.warmup) seen.add(set.exerciseId)
  return [...seen]
}

/** true, если у упражнения все рабочие подходы без веса (свой вес → метрика прогресса = повторы). */
export function isRepsBased(sessions: WorkoutSession[], exerciseId: ID): boolean {
  let hasWorking = false
  for (const s of sessions)
    for (const set of s.sets) {
      if (set.exerciseId !== exerciseId || set.warmup) continue
      hasWorking = true
      if (set.weight > 0) return false
    }
  return hasWorking
}

// ---- Карта нагрузки по мышцам ----
// Метрика — рабочие подходы за окно, а не тоннаж: тоннаж обнуляет работу со
// своим весом (подтягивания дают 8 «единиц» против 480 у тяги) и не сравним
// между мышцами. У подходов есть внятный ориентир: 10–20 в неделю на мышцу.

/** Локальная полночь — ключ дня: нагрузка копится по календарным дням. */
const dayStart = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Состояние мышцы на сегодня — основа цвета на карте. */
export type MuscleState = 'recovering' | 'worked' | 'ready' | 'neglected'

export interface MuscleLoad {
  muscle: Muscle
  sets: number // с учётом доли: вторичная мышца даёт полподхода
  tonnage: number
  daysSince: number | null // с последней значимой нагрузки; null = такой не было
  everTrained: boolean // задевало ли мышцу вообще — «ни разу» ≠ «только вторично»
  state: MuscleState
}

const RECOVERY_DAYS = 2 // «ещё болит» — мышца под нагрузкой была вчера-позавчера
const WORKED_DAYS = 4
const NEGLECT_DAYS = 10
/** Сколько долей-подходов за день считать настоящей нагрузкой. Ниже порога мышцу
 *  «задело по касательной» — вторичная работа или откат по группе у своего
 *  упражнения; такое не должно занимать мышцу на два дня наравне с целевой
 *  работой. Две доли — это, например, 4 подхода жима для трицепса. */
const SIGNIFICANT_SETS = 2
/** Ориентир недельного объёма на мышцу (подходов). */
export const SETS_LOW = 10
export const SETS_HIGH = 20

export function muscleStateOf(daysSince: number | null): MuscleState {
  if (daysSince === null || daysSince > NEGLECT_DAYS) return 'neglected'
  if (daysSince <= RECOVERY_DAYS) return 'recovering'
  if (daysSince <= WORKED_DAYS) return 'worked'
  return 'ready'
}

/** Нагрузка и свежесть каждой мышцы. now — параметр, чтобы расчёт был проверяем. */
export function muscleLoads(
  sessions: WorkoutSession[],
  exerciseById: (id: ID) => Exercise | undefined,
  windowDays = 7,
  now = Date.now(),
): MuscleLoad[] {
  const since = now - windowDays * 864e5
  const sets: Partial<Record<Muscle, number>> = {}
  const ton: Partial<Record<Muscle, number>> = {}
  // доли по дням за всю историю: свежесть отсчитывается от дня, где мышца
  // набрала SIGNIFICANT_SETS, а не от любого касания
  const byDay = new Map<Muscle, Map<number, { t: number; share: number }>>()

  for (const s of sessions)
    for (const set of s.sets) {
      if (set.warmup) continue
      const ex = exerciseById(set.exerciseId)
      if (!ex) continue // упражнение удалили из каталога — история остаётся, но разметки нет
      const t = new Date(set.completedAt).getTime()
      if (t > now) continue
      for (const { muscle, share } of muscleShares(ex)) {
        let days = byDay.get(muscle)
        if (!days) byDay.set(muscle, (days = new Map()))
        const key = dayStart(t)
        const d = days.get(key)
        if (d) {
          d.share += share
          if (t > d.t) d.t = t
        } else days.set(key, { t, share })
        if (t < since) continue
        sets[muscle] = (sets[muscle] ?? 0) + share
        ton[muscle] = (ton[muscle] ?? 0) + set.weight * set.reps * share
      }
    }

  return MUSCLE_IDS.map((muscle) => {
    const days = byDay.get(muscle)
    let lastReal = 0
    if (days)
      for (const d of days.values())
        if (d.share >= SIGNIFICANT_SETS && d.t > lastReal) lastReal = d.t
    const daysSince = lastReal ? (now - lastReal) / 864e5 : null
    return {
      muscle,
      sets: Math.round((sets[muscle] ?? 0) * 10) / 10,
      tonnage: Math.round(ton[muscle] ?? 0),
      daysSince,
      everTrained: !!days,
      state: muscleStateOf(daysSince),
    }
  })
}

/** Что логично взять сегодня: восстановившиеся мышцы, начиная с самых недогруженных. */
export function readyToTrain(loads: MuscleLoad[], limit = 3): MuscleLoad[] {
  return loads
    .filter((l) => l.state === 'ready' || l.state === 'neglected')
    .sort((a, b) => a.sets - b.sets)
    .slice(0, limit)
}

/** Лучший результат по повторам за каждую сессию (для графика упражнений со своим весом). */
export function topRepsSeries(
  sessions: WorkoutSession[],
  exerciseId: ID,
): { date: string; reps: number }[] {
  const out: { date: string; reps: number }[] = []
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const s of ordered) {
    let top = 0
    for (const set of s.sets)
      if (set.exerciseId === exerciseId && !set.warmup) top = Math.max(top, set.reps)
    if (top > 0) out.push({ date: s.startedAt, reps: top })
  }
  return out
}
