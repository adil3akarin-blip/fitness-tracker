import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon } from '../icons'
import { plural } from '../lib/util'
import { Collapse } from '../components/Collapse'
import type { Program } from '../types'

export default function Programs() {
  const { data, exerciseById } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.programs.map((p, i) => [p.id, i === 0])),
  )

  const dayNames = (p: Program, dayIdx: number) =>
    p.days[dayIdx].items
      .map((it) => exerciseById(it.exerciseId)?.name.split(' ')[0])
      .filter(Boolean)
      .join(', ')

  return (
    <div className="screen">
      <div className="appbar">
        <div>
          <h1>Программы</h1>
          <div className="sub">Твои планы тренировок</div>
        </div>
        <button className="icon-btn" onClick={() => nav('/programs/new/edit')}><Icon name="plus" /></button>
      </div>

      {data.programs.length === 0 && (
        <div className="empty">
          <Icon name="folder" />
          <div className="et">Программ пока нет</div>
          <div className="ed">Создай план с днями и упражнениями, чтобы начать тренироваться.</div>
        </div>
      )}

      {data.programs.map((p, pi) => (
        <div className="prog" key={p.id}>
          <div className="prog-head" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>
            <div className="prog-cover" style={pi > 0 ? { background: 'linear-gradient(140deg,#0ea5e9,#2563eb)' } : undefined}>
              <Icon name={pi > 0 ? 'dumbbell' : 'folder'} />
            </div>
            <div>
              <div className="nm">{p.name}</div>
              <div className="mt">{p.days.length} {plural(p.days.length, 'день', 'дня', 'дней')} · {p.isDraft ? 'черновик' : 'активна'}</div>
            </div>
            <span className={'caret' + (open[p.id] ? ' up' : '')}><Icon name="chev-d" /></span>
          </div>
          <Collapse open={!!open[p.id]}>
            <div className="days">
              {p.days.map((d, di) => {
                const empty = d.items.length === 0
                return (
                  <div className="day" key={d.id} onClick={() => nav(empty ? `/programs/${p.id}/edit` : `/workout/${p.id}/${d.id}`)}>
                    <div className="badge">{d.letter}</div>
                    <div>
                      <div className="dn">День {d.letter} · {d.name}</div>
                      <div className="de">{empty ? 'Пусто — добавь упражнения' : dayNames(p, di)}</div>
                    </div>
                    <div className="go">{empty ? <>Заполнить <Icon name="pencil" /></> : <>Начать <Icon name="chev-r" /></>}</div>
                  </div>
                )
              })}
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => nav(`/programs/${p.id}/edit`)}>
                <Icon name="pencil" /> Изменить программу
              </button>
            </div>
          </Collapse>
        </div>
      ))}

      <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => nav('/programs/new/edit')}>
        <Icon name="plus" /> Создать программу
      </button>

      <div className="sec-label">Каталог упражнений</div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => nav('/catalog')}>
        <div className="eic" style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
          <Icon name="dumbbell" style={{ fontSize: 19 }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.exercises.length} упражнений</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Базовые + твои. Добавляй свои</div>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--dim)', display: 'flex' }}><Icon name="chev-r" style={{ fontSize: 16 }} /></span>
      </div>
    </div>
  )
}
