import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { clearActiveWorkout, loadActiveWorkout, saveActiveWorkout } from '../lib/storage'
import { clockMS, mmss, nowISO, uid } from '../lib/util'
import WeightVisual from '../components/WeightVisual'
import type { Equipment, LoggedSet, WorkoutSession } from '../types'

const defaultWeight = (eq: Equipment) =>
  eq === 'Штанга' ? 20 : eq === 'Тренажёр' ? 20 : eq === 'Блок' ? 15 : eq === 'Гантели' ? 10 : 0
const weightStep = (eq: Equipment) => (eq === 'Штанга' || eq === 'Тренажёр' ? 2.5 : eq === 'Свой вес' ? 1 : 2)
const parseNum = (v: string, fallback: number) => {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? fallback : n
}

export default function Workout() {
  const { programId, dayId } = useParams()
  const nav = useNavigate()
  const { data, exerciseById, addSession } = useStore()

  const program = data.programs.find((p) => p.id === programId)
  const day = program?.days.find((d) => d.id === dayId)
  const items = useMemo(() => day?.items ?? [], [day])

  // восстановление незавершённой тренировки этого же дня (переживает reload/выход)
  const saved = useMemo(() => {
    const a = loadActiveWorkout()
    return a && a.programId === programId && a.dayId === dayId ? a : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, dayId])

  const startedAt = useRef(saved?.startedAt ?? nowISO())
  const [elapsed, setElapsed] = useState(() =>
    saved ? Math.max(0, Math.round((Date.now() - new Date(saved.startedAt).getTime()) / 1000)) : 0,
  )
  const [logged, setLogged] = useState<Record<string, LoggedSet[]>>(saved?.logged ?? {})
  const [currentId, setCurrentId] = useState<string | undefined>(saved?.currentId ?? items[0]?.id)
  const [weight, setWeight] = useState(20)
  const [reps, setReps] = useState(5)

  const [restLeft, setRestLeft] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [restLabel, setRestLabel] = useState('')

  // часы тренировки
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // таймер отдыха
  useEffect(() => {
    if (!restActive) return
    const t = setInterval(() => setRestLeft((x) => (x <= 1 ? (setRestActive(false), 0) : x - 1)), 1000)
    return () => clearInterval(t)
  }, [restActive])

  // персист живой тренировки: пишем при каждом изменении, чистим если ничего не записано
  useEffect(() => {
    if (!programId || !dayId) return
    const total = Object.values(logged).reduce((a, x) => a + x.length, 0)
    if (total > 0) {
      saveActiveWorkout({ programId, dayId, startedAt: startedAt.current, currentId, logged })
    } else {
      // не затираем прогресс другого дня — чистим только слот этого дня
      const a = loadActiveWorkout()
      if (a && a.programId === programId && a.dayId === dayId) clearActiveWorkout()
    }
  }, [logged, currentId, programId, dayId])

  const historyTop = (exerciseId: string) => {
    const sorted = [...data.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    for (const s of sorted) {
      const ws = s.sets.filter((x) => x.exerciseId === exerciseId && !x.warmup)
      if (ws.length) {
        const top = ws.reduce((m, x) => (x.weight > m.weight ? x : m), ws[0])
        return { weight: top.weight, reps: top.reps }
      }
    }
    return null
  }

  // префилл степперов при смене текущего упражнения
  useEffect(() => {
    const item = items.find((i) => i.id === currentId)
    if (!item) return
    const ex = exerciseById(item.exerciseId)
    const h = historyTop(item.exerciseId)
    setWeight(h ? h.weight : ex ? defaultWeight(ex.equipment) : 20)
    setReps(item.repsMin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  if (!program || !day || items.length === 0) {
    return (
      <div className="app plain">
        <div className="screen">
          <div className="empty"><Icon name="dumbbell" /><div className="et">Тренировка недоступна</div>
            <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => nav('/')}>На главную</button>
          </div>
        </div>
      </div>
    )
  }

  const totalPlanned = items.reduce((a, i) => a + i.targetSets, 0)
  const totalDone = items.reduce((a, i) => a + (logged[i.id]?.length ?? 0), 0)
  const exName = (exerciseId: string) => exerciseById(exerciseId)?.name ?? '—'

  const startRest = (sec: number, label: string) => {
    setRestLeft(sec)
    setRestLabel(label)
    setRestActive(true)
  }

  const logSet = () => {
    const item = items.find((i) => i.id === currentId)
    if (!item) return
    const cur = logged[currentId!] ?? []
    const set: LoggedSet = { id: uid(), exerciseId: item.exerciseId, setNumber: cur.length + 1, weight, reps, warmup: false, completedAt: nowISO() }
    const next = { ...logged, [currentId!]: [...cur, set] }
    setLogged(next)

    const doneCount = next[currentId!].length
    if (doneCount >= item.targetSets) {
      const nextItem = items.find((i) => (next[i.id]?.length ?? 0) < i.targetSets)
      if (nextItem) {
        setCurrentId(nextItem.id)
        startRest(item.restSec, `${exName(nextItem.exerciseId)} · подход 1`)
      } else {
        startRest(item.restSec, 'Все упражнения готовы 🎉')
      }
    } else {
      startRest(item.restSec, `${exName(item.exerciseId)} · подход ${doneCount + 1}`)
    }
  }

  const removeSet = (itemId: string, setId: string) =>
    setLogged((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((s) => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))

  const finish = () => {
    const allSets = items.flatMap((i) => logged[i.id] ?? [])
    if (allSets.length === 0) {
      clearActiveWorkout()
      nav('/')
      return
    }
    const session: WorkoutSession = {
      id: uid(), ownerId: data.userId, programId: program.id, dayId: day.id,
      programName: program.name, dayLabel: `День ${day.letter}`,
      startedAt: startedAt.current, finishedAt: nowISO(), sets: allSets,
    }
    addSession(session)
    clearActiveWorkout()
    nav(`/session/${session.id}`, { replace: true })
  }

  // «Свернуть»: прогресс сохранён — просто выходим, продолжить можно с главной
  const close = () => nav('/')

  const discard = () => {
    const has = items.some((i) => (logged[i.id]?.length ?? 0) > 0)
    if (has && !confirm('Отменить тренировку? Записанные подходы будут удалены.')) return
    clearActiveWorkout()
    nav('/')
  }

  return (
    <div className="app plain">
      <div className={'screen' + (restActive ? ' rest-open' : '')}>
        <div className="wk-top">
          <button className="x" onClick={close}><Icon name="x" /></button>
          <div className="tt">День {day.letter} · {day.name}<div className="s">{program.name}</div></div>
          <div className="clock"><Icon name="clock" style={{ fontSize: 12 }} /> {clockMS(elapsed)}</div>
        </div>
        <div className="wk-progress"><i style={{ width: `${Math.round((totalDone / totalPlanned) * 100)}%` }} /></div>

        {items.map((item, idx) => {
          const sets = logged[item.id] ?? []
          const isCurrent = item.id === currentId
          const isDone = sets.length >= item.targetSets
          const ex = exerciseById(item.exerciseId)
          const prev = historyTop(item.exerciseId)

          if (!isCurrent) {
            return (
              <div className={'exq' + (isDone ? ' done' : '')} key={item.id}>
                <div className="exq-h" onClick={() => setCurrentId(item.id)}>
                  <div className="num">{isDone ? <Icon name="check" style={{ fontSize: 14 }} /> : idx + 1}</div>
                  <div><div className="nm">{ex?.name}</div><div className="tg">{isDone ? 'Готово · нажми, чтобы изменить' : `Цель: ${item.targetSets} × ${item.repsMin}`}</div></div>
                  <div className="st">{sets.length} / {item.targetSets}</div>
                </div>
              </div>
            )
          }

          const st = weightStep(ex?.equipment ?? 'Штанга')
          return (
            <div className="exq cur" key={item.id}>
              <div className="exq-h">
                <div className="num">{idx + 1}</div>
                <div>
                  <div className="nm">{ex?.name}</div>
                  <div className="tg">Цель: {item.targetSets} × {item.repsMin} · отдых {mmss(item.restSec)}{prev ? ` · пред. ${prev.weight}×${prev.reps}` : ''}</div>
                </div>
                <div className="st">{sets.length} / {item.targetSets}</div>
              </div>
              {sets.map((s, i) => (
                <div className="setrow filled" key={s.id}>
                  <span className="si">{i + 1}</span>
                  <span className="prev"><Icon name="check" style={{ color: 'var(--green)' }} /></span>
                  <span className="val">{s.weight > 0 ? `${s.weight} кг × ${s.reps}` : `${s.reps} повт.`}</span>
                  <button className="setdel" onClick={() => removeSet(item.id, s.id)} aria-label="Удалить подход"><Icon name="x" /></button>
                </div>
              ))}
              <div className="logger">
                <WeightVisual equipment={ex?.equipment} weight={weight} reps={reps} />
                <div className="stepper">
                  <div className="grp">
                    <div className="lab">Вес</div>
                    <div className="ctl">
                      <button onClick={() => setWeight((w) => Math.max(0, +(w - st).toFixed(1)))}><Icon name="minus" /></button>
                      <div className="n">
                        <input className="ninp" type="text" inputMode="decimal" value={weight}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setWeight(Math.max(0, parseNum(e.target.value, 0)))} />
                        <small>кг</small>
                      </div>
                      <button onClick={() => setWeight((w) => +(w + st).toFixed(1))}><Icon name="plus" /></button>
                    </div>
                  </div>
                  <div className="grp">
                    <div className="lab">Повторы</div>
                    <div className="ctl">
                      <button onClick={() => setReps((r) => Math.max(1, r - 1))}><Icon name="minus" /></button>
                      <div className="n">
                        <input className="ninp" type="text" inputMode="numeric" value={reps}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setReps(Math.max(1, Math.round(parseNum(e.target.value, 1))))} />
                      </div>
                      <button onClick={() => setReps((r) => r + 1)}><Icon name="plus" /></button>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={logSet}><Icon name="check" /> Записать подход</button>
              </div>
            </div>
          )
        })}

        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={finish}>Завершить тренировку</button>
        <button className="wk-discard" onClick={discard}>Отменить тренировку</button>
      </div>

      <div className={'restbar' + (restActive ? ' show' : '')}>
        <div className="ring">{mmss(restLeft)}</div>
        <div className="lab">Отдых перед подходом<b>{restLabel}</b></div>
        <div className="acts">
          <button onClick={() => setRestLeft((x) => x + 15)}>+15с</button>
          <button className="skip" onClick={() => setRestActive(false)}>Пропустить</button>
        </div>
      </div>
    </div>
  )
}
