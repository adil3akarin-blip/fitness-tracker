import { useEffect, useRef } from 'react'
import { BAR_KG, platesPerSide } from '../lib/plates'
import { ruNum } from '../lib/util'
import type { Equipment } from '../types'

/** «Живая» визуализация веса над степпером. Чистый рендер: ничего не пишет,
 *  ввод не перехватывает (pointer-events: none на обёртке). */
export default function WeightVisual({ equipment, weight, reps }: {
  equipment?: Equipment
  weight: number
  reps: number
}) {
  if (!equipment) return null
  switch (equipment) {
    case 'Штанга':
      return <div className="wv"><Barbell weight={weight} /></div>
    case 'Гантели':
      return <div className="wv"><Dumbbell weight={weight} /></div>
    case 'Блок':
    case 'Тренажёр':
      return <div className="wv"><Stack weight={weight} /></div>
    case 'Свой вес':
      return <div className="wv"><Tally reps={reps} /></div>
    default:
      return null
  }
}

/* ---------- Штанга ---------- */

// размеры блинов {кг: [высота, ширина]}
const PLATE_SIZE: Record<number, [number, number]> = {
  25: [96, 24], 20: [90, 22], 15: [78, 20], 10: [64, 18], 5: [48, 14], 2.5: [38, 11], 1.25: [28, 9],
}
// соревновательные цвета блинов
const PLATE_COLOR: Record<number, string> = {
  25: '#EF4444', 20: '#3B82F6', 15: '#EAB308', 10: 'var(--green)', 5: '#E5E7EB', 2.5: '#4B5563', 1.25: '#9CA3AF',
}
// цвет подписи номинала (только на блинах ≥ 10 кг)
const PLATE_INK: Record<number, string> = {
  25: 'rgba(255,255,255,.95)', 20: 'rgba(255,255,255,.95)', 15: '#4A3A05', 10: 'var(--green-ink)',
}

type PlateInst = { p: number; key: string; isNew: boolean }

// разметка блинов на сторону + флаг «новизны» экземпляра относительно прошлой раскладки
function annotate(plates: number[], prev: number[]): PlateInst[] {
  const prevCount: Record<number, number> = {}
  for (const p of prev) prevCount[p] = (prevCount[p] ?? 0) + 1
  const seen: Record<number, number> = {}
  return plates.map((p) => {
    const ord = seen[p] ?? 0
    seen[p] = ord + 1
    return { p, key: `${p}-${ord}`, isNew: ord >= (prevCount[p] ?? 0) }
  })
}

function Barbell({ weight }: { weight: number }) {
  const prevRef = useRef<number[]>([])
  const visRef = useRef<HTMLDivElement>(null)

  const { plates, remainder } = platesPerSide(weight)

  // «вздрагивание» визуала при изменении веса (перезапуск анимации без ремаунта)
  useEffect(() => {
    const el = visRef.current
    if (!el) return
    el.classList.remove('wv-bump')
    void el.offsetWidth
    el.classList.add('wv-bump')
  }, [weight])

  // фиксируем текущую раскладку для сравнения на следующем рендере
  const marked = annotate(plates, prevRef.current)
  useEffect(() => {
    prevRef.current = plates
  })

  if (weight <= 0) return null

  const tooLight = weight < BAR_KG

  const plate = (inst: PlateInst, side: 'l' | 'r') => {
    const [h, w] = PLATE_SIZE[inst.p]
    return (
      <div
        className="wv-bb-plate"
        key={inst.key}
        style={{
          height: h, width: w, background: PLATE_COLOR[inst.p], color: PLATE_INK[inst.p],
          animation: inst.isNew ? `wv-in-${side} 380ms cubic-bezier(.22,1,.36,1)` : undefined,
        }}
      >
        {inst.p >= 10 ? <span>{inst.p}</span> : null}
      </div>
    )
  }

  return (
    <div className="wv-bb">
      <div className="wv-bb-vis" ref={visRef}>
        <div className="wv-bb-side wv-bb-l">
          <div className="wv-bb-sleeve" />
          {[...marked].reverse().map((inst) => plate(inst, 'l'))}
          <div className="wv-bb-lock" />
        </div>
        <div className="wv-bb-grip" />
        <div className="wv-bb-side wv-bb-r">
          <div className="wv-bb-sleeve" />
          <div className="wv-bb-lock" />
          {marked.map((inst) => plate(inst, 'r'))}
        </div>
      </div>
      <div className="wv-bb-cap">
        {tooLight ? (
          <span className="wv-mut">легче грифа ({BAR_KG} кг)</span>
        ) : plates.length === 0 ? (
          <span className="wv-mut">гриф без блинов</span>
        ) : (
          <>
            <span className="wv-acc">на сторону: {plates.map(ruNum).join(' + ')}</span>
            {remainder > 0 ? <span className="wv-mut"> · ещё {ruNum(remainder)} кг не разложить</span> : null}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Гантель ---------- */

function Dumbbell({ weight }: { weight: number }) {
  if (weight <= 0) return null
  const h = Math.min(104, 40 + weight * 1.6)
  const w = Math.min(40, 16 + weight * 0.45)
  const head = (
    <div className="wv-db-head" style={{ height: h, width: w }}>
      {weight >= 2 ? <span>{ruNum(weight)}</span> : null}
    </div>
  )
  return (
    <div className="wv-db">
      {head}
      <div className="wv-db-bar" />
      {head}
    </div>
  )
}

/* ---------- Весовой стек (Блок / Тренажёр) ---------- */

const STACK_N = 12 // 12 плит по 5 кг: 5…60 сверху вниз
const PLATE_H = 10
const PLATE_GAP = 2

function Stack({ weight }: { weight: number }) {
  if (weight <= 0) return null
  const capped = Math.min(weight, 60)
  const k = Math.max(1, Math.floor(capped / 5))
  const r = weight <= 60 ? weight - k * 5 : 0
  const pinTop = (k - 1) * (PLATE_H + PLATE_GAP) + (PLATE_H - 6) / 2

  return (
    <div className="wv-st">
      <div className="wv-st-col">
        <div className="wv-st-rod" />
        <div className="wv-st-plates">
          {Array.from({ length: STACK_N }, (_, i) => (
            <div key={i} className="wv-st-plate" style={{ background: i < k ? '#7E868E' : '#3A4046' }} />
          ))}
        </div>
        {r > 0 ? <div className="wv-st-magnet" /> : null}
        <div className="wv-st-pin" style={{ top: pinTop }} />
      </div>
    </div>
  )
}

/* ---------- Насечки (Свой вес) — привязка к повторам ---------- */

function Tally({ reps }: { reps: number }) {
  const prevRef = useRef(0)
  const prev = prevRef.current
  useEffect(() => {
    prevRef.current = reps
  })
  if (reps < 1) return null

  const drawn = Math.min(reps, 30)
  const groups = Math.ceil(drawn / 5)

  return (
    <div className="wv-tl">
      {Array.from({ length: groups }, (_, g) => {
        const sticks = Math.min(5, drawn - g * 5)
        const full = sticks === 5
        const diagNew = full && prev < (g + 1) * 5
        return (
          <div className="wv-tl-grp" key={g}>
            {Array.from({ length: sticks }, (_, j) => {
              const idx = g * 5 + j
              return (
                <i
                  key={j}
                  className="wv-tl-stick"
                  style={{ animation: idx >= prev ? 'wv-tl-stick 200ms ease' : undefined }}
                />
              )
            })}
            {full ? (
              <span className="wv-tl-diag" style={{ animation: diagNew ? 'wv-tl-diag 250ms ease' : undefined }} />
            ) : null}
          </div>
        )
      })}
      {reps > 30 ? <span className="wv-tl-more">×{reps}</span> : null}
    </div>
  )
}
