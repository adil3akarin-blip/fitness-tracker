export const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

export const nowISO = () => new Date().toISOString()

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_LONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function fmtDayShort(iso: string) {
  const d = new Date(iso)
  return { dd: d.getDate(), mm: MONTHS_SHORT[d.getMonth()] }
}
export function fmtLong(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`
}
export function weekday(iso: string) {
  return WEEKDAYS[new Date(iso).getDay()]
}
export function mmss(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
export function clockMS(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
/** объём в тоннах, одна цифра после запятой */
export function toTons(kg: number) {
  return (kg / 1000).toFixed(1)
}

/** число с запятой вместо точки для русского UI: 2.5 → "2,5" */
export const ruNum = (n: number): string => String(n).replace('.', ',')

/** русская плюрализация: plural(1,'день','дня','дней') → 'день' */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
/** начало недели (пн) для группировки журнала */
export function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // пн=0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}
