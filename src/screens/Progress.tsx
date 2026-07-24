import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { exercisePR, isRepsBased, progressableExerciseIds, topRepsSeries, topWeightSeries } from '../lib/calc'

type Range = 30 | 90 | 9999
type Pt = { date: string; value: number }

const windowed = (all: Pt[], range: Range) => {
  if (range === 9999) return all
  const cutoff = Date.now() - range * 864e5
  return all.filter((p) => new Date(p.date).getTime() >= cutoff)
}

/** Компактный спарклайн тренда упражнения. */
function Spark({ values, tone }: { values: number[]; tone: 'up' | 'down' | 'flat' }) {
  const w = 104, h = 36, pad = 4
  const color = tone === 'up' ? 'var(--green)' : tone === 'down' ? 'var(--red)' : 'var(--muted)'
  if (values.length < 2) {
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke={color} strokeWidth="2"
          strokeDasharray="2 4" strokeLinecap="round" opacity=".5" />
        {values.length === 1 && <circle cx={w - pad} cy={h / 2} r="2.6" fill={color} />}
      </svg>
    )
  }
  const mn = Math.min(...values), mx = Math.max(...values)
  const xs = values.map((_, i) => pad + (i * (w - 2 * pad)) / (values.length - 1))
  const ys = values.map((v) => (mx === mn ? h / 2 : pad + (1 - (v - mn) / (mx - mn)) * (h - 2 * pad)))
  const line = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = `${line} ${xs[xs.length - 1].toFixed(1)},${h} ${xs[0].toFixed(1)},${h}`
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity=".12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.8" fill={color} />
    </svg>
  )
}

export default function Progress() {
  const { data, exerciseById } = useStore()
  const { sessions } = data

  const exIds = useMemo(() => progressableExerciseIds(sessions), [sessions])
  const [range, setRange] = useState<Range>(30)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>('all')
  const [openId, setOpenId] = useState<string | undefined>()

  const summaries = useMemo(() => {
    return exIds
      .map((id) => {
        const ex = exerciseById(id)
        const rb = isRepsBased(sessions, id)
        const allSeries: Pt[] = rb
          ? topRepsSeries(sessions, id).map((p) => ({ date: p.date, value: p.reps }))
          : topWeightSeries(sessions, id).map((p) => ({ date: p.date, value: p.weight }))
        let sess = 0, sets = 0
        for (const s of sessions) {
          let n = 0
          for (const st of s.sets) if (st.exerciseId === id && !st.warmup) { sets++; n++ }
          if (n) sess++
        }
        return {
          id,
          name: ex?.name ?? '—',
          group: ex?.muscleGroup ?? '',
          rb,
          unit: rb ? 'повт.' : 'кг',
          allSeries,
          pr: exercisePR(sessions, id),
          sess,
          sets,
          lastDate: allSeries.length ? allSeries[allSeries.length - 1].date : '',
        }
      })
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
  }, [sessions, exIds, exerciseById])

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const s of summaries) if (s.group) set.add(s.group)
    return [...set]
  }, [summaries])

  const q = query.trim().toLowerCase()
  const shown = summaries.filter(
    (s) => (group === 'all' || s.group === group) && (!q || s.name.toLowerCase().includes(q)),
  )

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
      <div className="appbar"><div><h1>Прогресс</h1><div className="sub">Все упражнения на одном экране</div></div></div>

      <div className="prog-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения"
          inputMode="search"
        />
        {query && <button className="clr" onClick={() => setQuery('')} aria-label="Очистить"><Icon name="x" /></button>}
      </div>

      <div className="ex-pills prog-groups">
        <div className={'p' + (group === 'all' ? ' on' : '')} onClick={() => setGroup('all')}>Все</div>
        {groups.map((g) => (
          <div key={g} className={'p' + (group === g ? ' on' : '')} onClick={() => setGroup(g)}>{g}</div>
        ))}
      </div>
      <div className="prog-range">
        <div className="seg">
          <button className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>30д</button>
          <button className={range === 90 ? 'on' : ''} onClick={() => setRange(90)}>90д</button>
          <button className={range === 9999 ? 'on' : ''} onClick={() => setRange(9999)}>Всё</button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty" style={{ padding: '32px 8px' }}>
          <div className="ed">Ничего не найдено</div>
        </div>
      ) : (
        <div className="exlist">
          {shown.map((s) => {
            const win = windowed(s.allSeries, range)
            const vals = win.map((p) => p.value)
            const last = vals.length
              ? vals[vals.length - 1]
              : (s.allSeries.length ? s.allSeries[s.allSeries.length - 1].value : 0)
            const first = vals[0] ?? last
            const delta = last - first
            const tone: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
            const open = openId === s.id
            const max = Math.max(...vals, 1)
            const min = Math.min(...vals, max) * 0.9
            return (
              <div className={'prow' + (open ? ' open' : '')} key={s.id}>
                <button className="prow-head" onClick={() => setOpenId(open ? undefined : s.id)}>
                  <div className="meta">
                    <div className="nm">{s.name}</div>
                    <div className="gp">{s.group} · {s.sess} трен.</div>
                  </div>
                  <Spark values={vals} tone={tone} />
                  <div className="val">
                    <div className="cur">{last}<small> {s.unit}</small></div>
                    {delta !== 0 && vals.length > 1 && (
                      <div className={'d ' + tone}>
                        {delta > 0 ? '+' : ''}{delta} {s.unit}
                      </div>
                    )}
                  </div>
                  <Icon name="chev-d" className={'chev' + (open ? ' up' : '')} />
                </button>

                {open && (
                  <div className="prow-detail">
                    {win.length === 0 ? (
                      <div className="empty" style={{ padding: '18px 8px' }}>
                        <div className="ed">Нет данных за выбранный период</div>
                      </div>
                    ) : (
                      <div className="chart">
                        {win.map((p, i) => {
                          const hgt = Math.max(Math.round(((p.value - min) / (max - min || 1)) * 100), 6)
                          const isLast = i === win.length - 1
                          const showVal = i % 2 === 0 || isLast
                          return (
                            <div className={'col' + (isLast ? ' last' : '')} key={i}>
                              {showVal && <span className="bv">{p.value}</span>}
                              <div className="bar" style={{ height: `${hgt}%`, animationDelay: `${i * 30}ms` }} />
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {s.rb ? (
                      <div className="pr3">
                        <div className="b"><div className="v">{s.pr.maxReps}<small> раз</small></div><div className="k">макс повт.</div></div>
                        <div className="b"><div className="v">{s.sets}</div><div className="k">подходов</div></div>
                        <div className="b"><div className="v">{s.sess}</div><div className="k">тренировок</div></div>
                      </div>
                    ) : (
                      <div className="pr3">
                        <div className="b"><div className="v">{s.pr.maxWeight}<small> кг</small></div><div className="k">макс вес</div></div>
                        <div className="b"><div className="v">{s.pr.best1RM}<small> кг</small></div><div className="k">расч. 1ПМ</div></div>
                        <div className="b"><div className="v">{s.pr.maxReps}<small> раз</small></div><div className="k">макс повт.</div></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
