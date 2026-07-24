import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { SCHEMA_VERSION } from '../lib/storage'
import { Icon } from '../icons'
import type { AppData } from '../types'

/** Не доверяем содержимому импортируемого файла: проверяем версию схемы и форму. */
function isValidAppData(x: unknown): x is AppData {
  const d = x as AppData
  return !!d && typeof d === 'object'
    && d.schemaVersion === SCHEMA_VERSION
    && Array.isArray(d.exercises) && Array.isArray(d.programs)
    && Array.isArray(d.sessions) && !!d.settings && typeof d.settings === 'object'
    && typeof d.userId === 'string'
}

export default function Settings() {
  const { data, updateSettings, clearDemo, resetAll, replaceAll } = useStore()
  const nav = useNavigate()
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // позволить повторный выбор того же файла
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isValidAppData(parsed)) {
          alert('Файл не похож на резервную копию (несовместимая версия или структура).')
          return
        }
        if (confirm('Импорт заменит все текущие данные — программы, историю, настройки. Продолжить?')) {
          replaceAll(parsed)
          nav('/')
        }
      } catch {
        alert('Не удалось прочитать JSON.')
      }
    }
    reader.readAsText(file)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fitness-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen">
      <div className="appbar push">
        <button className="back" onClick={() => nav('/')}><Icon name="chev-l" /></button>
        <div><h1>Настройки</h1></div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="pr-emoji" style={{ width: 44, height: 44 }}><Icon name="user" style={{ fontSize: 22 }} /></div>
        <div>
          <div style={{ fontWeight: 700 }}>@you</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Данные хранятся локально на устройстве</div>
        </div>
      </div>

      <div className="sec-label">Тренировка</div>
      <div className="card">
        <div className="srow">
          <div><div className="sk">Единицы веса</div></div>
          <div className="sr seg">
            <button className={s.units === 'kg' ? 'on' : ''} onClick={() => updateSettings({ units: 'kg' })}>кг</button>
            <button className={s.units === 'lb' ? 'on' : ''} onClick={() => updateSettings({ units: 'lb' })}>фунты</button>
          </div>
        </div>
        <div className="srow">
          <div><div className="sk">Звук и вибрация</div><div className="sd">по окончании таймера</div></div>
          <button className={'switch' + (s.soundOn ? ' on' : '')} onClick={() => updateSettings({ soundOn: !s.soundOn })}><i /></button>
        </div>
      </div>

      <div className="sec-label">Оформление</div>
      <div className="card">
        <div className="srow">
          <div><div className="sk">Тема</div><div className="sd">светлая — в планах</div></div>
          <div className="sr"><span className="chip">Тёмная</span></div>
        </div>
      </div>

      <div className="sec-label">Данные</div>
      <div className="card">
        <button className="srow" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }} onClick={exportJson}>
          <div className="sk">Экспорт в JSON</div><div className="sr chev"><Icon name="chev-r" /></div>
        </button>
        <button className="srow" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }} onClick={() => fileRef.current?.click()}>
          <div className="sk">Импорт из JSON</div><div className="sr chev"><Icon name="chev-r" /></div>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        <button className="srow" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}
          onClick={() => { if (confirm('Очистить программы и историю? Каталог упражнений останется.')) clearDemo() }}>
          <div className="sk">Очистить демо-данные</div><div className="sr chev"><Icon name="chev-r" /></div>
        </button>
        <button className="srow danger" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}
          onClick={() => { if (confirm('Сбросить всё и вернуть демо-данные?')) resetAll() }}>
          <div className="sk">Сбросить всё</div><div className="sr chev" style={{ color: 'var(--red)' }}><Icon name="chev-r" /></div>
        </button>
      </div>
      <p style={{ color: 'var(--dim)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>Fitness Tracker · v0.1 · офлайн-first PWA</p>
    </div>
  )
}
