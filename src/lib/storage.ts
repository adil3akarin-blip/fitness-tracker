import type { AppData, LoggedSet } from '../types'

const KEY = 'fitness-tracker:v1'
const ACTIVE_KEY = 'fitness-tracker:active:v1'
export const SCHEMA_VERSION = 1

/** Незавершённая («живая») тренировка — переживает перезагрузку/выход до «Завершить». */
export interface ActiveWorkout {
  programId: string
  dayId: string
  startedAt: string
  currentId?: string
  logged: Record<string, LoggedSet[]>
}

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AppData
    // Простая политика миграции: при смене версии схемы пере-сидим демо.
    if (data.schemaVersion !== SCHEMA_VERSION) return null
    return data
  } catch {
    return null
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode — молча игнорируем в MVP */
  }
}

export function clearData() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function loadActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveWorkout
  } catch {
    return null
  }
}

export function saveActiveWorkout(a: ActiveWorkout) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(a))
  } catch {
    /* quota / private mode */
  }
}

export function clearActiveWorkout() {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* noop */
  }
}
