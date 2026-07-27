// Доменная модель. Каждая сущность несёт id/ownerId/даты — задел под будущий
// мультиюзер и синхронизацию (сейчас ownerId один локальный пользователь).

export type ID = string

export type MuscleGroup = 'Грудь' | 'Спина' | 'Ноги' | 'Плечи' | 'Руки' | 'Кор'
export type Equipment = 'Штанга' | 'Гантели' | 'Тренажёр' | 'Свой вес' | 'Блок'

export const MUSCLE_GROUPS: MuscleGroup[] = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Кор']
export const EQUIPMENT: Equipment[] = ['Штанга', 'Гантели', 'Тренажёр', 'Свой вес', 'Блок']

/** Детальная мышца — ось для карты нагрузки. Группа остаётся фильтром каталога
 *  (6 чипов влезают в экран телефона), а мышцы нужны там, где группа врёт:
 *  «Спина» смешивает широчайшие с разгибателями, «Руки» — бицепс с трицепсом. */
export type Muscle =
  | 'chest'
  | 'lats'
  | 'upper-back'
  | 'lower-back'
  | 'front-delt'
  | 'side-delt'
  | 'rear-delt'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'

export interface MuscleMeta {
  label: string
  group: MuscleGroup
  side: 'front' | 'back' // на какой проекции силуэта рисуем
}

export const MUSCLES: Record<Muscle, MuscleMeta> = {
  chest: { label: 'Грудь', group: 'Грудь', side: 'front' },
  lats: { label: 'Широчайшие', group: 'Спина', side: 'back' },
  'upper-back': { label: 'Верх спины', group: 'Спина', side: 'back' }, // трапеции + ромбовидные
  'lower-back': { label: 'Разгибатели спины', group: 'Спина', side: 'back' },
  'front-delt': { label: 'Передняя дельта', group: 'Плечи', side: 'front' },
  'side-delt': { label: 'Средняя дельта', group: 'Плечи', side: 'front' },
  'rear-delt': { label: 'Задняя дельта', group: 'Плечи', side: 'back' },
  biceps: { label: 'Бицепс', group: 'Руки', side: 'front' },
  triceps: { label: 'Трицепс', group: 'Руки', side: 'back' },
  quads: { label: 'Квадрицепс', group: 'Ноги', side: 'front' },
  hamstrings: { label: 'Бицепс бедра', group: 'Ноги', side: 'back' },
  glutes: { label: 'Ягодичные', group: 'Ноги', side: 'back' },
  calves: { label: 'Икры', group: 'Ноги', side: 'back' },
  abs: { label: 'Пресс', group: 'Кор', side: 'front' },
}

export const MUSCLE_IDS = Object.keys(MUSCLES) as Muscle[]

export interface Exercise {
  id: ID
  ownerId: ID | null // null = системное (seed-каталог)
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  isCustom: boolean
  createdAt: string
  /** Детализация нагрузки для пользовательских упражнений. У системных она
   *  живёт в lib/muscles.ts по id — так карта работает и для истории, записанной
   *  до появления детализации, без миграции хранилища. Пусто → откат к группе. */
  primaryMuscles?: Muscle[]
  secondaryMuscles?: Muscle[]
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
