import { useEffect, useMemo, useState } from 'react'

const COLORS = ['var(--green)', 'var(--violet-bright)', 'var(--amber)', '#5EEAD4']

/** Разовый залп частиц при финише тренировки. Монтировать только когда celebrate. */
export default function Confetti({ count = 26 }: { count?: number }) {
  const [gone, setGone] = useState(false)
  const parts = useMemo(() => Array.from({ length: count }, () => ({
    cx: (Math.random() * 2 - 1) * 150,        // разлёт по X, px
    cy: -70 - Math.random() * 200,            // вверх, px
    cr: (Math.random() * 2 - 1) * 300,        // вращение, deg
    d: 900 + Math.random() * 500,             // длительность, ms
    dl: Math.random() * 160,                  // задержка, ms
    s: 6 + Math.random() * 4,                 // размер, px
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  })), [count])
  useEffect(() => { const t = setTimeout(() => setGone(true), 1900); return () => clearTimeout(t) }, [])
  if (gone) return null
  return (
    <div className="confetti" aria-hidden="true">
      {parts.map((p, i) => (
        <i key={i} style={{
          background: p.c, width: p.s, height: p.s * 0.6,
          animationDuration: `${p.d}ms`, animationDelay: `${p.dl}ms`,
          ['--cx' as string]: `${p.cx}px`, ['--cy' as string]: `${p.cy}px`, ['--cr' as string]: `${p.cr}deg`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}
