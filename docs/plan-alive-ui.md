# План: вторая волна анимаций — три эмоциональных пика и микро-жизнь

> Задание для исполнителя (Claude Opus). Самодостаточный документ: весь нужный контекст здесь и в указанных файлах. Состав и приоритеты утверждены владельцем проекта — следовать спецификациям ниже, не изобретать своё. Предыдущий план `docs/plan-bar-whip.md` уже реализован — читать его не обязательно, всё нужное продублировано здесь.

## Контекст и цель

PWA-трекер силовых тренировок (Vite + React 18 + TS, данные в localStorage, тёмная тема «liquid glass», UI на русском). Анимационная база уже есть:

- **Whip-система** — фирменная пружина «прогиб под весом»: кейфреймы `whip` / `whip-in` / `whip-up` в `src/index.css` (секция `/* ---- Whip ---- */`), утилита `src/lib/whip.ts` (выставляет `--whip-a`/`--whip-d` и перезапускает класс `.whipping`). Кривая затухания: `32% → 1`, `58% → −0.42`, `78% → 0.18`, `92% → −0.07`.
- Каскадный вход экранов (`.screen>*` + `whip-in` со стаггером), aurora-фон, пружинные рест-бар и прогресс-бар, дип иконки таб-бара, WeightVisual (надевание блинов), стаггер баров графика (уже сделан — не трогать).

Задача — оживить три эмоциональных пика тренировки (финиш, отдых, рекорд) и добавить микро-тактильность там, где сейчас интерфейс немой. Все новые движения — продолжение той же пружины, не новый визуальный язык.

Это чисто визуальная фича: **никаких изменений** модели данных (`src/types.ts`), стораджа (`src/lib/storage.ts`), логики записи подходов и расчётов (`src/lib/calc.ts`). Единственное исключение — `location.state.celebrate` при переходе на экран финиша (эфемерный флаг, не персистится).

## Принципы

- Ноль новых зависимостей. Анимации — чистый CSS; JS только выставляет классы/переменные и перезапускает их (приём `classList.remove` → `void el.offsetWidth` → `classList.add` — как в `whip.ts`).
- Только `transform` и `opacity`. Допустимые локальные исключения: `stroke-dashoffset` (кольцо отдыха, прорисовка галочки), `grid-template-rows` (аккордеоны — п. 6), разовая вспышка `opacity` у псевдоэлемента PR.
- Одна кривая на всё приложение. Новый кейфрейм `whip-pop` — четвёртая проекция той же пружины (на scale), см. «Ядро».
- Easing — существующая `--ease: cubic-bezier(.2,.8,.2,1)`, если явно не указан другой.
- Стиль кода как в проекте: русские комментарии, компактно. Новые классы — короткие, в духе существующих.
- `@media (prefers-reduced-motion: reduce)` — блок в конце `index.css` расширить всеми новыми селекторами (сводка в п. 7).
- Прогон на iOS standalone PWA обязателен (viewport недавно чинился — не сломать).

## Ядро: `whip-pop` и утилита `pop()`

CSS (в секцию Whip в `src/index.css`) — та же кривая затухания, спроецированная на scale с амплитудой 0.12:

```css
@keyframes whip-pop{
  0%{transform:scale(1)}
  32%{transform:scale(1.12)}
  58%{transform:scale(.95)}
  78%{transform:scale(1.02)}
  92%{transform:scale(.99)}
  100%{transform:scale(1)}
}
.popping{animation:whip-pop 260ms var(--ease)}
```

В `src/lib/whip.ts` добавить:

```ts
/** Микро-поп значения (степперы и т.п.): перезапускает класс .popping. */
export function pop(el: HTMLElement | null): void {
  if (!el) return
  el.classList.remove('popping')
  void el.offsetWidth
  el.classList.add('popping')
}
```

## 1. Праздник финиша тренировки (обязательно)

Сейчас `finish()` в `src/screens/Workout.tsx` просто делает `nav('/session/…', { replace: true })` — самый эмоциональный момент никак не отмечен.

**Флаг celebrate.** В `finish()`: `nav(\`/session/${session.id}\`, { replace: true, state: { celebrate: true } })`. В `src/screens/SessionDetail.tsx`:

```ts
const location = useLocation()
// захватить один раз, затем стереть из истории — reload не должен повторять праздник
const [celebrate] = useState(() => Boolean((location.state as any)?.celebrate))
useEffect(() => { if (celebrate) window.history.replaceState({}, '') }, [celebrate])
const rm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
```

При `celebrate` — на корневой `div.screen` добавить класс `celebrate`.

**Счётчики статов накручиваются.** Хук внутри `SessionDetail.tsx`:

```ts
/** Плавная накрутка 0→target (rAF, easeOutCubic). При enabled=false сразу target. */
function useCountUp(target: number, enabled: boolean, dur = 900): number {
  const [v, setV] = useState(enabled ? 0 : target)
  useEffect(() => {
    if (!enabled) { setV(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      setV(target * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled, dur])
  return v
}
```

Применить к трём статам (`enabled = celebrate && !rm`): минуты — `Math.round(useCountUp(dur ?? 0, en))` (если `dur` null — рендерить `'—'` как сейчас); объём — анимировать килограммы `sessionVolume(session)` и форматировать `toTons()` на каждом кадре; подходы — `Math.round(useCountUp(session.sets.length, en))`. Хуки вызывать безусловно (правила хуков), `enabled` управляет поведением.

**Конфетти.** Новый компонент `src/components/Confetti.tsx` — разовый залп из ~26 частиц, самоудаляется через ~1.9 с:

```tsx
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
```

CSS:

```css
.confetti{position:fixed;inset:0;z-index:60;pointer-events:none}
.screen>.confetti{animation:none} /* исключить из каскада whip-in: transform ломает position:fixed */
.confetti i{position:absolute;left:50%;top:34%;border-radius:2px;opacity:0;animation:conf-fly cubic-bezier(.16,.8,.3,1) both}
@keyframes conf-fly{
  0%{opacity:1;transform:none}
  70%{opacity:1}
  100%{opacity:0;transform:translate(var(--cx),var(--cy)) rotate(var(--cr))}
}
```

Рендер в `SessionDetail`: `{celebrate && !rm && <Confetti />}` (последним ребёнком `.screen`).

**Чипы «топ» подпрыгивают.** Одно CSS-правило, без изменения JSX:

```css
.celebrate .setrow .chip{animation:whip-pop .45s var(--ease) .4s both}
```

## 2. Живое кольцо таймера отдыха (обязательно)

Сейчас `.ring` в рест-баре (`Workout.tsx`, низ файла) — просто цифры `mmss(restLeft)`. Сделать настоящее кольцо, которое «стекает» по мере отдыха.

**Состояние.** Добавить `const [restTotal, setRestTotal] = useState(0)`. В `startRest(sec, label)` — также `setRestTotal(sec)`. Кнопка «+15с»:

```ts
onClick={() => { const nx = restLeft + 15; setRestLeft(nx); setRestTotal((t) => Math.max(t, nx)) }}
```

**Разметка** (вместо `<div className="ring">{mmss(restLeft)}</div>`; окружность C = 2π·24 ≈ 150.8):

```tsx
const frac = restTotal > 0 ? restLeft / restTotal : 0
const hot = restActive && restLeft <= 5
…
<div className={'ring' + (hot ? ' hot' : '')}>
  <svg viewBox="0 0 56 56">
    <circle className="tr" cx="28" cy="28" r="24" />
    <circle className="fg" cx="28" cy="28" r="24" style={{ strokeDashoffset: 150.8 * (1 - frac) }} />
  </svg>
  <div className="num">{mmss(restLeft)}</div>
</div>
```

**CSS** — существующее правило `.restbar .ring{font-size:26px;…;min-width:74px}` заменить на:

```css
.restbar .ring{position:relative;width:56px;height:56px;flex:none}
.restbar .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.restbar .ring circle{fill:none;stroke-width:4}
.restbar .ring .tr{stroke:rgba(255,255,255,.10)}
.restbar .ring .fg{stroke:var(--green);stroke-linecap:round;stroke-dasharray:150.8;transition:stroke-dashoffset 1s linear,stroke .3s}
.restbar .ring .num{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--green)}
.restbar .ring.hot .fg{stroke:var(--amber)}
.restbar .ring.hot .num{color:var(--amber);animation:tick 1s ease-out infinite}
@keyframes tick{0%{transform:scale(1.22)}35%{transform:scale(1)}100%{transform:scale(1)}}
```

`transition: stroke-dashoffset 1s linear` — кольцо стекает плавно между тиками секундного интервала. Последние 5 секунд: цвет теплеет к янтарному, цифры бьются в такт секундам.

## 3. PR-момент (обязательно)

Whip уже бьёт на максимум при рекорде (`whipLoad` → `pr === true` → 1), но визуально рекорд не отличим от просто тяжёлого подхода.

**Золотая вспышка карточки.** В `whip()` (`src/lib/whip.ts`) заменить блок перезапуска:

```ts
el.classList.remove('whipping', 'pr-flash')
void el.offsetWidth
el.classList.add('whipping')
if (input.pr) el.classList.add('pr-flash')
```

CSS (анимируется только opacity псевдоэлемента):

```css
.pr-flash{position:relative}
.pr-flash::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  border:1.5px solid var(--amber);
  box-shadow:0 0 26px rgba(251,191,36,.45),inset 0 0 22px rgba(251,191,36,.18);
  opacity:0;animation:pr-ring 900ms var(--ease) both;
}
@keyframes pr-ring{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
```

**Бейдж «PR» на строке подхода.** В `Workout.tsx` — эфемерное состояние `const [prIds, setPrIds] = useState<Set<string>>(new Set())`. В `logSet()` флаг `pr` уже вычисляется — после создания `set` добавить: `if (pr) setPrIds((p) => new Set(p).add(set.id))`. В рендере записанной строки:

```tsx
<span className="val">{…как сейчас…}{prIds.has(s.id) && <b className="pr-badge">PR</b>}</span>
```

```css
.pr-badge{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:7px;background:linear-gradient(180deg,#FDE68A,var(--amber));color:#241a03;font-size:10px;font-weight:800;letter-spacing:.04em;vertical-align:1px;animation:whip-pop .5s var(--ease) .1s both}
```

Осознанное упрощение: после выхода и восстановления активной тренировки бейджи не восстанавливаются (`prIds` не персистится) — это празднование момента, не данные.

## 4. Микро-тактильность

**4.1. Поп цифр в степперах.** Самое частое действие в приложении — ± вес/повторы — сейчас без отклика. В `Workout.tsx`: два рефа `const wNumRef = useRef<HTMLDivElement>(null)`, `const rNumRef = useRef<HTMLDivElement>(null)` — повесить на `<div className="n">` веса и повторов. В onClick всех четырёх кнопок ±, после setState — `pop(wNumRef.current)` / `pop(rNumRef.current)` (импорт `pop` из `../lib/whip`). При ручном вводе в инпут — НЕ анимировать (поп только на кнопках).

**4.2. Галочка рисует себя.** Спрайтовая иконка `#i-check` — один path `M5 12l5 5L20 6`, длина ≈ 22. `stroke-dasharray`/`dashoffset` — наследуемые свойства, проходят внутрь shadow DOM `<use>`:

```css
.setrow.filled .prev .ic{stroke-dasharray:22;animation:check-draw .3s var(--ease) both}
@keyframes check-draw{from{stroke-dashoffset:22}to{stroke-dashoffset:0}}
```

Новая строка подхода монтируется → галочка прочерчивается. При переключении карточек строки ремоунтятся и галочки перерисовываются — это допустимо (быстро и незаметно).

**4.3. Блик прогресс-бара на 100%.** В `Workout.tsx`: `className={'wk-progress' + (totalPlanned > 0 && totalDone >= totalPlanned ? ' full' : '')}`. CSS (к `.wk-progress` добавить `position:relative`; `overflow:hidden` уже есть):

```css
.wk-progress.full::after{content:"";position:absolute;top:0;bottom:0;left:0;width:36%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);animation:bar-glint .7s ease-out .15s both}
@keyframes bar-glint{from{transform:translateX(-120%)}to{transform:translateX(340%)}}
```

**4.4. Часы тренировки дышат.** CSS-only, маркер «запись идёт»:

```css
.wk-top .clock .ic{animation:clock-breathe 2.4s ease-in-out infinite}
@keyframes clock-breathe{0%,100%{opacity:.5}50%{opacity:1}}
```

**4.5. Огонёк серии на Home.** В `src/screens/Home.tsx` стат «серия» (второй в `.stat-row`) — добавить флейм при живом стрике:

```tsx
<div className="v">{streak} <small>нед</small>{streak > 0 && <Icon name="flame" className="streak-flame" />}</div>
```

```css
.streak-flame{color:var(--amber);font-size:15px;margin-left:4px;transform-origin:50% 85%;animation:flame-flicker 1.9s ease-in-out infinite}
@keyframes flame-flicker{0%,100%{transform:scale(1) rotate(-2deg)}33%{transform:scale(1.07) rotate(2deg)}66%{transform:scale(.97) rotate(-1deg)}}
```

## 5. Скользящая пилюля таб-бара

Сейчас фон активного таба (`.tab.on`) появляется мгновенно. Сделать физически переезжающую пилюлю (как в iOS). В `src/components/TabBar.tsx`:

```tsx
const idx = TABS.findIndex((t) => t.match(pathname))
…
<nav className="tabbar">
  {idx >= 0 && <span className="tab-pill" style={{ transform: `translateX(calc(${idx} * (100% + 2px)))` }} />}
  {TABS.map(…как сейчас…)}
</nav>
```

CSS (`.tabbar` уже `position:relative`; gap 2px, padding 6px, 4 таба):

```css
.tab-pill{position:absolute;left:6px;top:6px;bottom:6px;width:calc((100% - 12px - 6px)/4);border-radius:999px;background:rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);pointer-events:none;transition:transform .35s cubic-bezier(.3,1.35,.4,1)}
.tab{position:relative} /* кнопки поверх пилюли */
```

У `.tab.on` убрать `background` и `box-shadow` (цвет текста/иконки оставить). Дип иконки `.tab.on .ic` не трогать — он дополняет переезд. TabBar живёт в постоянно смонтированном Shell, поэтому transition между роутами работает сам.

## 6. Collapse: плавные раскрытия вместо телепортации

Три места раскрываются мгновенно (условный рендер): дни программы в `Programs.tsx`, детали упражнения `.prow-detail` в `Progress.tsx`, и самый резкий скачок — смена текущего упражнения в `Workout.tsx`. Решение — один переиспользуемый компонент на трюке `grid-template-rows: 0fr→1fr`.

**Компонент `src/components/Collapse.tsx`:**

```tsx
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
```

```css
.clps{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s var(--ease)}
.clps.open{grid-template-rows:1fr}
.clps>div{min-height:0;overflow:hidden}
```

Свойства: при первом рендере с `open=true` анимации нет (важно — экраны монтируются без лишнего дёрганья); контент размонтируется после закрытия (нет фоновых чартов/визуализаций в скрытых карточках).

**6.1. Programs.** `{open[p.id] && (<div className="days">…</div>)}` → `<Collapse open={!!open[p.id]}><div className="days">…</div></Collapse>`. Вращение `.caret` уже есть.

**6.2. Progress.** `{open && (<div className="prow-detail">…</div>)}` → `<Collapse open={open}>…</Collapse>`. Существующую `animation:screenIn` у `.prow-detail` оставить — фейд контента дополняет рост высоты. Открытие одной строки закрывает другую — обе анимируются.

**6.3. Workout — смена текущего упражнения.** Объединить две ветки рендера карточки в одну: каждая карточка всегда рендерит шапку `.exq-h` (с текущими условными текстами), а строки подходов + logger — внутрь `<Collapse open={isCurrent}>`:

```tsx
<div className={'exq' + (isCurrent ? ' cur' : '') + (!isCurrent && isDone ? ' done' : '')} key={item.id} ref={isCurrent ? curRef : undefined}>
  <div className="exq-h" onClick={() => !isCurrent && setCurrentId(item.id)}>…</div>
  <Collapse open={isCurrent}>
    <div>{/* setrow-строки + .logger — как в текущей ветке isCurrent */}</div>
  </Collapse>
</div>
```

`curRef` остаётся на карточке текущего упражнения — «кланк» whip работает как раньше. WeightVisual монтируется при раскрытии — его анимации надевания блинов отыгрывают сами.

## 7. Reduced motion (сводно)

Расширить существующий блок в конце `index.css`:

```css
@media (prefers-reduced-motion: reduce){
  /* …существующие правила… */
  .popping,.pr-badge,.pr-flash::after,.confetti i,.setrow.filled .prev .ic,
  .wk-progress.full::after,.wk-top .clock .ic,.streak-flame,.restbar .ring.hot .num,
  .celebrate .setrow .chip{animation:none!important}
  .clps,.tab-pill,.restbar .ring .fg{transition:none!important}
}
```

Плюс JS-гарды: конфетти не монтируется (`rm` в п. 1), count-up мгновенный (`enabled=false`).

## Порядок работ

1. Ядро: `whip-pop` + `pop()` в `whip.ts`. → `npx tsc --noEmit`
2. Финиш (п. 1): celebrate + count-up + Confetti + чипы. Прогон вживую.
3. Кольцо отдыха (п. 2).
4. PR (п. 3): `whip.ts` + бейдж + вспышка.
5. Микро-пакет (п. 4): степперы, галочка, блик, часы, флейм.
6. Таб-пилюля (п. 5).
7. Collapse (п. 6) — самый рискованный, в конце: компонент → Programs → Progress → Workout, прогон каждого экрана.
8. Reduced motion (п. 7), финальный `npm run build`.

После каждого шага — `npx tsc --noEmit` без ошибок.

## Ручная проверка (`npm run dev` → localhost:5173)

- **Финиш:** завершить тренировку с подходами → конфетти один залп, статы накручиваются, чипы «топ» подпрыгивают. Reload страницы `/session/…` — праздник НЕ повторяется. Открытие той же сессии из Журнала — обычный вид, без счётчиков и конфетти.
- **Отдых:** записать подход → кольцо стекает плавно (не скачками); «+15с» — кольцо корректно дорастает, не ломается; последние 5 с — янтарь + пульс цифр; «Пропустить» работает.
- **PR:** подход с весом выше исторического → золотая вспышка по границе карточки + бейдж «PR» на строке; обычный тяжёлый подход — без вспышки. Спам «Записать подход» — анимации перезапускаются чисто.
- **Микро:** ± в степперах — цифра пружинит (ввод с клавиатуры — нет); новая галочка прочерчивается; все подходы выполнены → блик пробегает по прогресс-бару; часы дышат; флейм на Home мерцает при стрике ≥ 1 и отсутствует при 0.
- **Таб-бар:** пилюля переезжает между всеми 4 табами с оседанием, иконка делает дип; активная вкладка корректна на вложенных роутах (`/settings` → «Сегодня», `/catalog` → «Программы», `/session/…` → «Журнал»).
- **Collapse:** Programs — раскрытие/закрытие программ плавное, первая открыта при входе без анимации; Progress — открытие строки закрывает предыдущую, обе плавно, бары растут после раскрытия; Workout — тап по другому упражнению: старая карточка схлопывается, новая раскрывается, «кланк» при записи работает, восстановление активной тренировки после reload не сломано.
- Системный reduced motion (macOS: Settings → Accessibility → Display → Reduce motion) отключает всё новое.
- iOS standalone PWA: 60fps, safe-area/viewport не сломаны, рест-бар и таб-бар на местах.
- `npm run build` чистый.

## Критерии приёмки

- [ ] Три пика оживлены: финиш (count-up + конфетти), отдых (кольцо + hot-пульс), PR (вспышка + бейдж).
- [ ] `whip-pop` — единственный новый scale-кейфрейм, коэффициенты следуют фирменной кривой (1/−0.42/0.18/−0.07 при амплитуде 0.12).
- [ ] Празднование финиша не повторяется при reload и не срабатывает при просмотре из журнала.
- [ ] Ни одно изменение не затронуло типы, сторадж, запись подходов, расчёты; `location.state` — единственный новый канал данных.
- [ ] Collapse: контент размонтирован в закрытом состоянии; первый рендер открытых секций без анимации; whip-кланк в Workout работает как раньше.
- [ ] Ноль новых зависимостей; TS и build без ошибок; reduced motion уважается (CSS + JS-гарды).

## Вне скоупа

View Transitions API для переходов между табами (конфликтует с каскадом `whip-in` — отдельное решение владельца), звук, haptics (`navigator.vibrate` не поддерживается в iOS PWA), персист PR-бейджей в активной тренировке, синхронизация `design/mockup.html` (макет статичен).
