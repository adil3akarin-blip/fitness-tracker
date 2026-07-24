import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, Exercise, MuscleGroup, Equipment, Program, Settings, WorkoutSession } from '../types'
import { clearActiveWorkout, clearData, loadData, saveData } from './storage'
import { seedData } from './seed'
import { nowISO, uid } from './util'

interface StoreCtx {
  data: AppData
  exerciseById: (id: string) => Exercise | undefined
  addExercise: (e: { name: string; muscleGroup: MuscleGroup; equipment: Equipment }) => Exercise
  deleteExercise: (id: string) => void
  saveProgram: (p: Program) => void
  deleteProgram: (id: string) => void
  addSession: (s: WorkoutSession) => void
  deleteSession: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  clearDemo: () => void
  resetAll: () => void
  replaceAll: (next: AppData) => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData() ?? seedData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const value = useMemo<StoreCtx>(
    () => ({
      data,
      exerciseById: (id) => data.exercises.find((e) => e.id === id),
      addExercise: (e) => {
        const ne: Exercise = { ...e, id: uid(), ownerId: data.userId, isCustom: true, createdAt: nowISO() }
        setData((d) => ({ ...d, exercises: [ne, ...d.exercises] }))
        return ne
      },
      deleteExercise: (id) => setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) })),
      saveProgram: (p) =>
        setData((d) => {
          const exists = d.programs.some((x) => x.id === p.id)
          const up = { ...p, updatedAt: nowISO() }
          return { ...d, programs: exists ? d.programs.map((x) => (x.id === p.id ? up : x)) : [up, ...d.programs] }
        }),
      deleteProgram: (id) => setData((d) => ({ ...d, programs: d.programs.filter((p) => p.id !== id) })),
      addSession: (s) => setData((d) => ({ ...d, sessions: [...d.sessions, s] })),
      deleteSession: (id) => setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
      updateSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      clearDemo: () => {
        clearActiveWorkout()
        setData((d) => ({ ...d, programs: [], sessions: [] }))
      },
      resetAll: () => {
        clearData()
        clearActiveWorkout()
        setData(seedData())
      },
      replaceAll: (next) => {
        clearActiveWorkout()
        setData(next)
      },
    }),
    [data],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore must be used within <StoreProvider>')
  return c
}
