import type { ID, LoggedSet, WorkoutSession } from '../types'

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
