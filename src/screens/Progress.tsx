import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { exercisePR, isRepsBased, progressableExerciseIds, topRepsSeries, topWeightSeries } from '../lib/calc'

type Range = 30 | 90 | 9999

export default function Progress() {
  const { data, exerciseById } = useStore()
  const { sessions } = data

  const exIds = useMemo(() => progressableExerciseIds(sessions), [sessions])
  const [exId, setExId] = useState<string | undefined>(exIds[0])
  const [range, setRange] = useState<Range>(30)

  const active = exId && exIds.includes(exId) ? exId : exIds[0]
  const repsBased = active ? isRepsBased(sessions, active) : false
  const unit = repsBased ? 'повт.' : 'кг'

  const series = useMemo(() => {
    if (!active) return []
    const all = repsBased
      ? topRepsSeries(sessions, active).map((p) => ({ date: p.date, value: p.reps }))
      : topWeightSeries(sessions, active).map((p) => ({ date: p.date, value: p.weight }))
    if (range === 9999) return all
    const cutoff = Date.now() - range * 864e5
    return all.filter((p) => new Date(p.date).getTime() >= cutoff)
  }, [sessions, active, range, repsBased])

  const pr = active ? exercisePR(sessions, active) : { maxWeight: 0, best1RM: 0, maxReps: 0 }
  const values = series.map((p) => p.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, max) * 0.9
  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0
  const delta = last - first

  // для своего веса — статистика по повторам вместо весовых рекордов
  const repsStats = useMemo(() => {
    if (!repsBased || !active) return null
    let sess = 0, sets = 0
    for (const s of sessions) {
      let inThis = 0
      for (const st of s.sets) if (st.exerciseId === active && !st.warmup) { sets++; inThis++ }
      if (inThis) sess++
    }
    return { sess, sets }
  }, [sessions, active, repsBased])

  if (exIds.length === 0) {
    return (
      <div className="screen">
        <div className="appbar"><div><h1>Прогресс</h1><div className="sub">Рост нагрузки по упражнениям</div></div></div>
        <div className="empty">
          <Icon name="trend" />
          <div className="et">Пока нет данных</div>
          <div className="ed">Проведи первую тренировку — здесь появятся графики роста весов и рекорды.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="appbar"><div><h1>Прогресс</h1><div className="sub">Рост нагрузки по упражнениям</div></div></div>

      <div className="ex-pills">
        {exIds.map((id) => (
          <div key={id} className={'p' + (id === active ? ' on' : '')} onClick={() => setExId(id)}>
            {exerciseById(id)?.name}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="t"><Icon name="trend" /><span>{exerciseById(active!)?.name}</span></div>
          <div className="seg">
            <button className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>30д</button>
            <button className={range === 90 ? 'on' : ''} onClick={() => setRange(90)}>90д</button>
            <button className={range === 9999 ? 'on' : ''} onClick={() => setRange(9999)}>Всё</button>
          </div>
        </div>

        <>
            <div className="summary">
              <div><div className="big">{last} {unit}</div><div className="lbl">{repsBased ? 'макс повторов' : 'рабочий макс'}</div></div>
              {delta > 0 && (
                <div><div className="up"><Icon name="trend" style={{ fontSize: 13 }} /> {delta} {unit}</div><div className="lbl">за период</div></div>
              )}
            </div>
            {series.length === 0 ? (
              <div className="empty" style={{ padding: '24px 8px' }}><div className="ed">Нет данных за выбранный период</div></div>
            ) : (
              <div className="chart">
                {series.map((p, i) => {
                  const h = Math.max(Math.round(((p.value - min) / (max - min || 1)) * 100), 6)
                  const isLast = i === series.length - 1
                  const showVal = i % 2 === 0 || isLast
                  return (
                    <div className={'col' + (isLast ? ' last' : '')} key={i}>
                      {showVal && <span className="bv">{p.value}</span>}
                      <div className="bar" style={{ height: `${h}%` }} />
                    </div>
                  )
                })}
              </div>
            )}
          </>
      </div>

      <div className="sec-label">Личные рекорды</div>
      {repsBased ? (
        <div className="pr3">
          <div className="b"><div className="v">{pr.maxReps}<small> раз</small></div><div className="k">макс повт.</div></div>
          <div className="b"><div className="v">{repsStats?.sets ?? 0}</div><div className="k">подходов</div></div>
          <div className="b"><div className="v">{repsStats?.sess ?? 0}</div><div className="k">тренировок</div></div>
        </div>
      ) : (
        <div className="pr3">
          <div className="b"><div className="v">{pr.maxWeight}<small> кг</small></div><div className="k">макс вес</div></div>
          <div className="b"><div className="v">{pr.best1RM}<small> кг</small></div><div className="k">расч. 1ПМ</div></div>
          <div className="b"><div className="v">{pr.maxReps}<small> раз</small></div><div className="k">макс повт.</div></div>
        </div>
      )}
    </div>
  )
}
