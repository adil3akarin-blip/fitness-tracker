import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon, type IconName } from '../icons'
import { exercisePR, muscleLoads, readyToTrain, sessionVolume, weightedExerciseIds } from '../lib/calc'
import { loadActiveWorkout } from '../lib/storage'
import { plural, startOfWeek } from '../lib/util'
import { fmtVolume, fmtWeight } from '../lib/units'
import { MUSCLES } from '../types'
import MuscleMap from '../components/MuscleMap'

function streakWeeks(times: number[]): number {
  if (!times.length) return 0
  const weeks = new Set(times.map((t) => startOfWeek(new Date(t)).getTime()))
  let count = 0
  let cur = startOfWeek(new Date())
  if (!weeks.has(cur.getTime())) cur = new Date(cur.getTime() - 7 * 864e5) // допускаем пустую текущую неделю
  while (weeks.has(cur.getTime())) {
    count++
    cur = new Date(cur.getTime() - 7 * 864e5)
  }
  return count
}

const PR_ICON: { icon: IconName; color: string }[] = [
  { icon: 'award', color: 'var(--green)' },
  { icon: 'flame', color: 'var(--amber)' },
  { icon: 'dumbbell', color: 'var(--green)' },
]

export default function Home() {
  const { data, exerciseById } = useStore()
  const nav = useNavigate()
  const { sessions } = data
  const units = data.settings.units

  const program = data.programs.find((p) => !p.isDraft) ?? data.programs[0]

  const today = new Date()
  const dateLine = today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  // незавершённая тренировка — предложить продолжить
  const active = loadActiveWorkout()
  const activeProgram = active ? data.programs.find((p) => p.id === active.programId) : undefined
  const activeDay = activeProgram?.days.find((d) => d.id === active!.dayId)
  const activeCount = active ? Object.values(active.logged).reduce((a, x) => a + x.length, 0) : 0
  const showResume = Boolean(active && activeProgram && activeDay && activeCount > 0)

  // следующий НЕпустой день по циклу программы (пустые дни пропускаем)
  const progSessions = sessions
    .filter((s) => program && s.programId === program.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const lastDayId = progSessions[0]?.dayId
  const lastIdx = program?.days.findIndex((d) => d.id === lastDayId) ?? -1
  const nextDay = (() => {
    const days = program?.days ?? []
    for (let k = 1; k <= days.length; k++) {
      const d = days[(lastIdx + k) % days.length]
      if (d.items.length > 0) return d
    }
    return undefined
  })()

  // статистика недели
  const wkStart = startOfWeek(today).getTime()
  const thisWeek = sessions.filter((s) => new Date(s.startedAt).getTime() >= wkStart)
  const volKg = thisWeek.reduce((a, s) => a + sessionVolume(s), 0)
  const streak = streakWeeks(sessions.map((s) => new Date(s.startedAt).getTime()))

  // карта мышц: что успело восстановиться к сегодняшнему дню
  const loads = useMemo(() => muscleLoads(sessions, exerciseById), [sessions, exerciseById])
  const ready = readyToTrain(loads)

  // недавние рекорды
  const prs = weightedExerciseIds(sessions)
    .map((id) => ({ id, pr: exercisePR(sessions, id) }))
    .filter((x) => x.pr.maxWeight > 0)
    .sort((a, b) => b.pr.best1RM - a.pr.best1RM)
    .slice(0, 3)

  return (
    <div className="screen">
      <div className="appbar">
        <div>
          <h1>Привет 👋</h1>
          <div className="sub" style={{ textTransform: 'capitalize' }}>{dateLine}</div>
        </div>
        <button className="icon-btn" onClick={() => nav('/settings')}><Icon name="gear" /></button>
      </div>

      {showResume && (
        <div className="resume" onClick={() => nav(`/workout/${activeProgram!.id}/${activeDay!.id}`)}>
          <div className="tag"><Icon name="play" fill /> Продолжить тренировку</div>
          <div className="rt">{activeProgram!.name} · День {activeDay!.letter}</div>
          <div className="rm2">Записано подходов: {activeCount} · нажми, чтобы продолжить</div>
        </div>
      )}

      {program && nextDay ? (
        <div className="hero">
          <div className="tag"><Icon name="clock" /> Следующая тренировка</div>
          <h2>{program.name} · День {nextDay.letter}</h2>
          <div className="meta">
            {nextDay.items.length} {plural(nextDay.items.length, 'упражнение', 'упражнения', 'упражнений')} · {nextDay.name}
            {progSessions[0] ? ` · последняя ${new Date(progSessions[0].startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
          </div>
          <div className="exs">
            {nextDay.items.slice(0, 4).map((it) => (
              <span className="chip" key={it.id}>{exerciseById(it.exerciseId)?.name.split(' ')[0] ?? '—'}</span>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => nav(`/workout/${program.id}/${nextDay.id}`)}>
            <Icon name="play" fill /> Начать тренировку
          </button>
        </div>
      ) : program ? (
        <div className="hero">
          <div className="tag"><Icon name="folder" /> Программа пустая</div>
          <h2>{program.name}</h2>
          <div className="meta">В днях программы пока нет упражнений — добавь их, чтобы начать тренировку.</div>
          <button className="btn btn-primary" onClick={() => nav(`/programs/${program.id}/edit`)}>
            <Icon name="plus" /> Заполнить программу
          </button>
        </div>
      ) : (
        <div className="hero">
          <div className="tag"><Icon name="folder" /> Нет программы</div>
          <h2>Создай первую программу</h2>
          <div className="meta">Тренировки в приложении идут по плану — добавь программу с днями и упражнениями.</div>
          <button className="btn btn-primary" onClick={() => nav('/programs/new/edit')}>
            <Icon name="plus" /> Создать программу
          </button>
        </div>
      )}

      <div className="stat-row">
        <div className="stat"><div className="v">{thisWeek.length}</div><div className="k">за неделю</div></div>
        <div className="stat"><div className="v">{streak} <small>нед</small>{streak > 0 && <Icon name="flame" className="streak-flame" />}</div><div className="k">серия</div></div>
        <div className="stat"><div className="v">{fmtVolume(volKg, units).value}<small> {fmtVolume(volKg, units).unit}</small></div><div className="k">объём/нед</div></div>
      </div>

      {sessions.length > 0 && (
        <>
          <div className="sec-label">Нагрузка по мышцам</div>
          <div className="card mm-card" onClick={() => nav('/progress')}>
            <MuscleMap loads={loads} compact />
            <div className="mm-hint">
              {ready.length > 0 ? (
                <>Готовы к работе: <b>{ready.map((l) => MUSCLES[l.muscle].label.toLowerCase()).join(', ')}</b></>
              ) : (
                'Всё под нагрузкой — сегодня логичнее отдохнуть'
              )}
            </div>
          </div>
        </>
      )}

      {prs.length > 0 && (
        <>
          <div className="sec-label">Личные рекорды</div>
          <div className="card">
            {prs.map((x, i) => {
              const ex = exerciseById(x.id)
              const ic = PR_ICON[i] ?? PR_ICON[0]
              return (
                <div className="pr-item" key={x.id}>
                  <div className="pr-emoji" style={{ background: ic.color === 'var(--amber)' ? 'rgba(245,158,11,.14)' : undefined }}>
                    <Icon name={ic.icon} style={{ color: ic.color }} />
                  </div>
                  <div>
                    <div className="n">{ex?.name}</div>
                    <div className="d">1ПМ ≈ {fmtWeight(x.pr.best1RM, units)} · макс {x.pr.maxReps} повт.</div>
                  </div>
                  <div className="val">{fmtWeight(x.pr.maxWeight, units)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
