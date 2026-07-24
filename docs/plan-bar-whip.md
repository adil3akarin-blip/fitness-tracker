# План: фирменная анимация «прогиб под весом» (bar whip)

> Задание для исполнителя (Claude Opus). Самодостаточный документ: весь нужный контекст здесь и в указанных файлах. Концепт и параметры кривой утверждены владельцем проекта на интерактивном демо — следовать спецификациям ниже, не изобретать своё.

## Контекст и цель

PWA-трекер силовых тренировок (Vite + React 18 + TS, данные в localStorage, тёмная тема, UI на русском). В экране тренировки `src/screens/Workout.tsx` уже живёт «живая визуализация веса» (`src/components/WeightVisual.tsx`): штанга с цветными блинами, гантель, весовой стек, насечки.

Задача — добавить приложению единую фирменную анимацию: **затухающее пружинное колебание, как у грифа штанги после «кланка» блином**. Ключевая фишка: у главного применения (запись подхода) **амплитуда и длительность зависят от реального веса в килограммах**. 60 кг — лёгкая упругость, 150 кг — глубокий прогиб. Одна и та же пружинная кривая используется во всех остальных мотионах приложения (вход экранов, рост баров графика, таб-бар), чтобы весь интерфейс двигался одним языком.

Это чисто визуальная фича: **никаких изменений** модели данных (`src/types.ts`), стораджа (`src/lib/storage.ts`), логики записи подходов и расчётов (`src/lib/calc.ts`).

## Принципы

- Ноль новых зависимостей. Анимации — чистый CSS (keyframes + transition), JS только выставляет CSS-переменные и перезапускает класс.
- Только `transform` и `opacity` — ничего, что триггерит layout. Исключения: уже существующие transition по `width`/`height` (прогресс-бар, бары графика) — им меняем только easing.
- Одна кривая затухания на всё приложение (коэффициенты ниже). Технически это три keyframe-проекции одной пружины: `whip` (дрожание на месте), `whip-in` (появление снизу с оседанием), `whip-up` (рост столбика с перелётом).
- Дизайн-токены из `:root` в `src/index.css`; easing — существующая `--ease: cubic-bezier(.2,.8,.2,1)`.
- Стиль кода как в проекте: русские комментарии, компактно. Новым классам/переменным префикс `whip`/`--whip-`.
- `@media (prefers-reduced-motion: reduce)` — отключить все новые анимации (блок в конце `index.css` уже есть — расширить).
- Прогон на iOS standalone PWA обязателен (недавно чинился viewport — не сломать).

## Ядро: кривая и кейфреймы

Секция в конце `src/index.css`: `/* ---- Whip: фирменная анимация «прогиб под весом» ---- */`.

Кривая затухания (проценты времени → доля амплитуды): `32% → 1`, `58% → −0.42`, `78% → 0.18`, `92% → −0.07`, `100% → 0`.

```css
@keyframes whip{
  0%{transform:translateY(0)}
  32%{transform:translateY(var(--wa,6px))}
  58%{transform:translateY(calc(var(--wa,6px)*-.42))}
  78%{transform:translateY(calc(var(--wa,6px)*.18))}
  92%{transform:translateY(calc(var(--wa,6px)*-.07))}
  100%{transform:translateY(0)}
}
@keyframes whip-in{
  0%{opacity:0;transform:translateY(16px)}
  55%{opacity:1;transform:translateY(-4px)}
  78%{transform:translateY(2px)}
  100%{opacity:1;transform:none}
}
@keyframes whip-up{
  0%{transform:scaleY(0)}
  55%{transform:scaleY(1.07)}
  78%{transform:scaleY(.97)}
  100%{transform:scaleY(1)}
}
```

`--wa` — локальная амплитуда элемента (px, вниз). Родитель выставляет «глобальную» `--whip-a` и `--whip-d`, потомки берут от неё доли через `calc` — так один класс на карточке двигает всю сцену с разной силой (см. ниже).

## Утилита `src/lib/whip.ts` (новый)

```ts
export type WhipInput = { weight: number; reps: number; repsBased?: boolean; pr?: boolean }

/** Нагрузка 0..1: чем тяжелее подход, тем сильнее прогиб. */
export function whipLoad(i: WhipInput): number
// pr === true → 1
// repsBased (Свой вес, weight <= 0) → clamp(reps / 30, 0.1, 0.6)
// иначе → clamp((weight − 20) / 130, 0.1, 1)

/** Выставляет --whip-a/--whip-d на элементе и перезапускает класс .whipping. */
export function whip(el: HTMLElement | null, input: WhipInput): void
```

Формулы: `амплитуда = 3 + 11 × load` (px), `длительность = 360 + 340 × load` (ms). Т.е. 60 кг → ~6.4px / 465ms; 100 кг → ~9.8px / 570ms; 150+ кг → 14px / 700ms.

Перезапуск — приём, уже используемый в проекте (`WeightVisual.tsx`, эффект по `weight`): `classList.remove('whipping')` → `void el.offsetWidth` → `classList.add('whipping')`.

## Точки применения

### 1. Workout: запись подхода — главный «кланк» (обязательно)

CSS (амплитуды-доли подобраны на утверждённом демо):

```css
.whipping,
.whipping :is(.wv-bb-side,.wv-bb-grip,.wv-db,.wv-st-col,.wv-tl,.btn-primary,.setrow:last-of-type){
  animation:whip var(--whip-d,500ms) var(--ease) both;
}
.whipping{--wa:calc(var(--whip-a,6px)*.22)}          /* карточка целиком — едва заметно */
.whipping .wv-bb-side{--wa:var(--whip-a,6px)}        /* концы штанги проседают сильнее всего */
.whipping .wv-bb-grip{--wa:calc(var(--whip-a,6px)*.35)} /* середина грифа отстаёт → виден «прогиб» */
.whipping :is(.wv-db,.wv-st-col,.wv-tl){--wa:calc(var(--whip-a,6px)*.8)} /* другие снаряды — целиком */
.whipping .btn-primary{--wa:calc(var(--whip-a,6px)*.45)}
.whipping .setrow:last-of-type{--wa:calc(var(--whip-a,6px)*.6)} /* свежезаписанная строка */
```

Трансформы родителя и детей компонуются — это ожидаемо и даёт нужную глубину сцены.

Интеграция в `Workout.tsx`:
- `useRef<HTMLDivElement>(null)` → повесить на карточку текущего упражнения `<div className="exq cur" ref={curRef}>`.
- В `logSet()` перед `setLogged(next)`: определить PR и дёрнуть утилиту:

```ts
const ex = exerciseById(item.exerciseId)
const h = historyTop(item.exerciseId)
const repsBased = ex?.equipment === 'Свой вес'
const pr = h ? (repsBased ? reps > h.reps : weight > h.weight) : false
whip(curRef.current, { weight, reps, repsBased, pr })
```

PR (превышение лучшего исторического результата) всегда получает максимальный прогиб — это кульминация, отдельных эффектов не добавлять.

- Прогресс-бар тренировки: в `.wk-progress > i` заменить `transition: width .4s var(--ease)` на `transition: width .5s cubic-bezier(.34,1.65,.45,1)` — заполнение с перелётом.
- Рест-бар: в `.restbar` заменить `transition: transform .35s var(--ease)` на `transition: transform .45s cubic-bezier(.32,1.4,.45,1)` — выезжает и «оседает» (при скрытии перелёт уходит за экран, не виден — это ок).

### 2. Вход экранов — «карточки приземляются» (обязательно)

Сейчас `.screen` целиком въезжает кейфреймом `screenIn` (`src/index.css`, около строки 40). Заменить на постановочный вход детей со стаггером:

- Удалить `@keyframes screenIn` и `animation:screenIn…` у `.screen`.
- Добавить:

```css
.screen>*{animation:whip-in .5s var(--ease) both}
.screen>*:nth-child(2){animation-delay:45ms}
.screen>*:nth-child(3){animation-delay:90ms}
.screen>*:nth-child(4){animation-delay:135ms}
.screen>*:nth-child(5){animation-delay:180ms}
.screen>*:nth-child(6){animation-delay:225ms}
.screen>*:nth-child(n+7){animation-delay:260ms}
```

`both` держит `opacity:0` во время задержки — элементы не мигают до старта. Работает на всех экранах, включая Workout (там `.screen` внутри `.app.plain`).

### 3. Progress: бары графика растут с перелётом

В `src/screens/Progress.tsx` бары рендерятся при раскрытии упражнения (`.prow-detail .chart .bar`, инлайновая `height`). Добавить:

- CSS: `.bar{transform-origin:bottom;animation:whip-up .45s var(--ease) both}` (к существующему правилу `.bar`; transition по height оставить — он для смены диапазона 30д/90д).
- JSX: стаггер по индексу — в `style` бара добавить `animationDelay: \`${i * 30}ms\``.

### 4. TabBar: дип активной иконки (CSS-only, файлы компонентов не трогать)

```css
.tab.on .ic{--wa:3px;animation:whip 350ms var(--ease)}
```

При переключении таба класс `.on` переезжает на другую кнопку → анимация стартует сама. Микро-дип при первом рендере приложения допустим.

### 5. Унификация с `wv-bump`

`WeightVisual` уже «вздрагивает» при смене веса (`@keyframes wv-bump` + класс `wv-bump`, `src/index.css` около строки 307). Это частный случай новой анимации: удалить `@keyframes wv-bump`, а класс переопределить:

```css
.wv-bump{--wa:3px;animation:whip 320ms var(--ease)}
```

`WeightVisual.tsx` не меняется. Кейфреймы `wv-in-r`/`wv-in-l` (надевание блинов) не трогать.

### 6. Reduced motion

Расширить существующий блок в конце `index.css`:

```css
@media (prefers-reduced-motion: reduce){
  .whipping,.whipping *,.screen>*,.tab.on .ic,.bar,.wv-bump{animation:none!important}
}
```

## Порядок работ

1. `src/lib/whip.ts` + CSS-секция ядра (кейфреймы, правила `.whipping`).
2. Workout: ref + вызов в `logSet` + PR-детект; easing прогресс- и рест-бара. Прогон вживую.
3. Вход экранов (`whip-in` со стаггером), убрать `screenIn`.
4. Progress-бары (`whip-up` + delay).
5. TabBar + унификация `wv-bump` + reduced motion.

После каждого шага — `npx tsc --noEmit` без ошибок.

## Ручная проверка (`npm run dev` → localhost:5173)

- Кланк: подход 60 кг vs 150 кг — разница амплитуды видна невооружённым глазом; концы штанги проседают сильнее середины (эффект прогиба грифа); кнопка и свежая строка подхода пружинят.
- Свой вес (подтягивания): прогиб от повторов (8 повт. заметно мягче 25).
- PR: вес выше исторического лучшего → максимальный прогиб независимо от абсолютных кг.
- Спам кнопки «Записать подход» и быстрый ± веса — анимации перезапускаются чисто, без зависаний и дёрганий.
- Вход каждого из 9 экранов: дети приземляются каскадом, ничего не мигает и не прыгает по layout; пустые экраны (empty state) не ломаются.
- Progress: раскрытие упражнения — бары вырастают с перелётом и стаггером; переключение 30д/90д — плавная смена высот как раньше.
- Таб-бар: активная иконка делает короткий дип при каждом переключении.
- Рест-бар выезжает с оседанием, скрывается без артефактов.
- Системный reduced motion (macOS: Settings → Accessibility → Display → Reduce motion) отключает всё.
- iOS standalone PWA: 60fps, ничего не конфликтует с safe-area/viewport-фиксами.
- `npm run build` чистый.

## Критерии приёмки

- [ ] Одна пружинная кривая (коэффициенты 1/−0.42/0.18/−0.07) во всех точках применения.
- [ ] Амплитуда «кланка» математически привязана к весу по формулам из `whip.ts`; PR всегда максимален.
- [ ] Ни одно изменение не затронуло типы, сторадж, запись подходов, расчёты.
- [ ] Только transform/opacity в новых анимациях; ноль новых зависимостей; TS и build без ошибок; reduced motion уважается.
- [ ] Старые `screenIn` и `wv-bump` (кейфрейм) удалены — мёртвого CSS не осталось.

## Вне скоупа

Звук «кланка», haptics (`navigator.vibrate`), празднование PR (конфетти и т.п.), горизонтальный «плейт-слайд» переходов между экранами, параметризация анимаций в `design/mockup.html` (макет статичен — синхронизировать только по отдельному решению владельца).
