import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Exercise, type Muscle, type MuscleGroup } from '../types'
import { hasMuscleDetail } from '../lib/muscles'
import MusclePicker from '../components/MusclePicker'

export default function Catalog() {
  const { data, addExercise, updateExercise, deleteExercise } = useStore()
  const nav = useNavigate()

  const tryDelete = (ex: Exercise) => {
    const inProgram = data.programs.some((p) => p.days.some((d) => d.items.some((it) => it.exerciseId === ex.id)))
    if (inProgram) {
      alert('Упражнение используется в программе. Сначала удалите его из плана.')
      return
    }
    const inHistory = data.sessions.some((s) => s.sets.some((st) => st.exerciseId === ex.id))
    if (inHistory) {
      alert('С этим упражнением есть тренировки в журнале — оно сохранено для истории.')
      return
    }
    if (confirm(`Удалить упражнение «${ex.name}»?`)) deleteExercise(ex.id)
  }

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'Все'>('Все')
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null) // null = создаём новое
  const [name, setName] = useState('')
  const [mg, setMg] = useState<MuscleGroup>('Грудь')
  const [eq, setEq] = useState<Equipment>('Штанга')
  const [pri, setPri] = useState<Muscle[]>([])
  const [sec, setSec] = useState<Muscle[]>([])

  const openAdd = () => {
    setEditId(null)
    setName('')
    setMg('Грудь')
    setEq('Штанга')
    setPri([])
    setSec([])
    setShowAdd(true)
  }

  const openEdit = (ex: Exercise) => {
    setEditId(ex.id)
    setName(ex.name)
    setMg(ex.muscleGroup)
    setEq(ex.equipment)
    setPri(ex.primaryMuscles ?? [])
    setSec(ex.secondaryMuscles ?? [])
    setShowAdd(true)
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.exercises.filter(
      (e) => (group === 'Все' || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q)),
    )
  }, [data.exercises, query, group])

  const save = () => {
    if (!name.trim()) return
    const fields = {
      name: name.trim(),
      muscleGroup: mg,
      equipment: eq,
      primaryMuscles: pri.length ? pri : undefined,
      secondaryMuscles: sec.length ? sec : undefined,
    }
    if (editId) updateExercise(editId, fields)
    else addExercise(fields)
    setName('')
    setShowAdd(false)
    setEditId(null)
    setGroup('Все')
  }

  return (
    <div className="screen">
      <div className="appbar push">
        <button className="back" onClick={() => nav('/programs')}><Icon name="chev-l" /></button>
        <div><h1>Упражнения</h1></div>
        <button className="mini-edit" style={{ marginLeft: 'auto' }} onClick={() => (showAdd ? setShowAdd(false) : openAdd())}><Icon name="plus" /></button>
      </div>

      <div className="search-wrap">
        <Icon name="search" />
        <input className="search" placeholder="Поиск упражнения…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="filters">
        {(['Все', ...MUSCLE_GROUPS] as const).map((g) => (
          <div key={g} className={'f' + (group === g ? ' on' : '')} onClick={() => setGroup(g as MuscleGroup | 'Все')}>{g}</div>
        ))}
      </div>

      {showAdd && (
        <div className="card" style={{ borderColor: 'rgba(34,197,94,.4)' }}>
          <div className="field"><label>Название</label><input placeholder="напр. Жим гантелей лёжа" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Группа мышц</label>
              <select value={mg} onChange={(e) => setMg(e.target.value as MuscleGroup)}>{MUSCLE_GROUPS.map((m) => <option key={m}>{m}</option>)}</select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Оборудование</label>
              <select value={eq} onChange={(e) => setEq(e.target.value as Equipment)}>{EQUIPMENT.map((m) => <option key={m}>{m}</option>)}</select>
            </div>
          </div>
          <MusclePicker group={mg} primary={pri} secondary={sec} onChange={(p, s) => { setPri(p); setSec(s) }} />
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> {editId ? 'Сохранить изменения' : 'Сохранить упражнение'}
          </button>
        </div>
      )}

      <div className="card">
        {list.length === 0 && <div className="empty" style={{ padding: '20px 8px' }}><div className="ed">Ничего не найдено</div></div>}
        {list.map((e) => (
          <div
            className={'exrow' + (e.isCustom ? ' tap' : '')}
            key={e.id}
            onClick={e.isCustom ? () => openEdit(e) : undefined}
          >
            <div className="eic"><Icon name="dumbbell" /></div>
            <div>
              <div className="en">{e.name}</div>
              <div className="em">
                {e.muscleGroup} · {e.equipment} {e.isCustom && <span className="tag-mine">моё</span>}
                {/* карта считает такое упражнение размазанным по группе — правится тапом по строке */}
                {e.isCustom && !hasMuscleDetail(e) && <span className="tag-rough">мышцы не уточнены</span>}
              </div>
            </div>
            {e.isCustom && (
              <button
                className="exdel"
                onClick={(ev) => { ev.stopPropagation(); tryDelete(e) }}
                aria-label="Удалить упражнение"
              ><Icon name="x" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
