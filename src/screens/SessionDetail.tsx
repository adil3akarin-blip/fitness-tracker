import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { sessionVolume } from '../lib/calc'
import { fmtLong, weekday } from '../lib/util'
import { fmtVolume, fmtWeight } from '../lib/units'
import Confetti from '../components/Confetti'
import type { LoggedSet } from '../types'

/** Плавная накрутка 0→target (rAF, easeOutCubic). При enabled=false сразу target. */
function useCountUp(target: number, enabled: boolean, dur = 900): number {
  const [v, setV] = useState(enabled ? 0 : target)
  useEffect(() => {
    if (!enabled) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      setV(target * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled, dur])
  return v
}

export default function SessionDetail() {
  const { id } = useParams()
  const { data, exerciseById, deleteSession } = useStore()
  const units = data.settings.units
  const nav = useNavigate()
  const location = useLocation()
  const session = data.sessions.find((s) => s.id === id)

  // захватить один раз, затем стереть из истории — reload не должен повторять праздник
  const [celebrate] = useState(() => Boolean((location.state as any)?.celebrate))
  useEffect(() => { if (celebrate) window.history.replaceState({}, '') }, [celebrate])
  const rm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const en = celebrate && !rm

  const dur = session?.finishedAt
    ? Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    : null
  // счётчики статов накручиваются при финише (хуки вызываются безусловно)
  const durV = Math.round(useCountUp(dur ?? 0, en))
  const volV = useCountUp(session ? sessionVolume(session) : 0, en)
  const setsV = Math.round(useCountUp(session?.sets.length ?? 0, en))

  if (!session) {
    return (
      <div className="screen">
        <div className="appbar push"><button className="back" onClick={() => nav('/journal')}><Icon name="chev-l" /></button><div><h1>Тренировка</h1></div></div>
        <div className="empty"><Icon name="book" /><div className="et">Тренировка не найдена</div></div>
      </div>
    )
  }

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
    <div className={'screen' + (celebrate ? ' celebrate' : '')}>
      <div className="appbar push">
        <button className="back" onClick={() => nav('/journal')}><Icon name="chev-l" /></button>
        <div><h1>{fmtLong(session.startedAt)}</h1><div className="sub">{session.programName} · {session.dayLabel} · {weekday(session.startedAt)}</div></div>
      </div>

      <div className="stat-row" style={{ marginTop: 2 }}>
        <div className="stat"><div className="v">{dur === null ? '—' : durV}<small> мин</small></div><div className="k">время</div></div>
        <div className="stat"><div className="v">{fmtVolume(volV, units).value}<small> {fmtVolume(volV, units).unit}</small></div><div className="k">объём</div></div>
        <div className="stat"><div className="v">{setsV}</div><div className="k">подходов</div></div>
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
                  <span className="val">{s.weight > 0 ? `${fmtWeight(s.weight, units)} × ${s.reps}` : `${s.reps} повт.`}</span>
                  {s.warmup ? (
                    <span className="chip" style={{ padding: '3px 9px' }}>разминка</span>
                  ) : s.weight === topW && topW > 0 ? (
                    <span className="chip" style={{ padding: '3px 9px', background: 'var(--green-soft)', borderColor: 'rgba(34,197,94,.4)', color: 'var(--green)' }}>
                      <Icon name="award" style={{ fontSize: 12 }} /> топ
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtWeight(s.weight * s.reps, units)}</span>
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

      {celebrate && !rm && <Confetti />}
    </div>
  )
}
