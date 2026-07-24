import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { sessionVolume } from '../lib/calc'
import { fmtLong, toTons, weekday } from '../lib/util'
import type { LoggedSet } from '../types'

export default function SessionDetail() {
  const { id } = useParams()
  const { data, exerciseById, deleteSession } = useStore()
  const nav = useNavigate()
  const session = data.sessions.find((s) => s.id === id)

  if (!session) {
    return (
      <div className="screen">
        <div className="appbar push"><button className="back" onClick={() => nav('/journal')}><Icon name="chev-l" /></button><div><h1>Тренировка</h1></div></div>
        <div className="empty"><Icon name="book" /><div className="et">Тренировка не найдена</div></div>
      </div>
    )
  }

  const dur = session.finishedAt
    ? Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    : null

  // группировка подходов по упражнению (в порядке появления)
  const order: string[] = []
  const byEx: Record<string, LoggedSet[]> = {}
  for (const set of session.sets) {
    if (!byEx[set.exerciseId]) {
      byEx[set.exerciseId] = []
      order.push(set.exerciseId)
    }
    byEx[set.exerciseId].push(set)
  }

  return (
    <div className="screen">
      <div className="appbar push">
        <button className="back" onClick={() => nav('/journal')}><Icon name="chev-l" /></button>
        <div><h1>{fmtLong(session.startedAt)}</h1><div className="sub">{session.programName} · {session.dayLabel} · {weekday(session.startedAt)}</div></div>
      </div>

      <div className="stat-row" style={{ marginTop: 2 }}>
        <div className="stat"><div className="v">{dur ?? '—'}<small> мин</small></div><div className="k">время</div></div>
        <div className="stat"><div className="v">{toTons(sessionVolume(session))}<small> т</small></div><div className="k">объём</div></div>
        <div className="stat"><div className="v">{session.sets.length}</div><div className="k">подходов</div></div>
      </div>

      {order.map((exId) => {
        const sets = byEx[exId]
        const topW = Math.max(...sets.filter((s) => !s.warmup).map((s) => s.weight), 0)
        return (
          <div key={exId}>
            <div className="sec-label">{exerciseById(exId)?.name ?? 'Упражнение'}</div>
            <div className="card" style={{ padding: '4px 16px' }}>
              {sets.map((s, i) => (
                <div className="setrow filled" style={{ gridTemplateColumns: '34px 1fr auto' }} key={s.id}>
                  <span className="si">{i + 1}</span>
                  <span className="val">{s.weight > 0 ? `${s.weight} кг × ${s.reps}` : `${s.reps} повт.`}</span>
                  {s.warmup ? (
                    <span className="chip" style={{ padding: '3px 9px' }}>разминка</span>
                  ) : s.weight === topW && topW > 0 ? (
                    <span className="chip" style={{ padding: '3px 9px', background: 'var(--green-soft)', borderColor: 'rgba(34,197,94,.4)', color: 'var(--green)' }}>
                      <Icon name="award" style={{ fontSize: 12 }} /> топ
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.weight * s.reps} кг</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => nav(`/workout/${session.programId}/${session.dayId}`)}>
        <Icon name="repeat" /> Повторить эту тренировку
      </button>
      <button
        className="wk-discard"
        onClick={() => {
          if (confirm('Удалить эту тренировку из журнала? Это действие необратимо.')) {
            deleteSession(session.id)
            nav('/journal')
          }
        }}
      >
        Удалить тренировку
      </button>
    </div>
  )
}
