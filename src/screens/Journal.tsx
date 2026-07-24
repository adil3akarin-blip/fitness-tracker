import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { sessionVolume } from '../lib/calc'
import { fmtDayShort, fmtLong, plural, startOfWeek, toTons } from '../lib/util'
import type { WorkoutSession } from '../types'

const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const WEEK_MS = 7 * 864e5

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

  const [weekOffset, setWeekOffset] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)

  const realMonday = startOfWeek(new Date())
  const monday = new Date(realMonday.getTime() + weekOffset * WEEK_MS)
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 864e5))
  const doneDates = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()))
  const todayStr = new Date().toDateString()

  const [pickerYear, setPickerYear] = useState(monday.getFullYear())
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth()
  // месяцы, в которых есть тренировки — чтобы подсветить их в пикере
  const monthsWithData = new Set(sessions.map((s) => {
    const d = new Date(s.startedAt)
    return `${d.getFullYear()}-${d.getMonth()}`
  }))

  function openPicker() {
    setPickerYear(monday.getFullYear())
    setPickerOpen(true)
  }
  function jumpToMonth(month: number) {
    // если в месяце есть тренировки — встаём на неделю первой из них, иначе на 1-е число
    const inMonth = sessions
      .map((s) => new Date(s.startedAt))
      .filter((d) => d.getFullYear() === pickerYear && d.getMonth() === month)
      .sort((a, b) => a.getTime() - b.getTime())
    const anchor = inMonth[0] ?? new Date(pickerYear, month, 1)
    const target = startOfWeek(anchor)
    setWeekOffset(Math.round((target.getTime() - realMonday.getTime()) / WEEK_MS))
    setPickerOpen(false)
  }

  // первую тренировку конкретного дня — чтобы открыть по клику на день недели
  const sessionByDate = new Map<string, WorkoutSession>()
  for (const s of sessions) {
    const key = new Date(s.startedAt).toDateString()
    if (!sessionByDate.has(key)) sessionByDate.set(key, s)
  }

  const weekLabel =
    weekOffset === 0 ? 'Эта неделя' : weekOffset === -1 ? 'Прошлая неделя' : `${fmtLong(monday.toISOString())} — ${fmtLong(weekDays[6].toISOString())}`

  // группировка списка привязана к реальной текущей неделе, а не к просматриваемой
  const thisWeekStart = realMonday.getTime()
  const lastWeekStart = thisWeekStart - WEEK_MS
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

      <div className="weeknav">
        <button className="wnav" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Прошлая неделя">
          <Icon name="chev-l" />
        </button>
        <button className="wtitle" onClick={openPicker}>
          {weekLabel}
          <Icon name="chev-d" style={{ fontSize: 14, marginLeft: 4 }} />
        </button>
        <button
          className="wnav"
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset >= 0}
          aria-label="Следующая неделя"
        >
          <Icon name="chev-r" />
        </button>
      </div>

      {pickerOpen && (
        <div className="picker-back" onClick={() => setPickerOpen(false)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-year">
              <button className="wnav" onClick={() => setPickerYear((y) => y - 1)} aria-label="Прошлый год">
                <Icon name="chev-l" />
              </button>
              <div className="py">{pickerYear}</div>
              <button
                className="wnav"
                onClick={() => setPickerYear((y) => Math.min(curYear, y + 1))}
                disabled={pickerYear >= curYear}
                aria-label="Следующий год"
              >
                <Icon name="chev-r" />
              </button>
            </div>
            <div className="picker-months">
              {MONTHS.map((m, i) => {
                const future = pickerYear > curYear || (pickerYear === curYear && i > curMonth)
                const active = monday.getFullYear() === pickerYear && monday.getMonth() === i
                const hasData = monthsWithData.has(`${pickerYear}-${i}`)
                return (
                  <button
                    key={i}
                    className={'pm' + (active ? ' active' : '') + (hasData ? ' has' : '')}
                    disabled={future}
                    onClick={() => jumpToMonth(i)}
                  >
                    {m}
                    {hasData && <span className="pdot" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="weekstrip">
        {weekDays.map((d, i) => {
          const key = d.toDateString()
          const done = doneDates.has(key)
          const today = key === todayStr
          const s = sessionByDate.get(key)
          return (
            <div
              key={i}
              className={'wd' + (done ? ' done' : '') + (today ? ' today' : '') + (s ? ' tap' : '')}
              onClick={s ? () => nav(`/session/${s.id}`) : undefined}
            >
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
