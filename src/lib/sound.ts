// Короткий WebAudio-сигнал по окончании таймера отдыха. Без ассетов и зависимостей.

let ctx: AudioContext | null = null

/** Разблокировать/создать AudioContext на пользовательском жесте (нужно для iOS). */
export function primeAudio(): void {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* нет WebAudio — молча */ }
}

/** Двойной короткий бип + вибро. Вызывать по окончании таймера, если soundOn. */
export function chime(): void {
  try {
    if (!ctx) primeAudio()
    if (ctx) {
      const now = ctx.currentTime
      ;[880, 1180].forEach((f, i) => {
        const o = ctx!.createOscillator(), g = ctx!.createGain()
        o.type = 'sine'; o.frequency.value = f
        const t = now + i * 0.14
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
        o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + 0.14)
      })
    }
  } catch { /* игнор */ }
  if ('vibrate' in navigator) navigator.vibrate?.([90, 40, 90]) // iOS PWA игнорирует — ок
}
