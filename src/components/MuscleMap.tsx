// Силуэт спереди/сзади с подсветкой мышц по свежести. Схематичный, а не
// анатомический: на 150px ширины блоки читаются лучше контуров, и каждая зона
// остаётся узнаваемой. Карта — только индикатор; выбор мышцы идёт списком
// рядом (зона в 12px — не тач-цель).

import { MUSCLES, type Muscle } from '../types'
import type { MuscleLoad, MuscleState } from '../lib/calc'

export const STATE_LABEL: Record<MuscleState, string> = {
  recovering: 'восстанавливается',
  worked: 'недавняя нагрузка',
  ready: 'готова',
  neglected: 'давно не было',
}

const STATE_ORDER: MuscleState[] = ['recovering', 'worked', 'ready', 'neglected']

// [x, y, w, h, rx] в системе 100×196; правая сторона зеркалит левую
type Rect = [number, number, number, number, number]

const FRONT: { m: Muscle; rects: Rect[] }[] = [
  { m: 'side-delt', rects: [[16, 28, 14, 13, 6], [70, 28, 14, 13, 6]] },
  { m: 'front-delt', rects: [[31, 30, 11, 10, 5], [58, 30, 11, 10, 5]] },
  { m: 'chest', rects: [[33, 43, 34, 19, 6]] },
  { m: 'biceps', rects: [[15, 44, 12, 21, 6], [73, 44, 12, 21, 6]] },
  { m: 'abs', rects: [[38, 65, 24, 28, 6]] },
  { m: 'quads', rects: [[34, 97, 15, 46, 7], [51, 97, 15, 46, 7]] },
]

const BACK: { m: Muscle; rects: Rect[] }[] = [
  { m: 'rear-delt', rects: [[16, 28, 14, 13, 6], [70, 28, 14, 13, 6]] },
  { m: 'upper-back', rects: [[33, 24, 34, 22, 7]] },
  { m: 'triceps', rects: [[15, 44, 12, 21, 6], [73, 44, 12, 21, 6]] },
  { m: 'lats', rects: [[32, 49, 36, 26, 7]] },
  { m: 'lower-back', rects: [[38, 78, 24, 16, 6]] },
  { m: 'glutes', rects: [[33, 97, 34, 19, 8]] },
  { m: 'hamstrings', rects: [[34, 119, 15, 33, 7], [51, 119, 15, 33, 7]] },
  { m: 'calves', rects: [[36, 155, 12, 32, 6], [52, 155, 12, 32, 6]] },
]

// нейтральные части — не мышцы из модели, просто чтобы фигура читалась
const NEUTRAL_FRONT: Rect[] = [[45, 19, 10, 9, 3], [16, 68, 10, 24, 5], [74, 68, 10, 24, 5], [36, 147, 12, 40, 6], [52, 147, 12, 40, 6]]
const NEUTRAL_BACK: Rect[] = [[45, 19, 10, 9, 3], [16, 68, 10, 24, 5], [74, 68, 10, 24, 5]]

function Figure({ parts, neutral, byMuscle, selected, label }: {
  parts: { m: Muscle; rects: Rect[] }[]
  neutral: Rect[]
  byMuscle: Partial<Record<Muscle, MuscleLoad>>
  selected?: Muscle | null
  label: string
}) {
  return (
    <svg className="mm-fig" viewBox="0 0 100 196" role="img" aria-label={label}>
      <circle className="mm-n" cx="50" cy="13" r="9" />
      {neutral.map(([x, y, w, h, r], i) => (
        <rect className="mm-n" key={i} x={x} y={y} width={w} height={h} rx={r} />
      ))}
      {parts.map(({ m, rects }) =>
        rects.map(([x, y, w, h, r], i) => (
          <rect
            key={m + i}
            className={`mm-m s-${byMuscle[m]?.state ?? 'neglected'}${selected === m ? ' on' : ''}`}
            x={x} y={y} width={w} height={h} rx={r}
          >
            <title>{MUSCLES[m].label}</title>
          </rect>
        )),
      )}
    </svg>
  )
}

export default function MuscleMap({ loads, selected, legend = true, compact = false }: {
  loads: MuscleLoad[]
  selected?: Muscle | null
  legend?: boolean
  compact?: boolean // на «Главной» карта — виджет, а не главный герой экрана
}) {
  const byMuscle: Partial<Record<Muscle, MuscleLoad>> = {}
  for (const l of loads) byMuscle[l.muscle] = l

  return (
    <div className={'mmap' + (compact ? ' compact' : '')}>
      <div className="mm-figs">
        <Figure parts={FRONT} neutral={NEUTRAL_FRONT} byMuscle={byMuscle} selected={selected} label="Мышцы спереди" />
        <Figure parts={BACK} neutral={NEUTRAL_BACK} byMuscle={byMuscle} selected={selected} label="Мышцы сзади" />
      </div>
      {legend && (
        <div className="mm-legend">
          {STATE_ORDER.map((s) => (
            <span key={s}><i className={`mm-dot s-${s}`} />{STATE_LABEL[s]}</span>
          ))}
        </div>
      )}
    </div>
  )
}
