import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../icons'

const TABS: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { to: '/', label: 'Сегодня', icon: 'home', match: (p) => p === '/' || p === '/settings' },
  { to: '/programs', label: 'Программы', icon: 'folder', match: (p) => p.startsWith('/programs') || p === '/catalog' },
  { to: '/progress', label: 'Прогресс', icon: 'trend', match: (p) => p === '/progress' },
  { to: '/journal', label: 'Журнал', icon: 'book', match: (p) => p === '/journal' || p.startsWith('/session') },
]

export function TabBar() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const idx = TABS.findIndex((t) => t.match(pathname))
  return (
    <nav className="tabbar">
      {idx >= 0 && <span className="tab-pill" style={{ transform: `translateX(calc(${idx} * (100% + 2px)))` }} />}
      {TABS.map((t) => (
        <button key={t.to} className={'tab' + (t.match(pathname) ? ' on' : '')} onClick={() => nav(t.to)}>
          <Icon name={t.icon} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
