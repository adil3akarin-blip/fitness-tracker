import type { CSSProperties } from 'react'

export type IconName =
  | 'home' | 'dumbbell' | 'folder' | 'trend' | 'book' | 'gear' | 'play'
  | 'award' | 'flame' | 'plus' | 'minus' | 'x' | 'check' | 'chev-d'
  | 'chev-r' | 'chev-l' | 'clock' | 'search' | 'calendar' | 'repeat'
  | 'target' | 'user' | 'pencil'

export function Icon({ name, className, style, fill }: {
  name: IconName
  className?: string
  style?: CSSProperties
  fill?: boolean
}) {
  return (
    <svg className={'ic' + (fill ? ' fill' : '') + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

/** Скрытый спрайт со всеми иконками — монтируется один раз в корне приложения. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></symbol>
        <symbol id="i-dumbbell" viewBox="0 0 24 24"><path d="M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10" /></symbol>
        <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></symbol>
        <symbol id="i-trend" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></symbol>
        <symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6c-1.6-1-4-1.5-6-1.5S2 5 2 5v13s2-.5 4-.5 4.4.5 6 1.5" /><path d="M12 6c1.6-1 4-1.5 6-1.5S22 5 22 5v13s-2-.5-4-.5-4.4.5-6 1.5" /><path d="M12 6v13" /></symbol>
        <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path d="M7 5v14l12-7z" /></symbol>
        <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" /><path d="M9 13.5L8 21l4-2 4 2-1-7.5" /></symbol>
        <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-4.5C9.5 9.5 11 8 12 3z" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 6" /></symbol>
        <symbol id="i-chev-d" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></symbol>
        <symbol id="i-chev-r" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></symbol>
        <symbol id="i-chev-l" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></symbol>
        <symbol id="i-repeat" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.5-5.7L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.5 5.7L4 16" /><path d="M4 20v-4h4" /></symbol>
        <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></symbol>
        <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16z" /><path d="M14 6l4 4" /></symbol>
      </defs>
    </svg>
  )
}
