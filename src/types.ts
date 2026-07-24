// Доменная модель. Каждая сущность несёт id/ownerId/даты — задел под будущий
// мультиюзер и синхронизацию (сейчас ownerId один локальный пользователь).

export type ID = string

export type MuscleGroup = 'Грудь' | 'Спина' | 'Ноги' | 'Плечи' | 'Руки' | 'Кор'
export type Equipment = 'Штанга' | 'Гантели' | 'Тренажёр' | 'Свой вес' | 'Блок'

export const MUSCLE_GROUPS: MuscleGroup[] = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Кор']
export const EQUIPMENT: Equipment[] = ['Штанга', 'Гантели', 'Тренажёр', 'Свой вес', 'Блок']

export interface Exercise {
  id: ID
  ownerId: ID | null // null = системное (seed-каталог)
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  isCustom: boolean
  createdAt: string
}

export interface PlannedExercise {
  id: ID
  exerciseId: ID
  targetSets: number
  repsMin: number
  repsMax: number
  restSec: number
}

export interface ProgramDay {
  id: ID
  letter: string // "A", "B", "C"
  name: string // "Присед-фокус"
  items: PlannedExercise[]
}

export interface Program {
  id: ID
  ownerId: ID | null
  name: string
  note: string
  isDraft: boolean
  days: ProgramDay[]
  createdAt: string
  updatedAt: string
}

export interface LoggedSet {
  id: ID
  exerciseId: ID
  setNumber: number
  weight: number
  reps: number
  warmup: boolean
  completedAt: string
}

export interface WorkoutSession {
  id: ID
  ownerId: ID | null
  programId: ID
  dayId: ID
  programName: string // снимок для истории
  dayLabel: string // "День A"
  startedAt: string
  finishedAt: string | null
  sets: LoggedSet[]
  note?: string
}

export interface Settings {
  units: 'kg' | 'lb'
  defaultRestSec: number
  soundOn: boolean
  theme: 'dark' | 'light' | 'auto'
}

export interface AppData {
  schemaVersion: number
  userId: ID
  exercises: Exercise[]
  programs: Program[]
  sessions: WorkoutSession[]
  settings: Settings
}
