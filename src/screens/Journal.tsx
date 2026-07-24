import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { sessionVolume } from '../lib/calc'
import { fmtDayShort, plural, startOfWeek, toTons } from '../lib/util'
import type { WorkoutSession } from '../types'

const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

function durationMin(s: WorkoutSession) {
  if (!s.finishedAt) return null
  return Math.max(1, Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
}
function exerciseCount(s: WorkoutSession) {
  return new Set(s.sets.map((x) => x.exerciseId)).size
}

export default function Journal() {
  const { data } = useStore()
  const nav = useNavigate()
  const sessions = [...data.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const monday = startOfWeek(new Date())
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 864e5))
  const doneDates = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()))
  const todayStr = new Date().toDateString()

  const thisWeekStart = monday.getTime()
  const lastWeekStart = thisWeekStart - 7 * 864e5
  const groups: { title: string; items: WorkoutSession[] }[] = [
    { title: 'Эта неделя', items: [] },
    { title: 'Прошлая неделя', items: [] },
    { title: 'Ранее', items: [] },
  ]
  for (const s of sessions) {
    const t = new Date(s.startedAt).getTime()
    if (t >= thisWeekStart) groups[0].items.push(s)
    else if (t >= lastWeekStart) groups[1].items.push(s)
    else groups[2].items.push(s)
  }

  return (
    <div className="screen">
      <div className="appbar">
        <div><h1>Журнал</h1><div className="sub">История тренировок</div></div>
      </div>

      <div className="weekstrip">
        {weekDays.map((d, i) => {
          const done = doneDates.has(d.toDateString())
          const today = d.toDateString() === todayStr
          return (
            <div key={i} className={'wd' + (done ? ' done' : '') + (today ? ' today' : '')}>
              <div className="w">{WD[i]}</div>
              <div className="n">{d.getDate()}</div>
              {done && <div className="dot" />}
            </div>
          )
        })}
      </div>

      {sessions.length === 0 && (
        <div className="empty">
          <Icon name="book" />
          <div className="et">Журнал пуст</div>
          <div className="ed">Заверши тренировку — она появится здесь с объёмом и рекордами.</div>
        </div>
      )}

      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.title}>
            <div className="sec-label">{g.title} · {g.items.length} {plural(g.items.length, 'тренировка', 'тренировки', 'тренировок')}</div>
            <div className="card">
              {g.items.map((s) => {
                const { dd, mm } = fmtDayShort(s.startedAt)
                const dur = durationMin(s)
                return (
                  <div className="log" key={s.id} onClick={() => nav(`/session/${s.id}`)}>
                    <div className="dcol"><div className="dd">{dd}</div><div className="dm">{mm}</div></div>
                    <div className="body">
                      <div className="nm">{s.programName} · {s.dayLabel}</div>
                      <div className="mt">
                        {dur && <span><Icon name="clock" style={{ fontSize: 12 }} /> {dur} мин</span>}
                        <span>{exerciseCount(s)} упр</span>
                      </div>
                    </div>
                    <div className="vol"><div className="v">{toTons(sessionVolume(s))} т</div><div className="k">объём</div></div>
                  </div>
                )
              })}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
