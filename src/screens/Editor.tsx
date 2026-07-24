import { useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { mmss, uid } from '../lib/util'
import type { Program, ProgramDay } from '../types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DEFAULT_REST_SEC = 120 // отдых для только что добавленного упражнения

const stepBtn: CSSProperties = { width: 26, height: 26, border: 0, background: 'var(--bg)', color: 'var(--green)', borderRadius: 7, cursor: 'pointer', display: 'grid', placeItems: 'center' }

function Step({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button style={stepBtn} onClick={() => onChange(value - 1)}><Icon name="minus" style={{ fontSize: 14 }} /></button>
      <b style={{ minWidth: 16, textAlign: 'center' }}>{value}</b>
      <button style={stepBtn} onClick={() => onChange(value + 1)}><Icon name="plus" style={{ fontSize: 14 }} /></button>
    </span>
  )
}

/** Отдых между подходами — шаг 15 с, 0:00…10:00. */
function RestStep({ sec, onChange }: { sec: number; onChange: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12 }}>
      <Icon name="clock" style={{ fontSize: 13 }} /> отдых
      <button style={stepBtn} onClick={() => onChange(sec - 15)}><Icon name="minus" style={{ fontSize: 14 }} /></button>
      <b style={{ minWidth: 34, textAlign: 'center', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{mmss(sec)}</b>
      <button style={stepBtn} onClick={() => onChange(sec + 15)}><Icon name="plus" style={{ fontSize: 14 }} /></button>
    </span>
  )
}

export default function Editor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, saveProgram, deleteProgram, exerciseById } = useStore()

  const [draft, setDraft] = useState<Program>(() => {
    const found = id && id !== 'new' ? data.programs.find((p) => p.id === id) : undefined
    if (found) return structuredClone(found)
    const now = new Date().toISOString()
    return {
      id: uid(), ownerId: data.userId, name: '', note: '', isDraft: true, createdAt: now, updatedAt: now,
      days: [{ id: uid(), letter: 'A', name: 'Новый день', items: [] }],
    }
  })

  const patch = (p: Partial<Program>) => setDraft((d) => ({ ...d, ...p }))
  const updateDay = (dayId: string, fn: (d: ProgramDay) => ProgramDay) =>
    setDraft((d) => ({ ...d, days: d.days.map((day) => (day.id === dayId ? fn(day) : day)) }))

  const addItem = (dayId: string, exerciseId: string) =>
    updateDay(dayId, (day) => ({
      ...day,
      items: [...day.items, { id: uid(), exerciseId, targetSets: 3, repsMin: 10, repsMax: 10, restSec: DEFAULT_REST_SEC }],
    }))
  const removeItem = (dayId: string, itemId: string) =>
    updateDay(dayId, (day) => ({ ...day, items: day.items.filter((it) => it.id !== itemId) }))
  const addDay = () =>
    setDraft((d) => ({ ...d, days: [...d.days, { id: uid(), letter: LETTERS[d.days.length] ?? '•', name: 'Новый день', items: [] }] }))
  const removeDay = (dayId: string) => setDraft((d) => ({ ...d, days: d.days.filter((day) => day.id !== dayId) }))

  const save = () => {
    saveProgram({ ...draft, name: draft.name.trim() || 'Без названия', isDraft: draft.days.some((d) => d.items.length === 0) })
    nav('/programs')
  }

  const selectStyle: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--muted)', fontSize: 13, marginTop: 4 }

  return (
    <div className="screen">
      <div className="appbar push">
        <button className="back" onClick={() => nav('/programs')}><Icon name="chev-l" /></button>
        <div><h1>{id === 'new' ? 'Новая программа' : 'Программа'}</h1></div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={save}>Готово</button>
      </div>

      <div className="field"><label>Название</label><input value={draft.name} placeholder="напр. Full Body" onChange={(e) => patch({ name: e.target.value })} /></div>
      <div className="field"><label>Описание</label><input value={draft.note} placeholder="напр. 3 дня в неделю" onChange={(e) => patch({ note: e.target.value })} /></div>

      <div className="sec-label">Дни программы</div>
      {draft.days.map((day) => (
        <div className="prog" style={{ marginBottom: 10 }} key={day.id}>
          <div className="prog-head" style={{ cursor: 'default' }}>
            <div className="lbadge">{day.letter}</div>
            <input className="search" style={{ padding: '9px 11px', margin: 0, flex: 1 }} value={day.name} onChange={(e) => updateDay(day.id, (d) => ({ ...d, name: e.target.value }))} />
            {draft.days.length > 1 && <button className="rm" style={{ marginLeft: 4 }} onClick={() => removeDay(day.id)}><Icon name="x" /></button>}
          </div>
          <div className="days" style={{ padding: 10 }}>
            {day.items.map((it) => {
              const ex = exerciseById(it.exerciseId)
              return (
                <div className="plan" key={it.id}>
                  <div className="pn">{ex?.name ?? '—'}<small>{ex ? `${ex.muscleGroup} · ${ex.equipment}` : ''}</small></div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <Step value={it.targetSets} onChange={(v) => updateDay(day.id, (d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, targetSets: clamp(v, 1, 10) } : x)) }))} />
                      <span style={{ color: 'var(--muted)' }}>×</span>
                      <Step value={it.repsMin} onChange={(v) => updateDay(day.id, (d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, repsMin: clamp(v, 1, 30), repsMax: clamp(v, 1, 30) } : x)) }))} />
                    </div>
                    <RestStep sec={it.restSec} onChange={(v) => updateDay(day.id, (d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? { ...x, restSec: clamp(v, 0, 600) } : x)) }))} />
                  </div>
                  <button className="rm" onClick={() => removeItem(day.id, it.id)}><Icon name="x" /></button>
                </div>
              )
            })}
            <select
              style={selectStyle}
              value=""
              onChange={(e) => { if (e.target.value) addItem(day.id, e.target.value) }}
            >
              <option value="">＋ Добавить упражнение…</option>
              {data.exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
        </div>
      ))}

      <button className="btn btn-ghost" onClick={addDay}><Icon name="plus" /> Добавить день</button>

      {id !== 'new' && data.programs.some((p) => p.id === draft.id) && (
        <button
          className="wk-discard"
          onClick={() => {
            if (confirm('Удалить программу? Это действие необратимо.')) {
              deleteProgram(draft.id)
              nav('/programs')
            }
          }}
        >
          Удалить программу
        </button>
      )}
    </div>
  )
}
