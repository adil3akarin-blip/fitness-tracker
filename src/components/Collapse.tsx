import { useEffect, useState, type ReactNode } from 'react'

/** Плавное раскрытие по высоте (grid-rows 0fr→1fr). Контент размонтируется после закрытия. */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open) // контент в DOM (держим на время анимации закрытия)
  const [grown, setGrown] = useState(open) // класс .open
  useEffect(() => {
    if (open) {
      setShown(true)
      // двойной rAF: смонтировать на 0fr, раскрыть следующим кадром — иначе transition не стартует
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
      return () => cancelAnimationFrame(id)
    }
    setGrown(false)
  }, [open])
  return (
    <div
      className={'clps' + (grown ? ' open' : '')}
      onTransitionEnd={(e) => { if (!open && e.target === e.currentTarget) setShown(false) }}
    >
      <div>{shown && children}</div>
    </div>
  )
}
