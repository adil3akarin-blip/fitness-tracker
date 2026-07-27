// Уточнение мышц для своего упражнения. Тап — основная, ещё тап —
// вспомогательная, третий — снять: два отдельных списка (основные/вспомогательные)
// заняли бы вдвое больше экрана при том же смысле. Мышцы выбранной группы идут
// первыми — в 90% случаев нужны именно они.

import { MUSCLES, MUSCLE_IDS, type Muscle, type MuscleGroup } from '../types'

export default function MusclePicker({ group, primary, secondary, onChange }: {
  group: MuscleGroup
  primary: Muscle[]
  secondary: Muscle[]
  onChange: (primary: Muscle[], secondary: Muscle[]) => void
}) {
  // sort стабилен — внутри «своих» и «чужих» порядок остаётся анатомическим
  const ordered = [...MUSCLE_IDS].sort(
    (a, b) => Number(MUSCLES[b].group === group) - Number(MUSCLES[a].group === group),
  )

  const cycle = (m: Muscle) => {
    if (primary.includes(m)) onChange(primary.filter((x) => x !== m), [...secondary, m])
    else if (secondary.includes(m)) onChange(primary, secondary.filter((x) => x !== m))
    else onChange([...primary, m], secondary)
  }

  return (
    <div className="field">
      <label>Какие мышцы работают</label>
      <div className="mpick">
        {ordered.map((m) => (
          <button
            key={m}
            type="button"
            className={'mp' + (primary.includes(m) ? ' p' : secondary.includes(m) ? ' s' : '')}
            onClick={() => cycle(m)}
          >
            {MUSCLES[m].label}
          </button>
        ))}
      </div>
      <div className="mp-hint">
        {primary.length || secondary.length
          ? 'Тап — основная, ещё тап — вспомогательная (полдоли работы), третий — снять'
          : `Необязательно, но без уточнения карта мышц размажет нагрузку по всей группе «${group}»`}
      </div>
    </div>
  )
}
