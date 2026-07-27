import type {
  AppData, Equipment, Exercise, LoggedSet, MuscleGroup, PlannedExercise, Program, WorkoutSession,
} from '../types'
import { uid } from './util'

const USER = 'local'

function ex(id: string, name: string, mg: MuscleGroup, eq: Equipment, isCustom = false): Exercise {
  return { id, ownerId: isCustom ? USER : null, name, muscleGroup: mg, equipment: eq, isCustom, createdAt: new Date(2025, 0, 1).toISOString() }
}

const EXERCISES: Exercise[] = [
  ex('ex-squat', 'Приседания со штангой', 'Ноги', 'Штанга'),
  ex('ex-bench', 'Жим лёжа', 'Грудь', 'Штанга'),
  ex('ex-row', 'Тяга штанги в наклоне', 'Спина', 'Штанга'),
  ex('ex-curl', 'Подъём на бицепс', 'Руки', 'Гантели'),
  ex('ex-dead', 'Становая тяга', 'Спина', 'Штанга'),
  ex('ex-ohp', 'Жим стоя', 'Плечи', 'Штанга'),
  ex('ex-pullup', 'Подтягивания', 'Спина', 'Свой вес'),
  ex('ex-hyper', 'Гиперэкстензия', 'Спина', 'Свой вес'),
  ex('ex-fsquat', 'Фронтальный присед', 'Ноги', 'Штанга'),
  ex('ex-dbbench', 'Жим гантелей лёжа', 'Грудь', 'Гантели'),
  ex('ex-latpull', 'Тяга верхнего блока', 'Спина', 'Блок'),
  ex('ex-triceps', 'Разгибание на блоке', 'Руки', 'Блок'),
  ex('ex-legpress', 'Жим ногами', 'Ноги', 'Тренажёр'),
  ex('ex-lateral', 'Махи гантелями в стороны', 'Плечи', 'Гантели'),
  ex('ex-legcurl', 'Сгибание ног', 'Ноги', 'Тренажёр'),
  // икры и пресс прямой работы в демо-программе не получают — карта мышц это честно
  // показывает, но упражнения под них в каталоге должны быть
  ex('ex-calf', 'Подъёмы на носки', 'Ноги', 'Тренажёр'),
  ex('ex-crunch', 'Скручивания', 'Кор', 'Свой вес'),
  ex('ex-tbar', 'Тяга Т-грифа', 'Спина', 'Тренажёр', true),
]

let planSeq = 0
function pe(exerciseId: string, sets: number, reps: number, rest: number): PlannedExercise {
  return { id: `pl-${++planSeq}`, exerciseId, targetSets: sets, repsMin: reps, repsMax: reps, restSec: rest }
}

const fullBody: Program = {
  id: 'prog-fullbody',
  ownerId: USER,
  name: 'Full Body',
  note: '3 дня в неделю · база на всё тело',
  isDraft: false,
  createdAt: new Date(2025, 4, 1).toISOString(),
  updatedAt: new Date(2025, 4, 1).toISOString(),
  days: [
    { id: 'day-a', letter: 'A', name: 'Присед-фокус', items: [pe('ex-squat', 4, 5, 150), pe('ex-bench', 4, 5, 150), pe('ex-row', 4, 8, 120), pe('ex-curl', 3, 12, 90)] },
    { id: 'day-b', letter: 'B', name: 'Тяга-фокус', items: [pe('ex-dead', 3, 5, 180), pe('ex-ohp', 4, 6, 150), pe('ex-pullup', 4, 8, 120), pe('ex-hyper', 3, 15, 90)] },
    { id: 'day-c', letter: 'C', name: 'Объём', items: [pe('ex-fsquat', 4, 6, 150), pe('ex-dbbench', 4, 8, 120), pe('ex-latpull', 4, 10, 90), pe('ex-triceps', 3, 12, 90)] },
  ],
}

const upperLower: Program = {
  id: 'prog-ul',
  ownerId: USER,
  name: 'Верх / Низ',
  note: '2 дня · черновик',
  isDraft: true,
  createdAt: new Date(2025, 5, 1).toISOString(),
  updatedAt: new Date(2025, 5, 1).toISOString(),
  days: [
    { id: 'ul-up', letter: 'В', name: 'Верх тела', items: [pe('ex-bench', 4, 6, 150), pe('ex-row', 4, 8, 120)] },
    { id: 'ul-low', letter: 'Н', name: 'Низ тела', items: [pe('ex-squat', 4, 6, 150), pe('ex-dead', 3, 5, 180)] },
  ],
}

// базовый вес и недельный прирост для генерации истории
const PROG: Record<string, { base: number; inc: number }> = {
  'ex-squat': { base: 100, inc: 4 },
  'ex-bench': { base: 70, inc: 3 },
  'ex-row': { base: 60, inc: 2.5 },
  'ex-curl': { base: 12, inc: 1 },
  'ex-dead': { base: 120, inc: 6 },
  'ex-ohp': { base: 45, inc: 2 },
  'ex-pullup': { base: 0, inc: 0 },
  'ex-hyper': { base: 0, inc: 0 },
  'ex-fsquat': { base: 70, inc: 2.5 },
  'ex-dbbench': { base: 26, inc: 1 },
  'ex-latpull': { base: 50, inc: 2 },
  'ex-triceps': { base: 25, inc: 1 },
}

const round2p5 = (x: number) => Math.round(x / 2.5) * 2.5

function generateSessions(): WorkoutSession[] {
  const sessions: WorkoutSession[] = []
  const today = new Date()
  const N = 18 // 6 недель × 3

  for (let i = 0; i < N; i++) {
    const day = fullBody.days[i % 3]
    const week = Math.floor(i / 3)
    const dt = new Date(today)
    dt.setDate(dt.getDate() - (N - i) * 2)
    dt.setHours(18, 0, 0, 0)

    const sets: LoggedSet[] = []
    for (const item of day.items) {
      const p = PROG[item.exerciseId] ?? { base: 40, inc: 2 }
      const weight = round2p5(p.base + week * p.inc)
      let n = 0
      const push = (w: number, reps: number, warmup: boolean, offsetMin: number) => {
        sets.push({
          id: uid(), exerciseId: item.exerciseId, setNumber: ++n,
          weight: w, reps, warmup, completedAt: new Date(dt.getTime() + offsetMin * 60000).toISOString(),
        })
      }
      // разминочный подход для тяжёлой базы
      if (weight >= 40) push(round2p5(weight * 0.6), 5, true, n)
      for (let s = 0; s < item.targetSets; s++) {
        const last = s === item.targetSets - 1
        push(weight, last ? Math.max(item.repsMin - 1, 1) : item.repsMin, false, n)
      }
    }

    sessions.push({
      id: uid(), ownerId: USER, programId: fullBody.id, dayId: day.id,
      programName: fullBody.name, dayLabel: `День ${day.letter}`,
      startedAt: dt.toISOString(),
      finishedAt: new Date(dt.getTime() + (44 + (i % 4) * 3) * 60000).toISOString(),
      sets,
    })
  }
  return sessions
}

export function seedData(): AppData {
  return {
    schemaVersion: 1,
    userId: USER,
    exercises: EXERCISES,
    programs: [fullBody, upperLower],
    sessions: generateSessions(),
    settings: { units: 'kg', soundOn: true, theme: 'dark' },
  }
}
