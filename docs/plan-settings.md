# План: честная страница настроек — конвертация единиц, звук, импорт, честная тема

> Задание для исполнителя (Claude Opus). Самодостаточный документ: весь нужный контекст здесь и в указанных файлах. Состав и приоритеты утверждены владельцем проекта — следовать спецификациям ниже, не изобретать своё.

## Контекст и цель

PWA-трекер силовых (Vite + React 18 + TS, данные в localStorage, тёмная тема «liquid glass», UI на русском). Экран `src/screens/Settings.tsx` визуально готов, но **половина его контролов — «пустышки» (no-op)**: тумблеры ничего не меняют, потому что настройка нигде не читается. Проверено по коду:

| Контрол | Статус | Факт |
|---|---|---|
| Отдых по умолчанию | ✅ работает | читается в `Editor.tsx:44` (`data.settings.defaultRestSec`) |
| Экспорт / Очистить / Сбросить | ✅ работают | `Settings.tsx` |
| **Единицы «фунты»** | ❌ no-op | `settings.units` нигде не читается; вес хардкодом «кг» в 8 местах |
| **Тема «Светлая / Авто»** | ❌ no-op | нет `data-theme`, нет `prefers-color-scheme`; весь CSS жёстко тёмный |
| **Звук и вибрация** | ❌ no-op | нет ни `Audio`, ни `navigator.vibrate` |
| Импорт JSON | ⛔ отсутствует | есть только экспорт |

**Цель — сделать каждый контрол честным.** Решения владельца:

1. **Единицы (kg↔lb) — реализовать настоящую конвертацию** (включая плитчатый визуал). Тумблер должен работать во всём приложении.
2. **Звук и вибрация — реализовать** (WebAudio-бип по окончании таймера отдыха + best-effort `vibrate`).
3. **Импорт JSON — добавить** (дополняет существующий экспорт).
4. **Тема — тёмная-only, честно**: убрать нерабочие «Светлая»/«Авто». Полноценная светлая тема — **вне скоупа** (отдельный редизайн, отложен владельцем).

## Принципы

- **kg — каноничная единица хранения и расчётов. Её НЕ трогаем нигде.** `LoggedSet.weight`, `plates`-математика ядра, `calc.ts` (объём, 1ПМ, серии), сравнение PR и амплитуда whip — всё остаётся в килограммах, байт-в-байт. Конвертация живёт **только на границе отображения и ввода**.
- Ноль новых зависимостей. Звук — чистый WebAudio (без ассета). Конвертация — чистая арифметика.
- Переиспользовать существующие контролы CSS: `.seg` (сегмент-переключатель), `.switch` (тумблер), `.srow`/`.sk`/`.sd`/`.sr` (строка настройки), `.sec-label`. Новые строки — в той же вёрстке.
- Стиль кода как в проекте: русские комментарии, компактно, короткие имена.
- Каждый экран уже вызывает `useStore()` — единицы берём из `data.settings.units` прямо на месте, без проп-дриллинга (исключение — `WeightVisual`, он вне стора: получает `units` пропом из `Workout`).
- Прогон на iOS standalone PWA обязателен (особенно звук — там свои правила разблокировки AudioContext).
- После каждого шага — `npx tsc --noEmit` без ошибок; в конце `npm run build`.

---

## 1. Единицы веса (kg ↔ lb) — настоящая конвертация

Самая объёмная часть. Данные всегда в кг; пользователь читает и вводит числа в выбранной единице; физический плитчатый визуал переключается на имперский набор блинов.

### 1.0 Новый модуль `src/lib/units.ts`

Единая точка конвертации и форматирования. Округление держим на стабильной сетке, чтобы round-trip kg→display→kg не «плыл».

```ts
import type { Settings } from '../types'
import { ruNum } from './util'

export type Units = Settings['units'] // 'kg' | 'lb'

export const LB_PER_KG = 2.20462262

/** Ярлык единицы для подписей. */
export const weightLabel = (u: Units): string => (u === 'lb' ? 'фунт' : 'кг')

/** кг → число в текущих единицах, округлённое на «читаемую» сетку
 *  (кг — до 0,5; фунты — до целого). Сетка стабильна: обратная fromDisplayWeight
 *  вернёт эти же кг, поэтому повторный вызов даёт то же число (нет дрейфа). */
export function toDisplayWeight(kg: number, u: Units): number {
  if (u === 'lb') return Math.round(kg * LB_PER_KG)
  return Math.round(kg * 2) / 2
}

/** число в текущих единицах → кг для хранения. */
export function fromDisplayWeight(shown: number, u: Units): number {
  if (u === 'lb') return +(shown / LB_PER_KG).toFixed(3)
  return +shown.toFixed(2)
}

/** Готовая строка веса: 60 → "60 кг" / "132 фунт". reps-режим форматируется вызывающим. */
export function fmtWeight(kg: number, u: Units): string {
  return `${ruNum(toDisplayWeight(kg, u))} ${weightLabel(u)}`
}

/** Агрегатный объём: кг → тонны «т», фунты → тысячи «тыс lb». Принимает кг. */
export function fmtVolume(kg: number, u: Units): { value: string; unit: string } {
  if (u === 'lb') return { value: ((kg * LB_PER_KG) / 1000).toFixed(1), unit: 'тыс lb' }
  return { value: (kg / 1000).toFixed(1), unit: 'т' }
}

/** Шаг степпера в отображаемых единицах (кг — как было; фунты — «спортивная» сетка). */
export function weightStepDisplay(eq: string, u: Units): number {
  if (u === 'lb') return eq === 'Свой вес' ? 1 : eq === 'Штанга' || eq === 'Тренажёр' ? 5 : 2.5
  return eq === 'Штанга' || eq === 'Тренажёр' ? 2.5 : eq === 'Свой вес' ? 1 : 2
}
```

### 1.1 Каноничное правило (держать в голове при всех правках ниже)

- Состояние `weight` в `Workout.tsx` **остаётся в кг** — тогда `logSet()`, сравнение PR, `historyTop`-префилл, амплитуда whip и `WeightVisual` не трогаются по сути. Меняется только **как это число показывается в инпуте** и **какой шаг у кнопок ±**.
- Все read-only места показа: берут кг из данных и прогоняют через `fmtWeight` / `toDisplayWeight` / `fmtVolume`.

### 1.2 `Workout.tsx` — степпер веса (ввод)

Сейчас (строки ~246–253): значение и шаг — в кг напрямую (`weightStep`, `<small>кг</small>`). Заменить на конвертацию через `units`:

- В компоненте: `const units = data.settings.units`.
- Убрать локальный `weightStep` (стр. 14) — использовать `weightStepDisplay(eq, units)`.
- Шаг кнопок ± считать в отображаемых единицах, затем один раз перевести в кг:

```ts
const stepW = (dir: 1 | -1) => {
  const d = toDisplayWeight(weight, units) + dir * weightStepDisplay(ex?.equipment ?? 'Штанга', units)
  setWeight(Math.max(0, fromDisplayWeight(Math.max(0, d), units)))
  pop(wNumRef.current)
}
```

- Инпут веса: `value` и `onChange` — в отображаемых единицах, подпись — динамическая:

```tsx
<input className="ninp" type="text" inputMode="decimal"
  value={toDisplayWeight(weight, units)}
  onFocus={(e) => e.target.select()}
  onChange={(e) => setWeight(Math.max(0, fromDisplayWeight(parseNum(e.target.value, 0), units)))} />
<small>{weightLabel(units)}</small>
```

- Кнопки «−»/«+» веса — на `stepW(-1)` / `stepW(1)`. Повторы (`reps`) не трогаем — они без единиц.

### 1.3 `Workout.tsx` — записанная строка подхода и визуал

- Строка записанного подхода (стр. 236): `${s.weight} кг × ${s.reps}` → `{s.weight > 0 ? \`${fmtWeight(s.weight, units)} × ${s.reps}\` : \`${s.reps} повт.\`}`.
- `WeightVisual` (стр. 241): добавить проп `units={units}` (см. 1.5).

### 1.4 `src/lib/plates.ts` — единично-зависимый набор блинов

Сейчас модуль жёстко метрический (`BAR_KG = 20`, `PLATES = [25,20,15,10,5,2.5,1.25]`). Сделать его параметрическим по единице; вся математика — в отображаемой единице (визуал физически моделирует блины той системы, что выбрал пользователь).

```ts
import type { Units } from './units'

export const BAR: Record<Units, number> = { kg: 20, lb: 45 }
export const PLATE_SET: Record<Units, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
}
const MAX: Record<Units, number> = { kg: 300, lb: 660 }

/** Жадная раскладка на сторону. totalDisplay — общий вес в ЕДИНИЦАХ показа (не кг). */
export function platesPerSide(totalDisplay: number, u: Units): { plates: number[]; remainder: number } {
  const total = Math.min(totalDisplay, MAX[u])
  let perSide = (total - BAR[u]) / 2
  const plates: number[] = []
  if (perSide <= 0) return { plates, remainder: 0 }
  for (const p of PLATE_SET[u]) {
    while (perSide + 1e-6 >= p) { plates.push(p); perSide = +(perSide - p).toFixed(4) }
  }
  return { plates, remainder: perSide < 1e-6 ? 0 : +perSide.toFixed(2) }
}
```

Экспорт `BAR_KG`/`PLATES` удалить; поправить единственного потребителя — `WeightVisual.tsx`.

### 1.5 `src/components/WeightVisual.tsx` — проп `units`, имперские блины

- Пропы: добавить `units: Units`. `Workout` передаёт `data.settings.units`.
- Внутри `Barbell`/`Stack`/`Dumbbell`/`Tally` работать с **отображаемым весом**: `const disp = toDisplayWeight(weight, units)` в начале `WeightVisual` и прокидывать `disp` вместо `weight` (reps-режим `Tally` не трогаем).
- `Barbell`: `platesPerSide(disp, units)`; подписи `на сторону:` и `ещё … не разложить` — заменить «кг» на `weightLabel(units)`; порог «легче грифа» — `disp < BAR[units]`, текст `(${BAR[units]} ${weightLabel(units)})`.
- Карты размеров/цветов блинов расширить номиналами имперского набора (45/35/25 уже частично есть визуально — задать явные `[высота,ширина]` и цвета по роли: 45→красный, 35→синий, 25→жёлтый, 10→зелёный, 5→светлый, 2.5→серый). `PLATE_SIZE`/`PLATE_COLOR`/`PLATE_INK` — добавить ключи 45/35 (25/10/5/2.5 общие).
- `Dumbbell`/`Stack`: показывать `disp` и подпись единицы; стек-тренажёр оставить в 5-единичных шагах (метка единицы — `weightLabel(units)`), это условная модель, не физический блин.

### 1.6 Read-only места показа (таблица правок)

Везде: взять `const units = data.settings.units` (стор уже под рукой) и обернуть числа. `import { fmtWeight, fmtVolume, toDisplayWeight, weightLabel } from '../lib/units'`.

| Файл:стр | Сейчас | Стало |
|---|---|---|
| `Home.tsx:130` | `{toTons(volKg)}<small> т</small>` | `const v = fmtVolume(volKg, units)` → `{v.value}<small> {v.unit}</small>` |
| `Home.tsx:147` | `1ПМ ≈ {x.pr.best1RM} кг · …` | `1ПМ ≈ {fmtWeight(x.pr.best1RM, units)} · …` |
| `Home.tsx:149` | `{x.pr.maxWeight} кг` | `{fmtWeight(x.pr.maxWeight, units)}` |
| `Progress.tsx:73` | `unit: rb ? 'повт.' : 'кг'` | `unit: rb ? 'повт.' : weightLabel(units)` |
| `Progress.tsx:164,166` | `{last}`, `{delta}` (кг-числа) | обернуть весовые (не reps) в `toDisplayWeight(_, units)`; знак дельты сохранить |
| `Progress.tsx:203–204` | `{s.pr.maxWeight} кг`, `{s.pr.best1RM} кг` | `{toDisplayWeight(s.pr.maxWeight, units)}<small> {weightLabel(units)}</small>` и аналогично 1ПМ |
| `SessionDetail.tsx:78` | `{toTons(volV)}<small> т</small>` | `const v = fmtVolume(volV, units)` → `{v.value}<small> {v.unit}</small>` (count-up `volV` остаётся в кг — конвертируем на кадре) |
| `SessionDetail.tsx:92` | `${s.weight} кг × ${s.reps}` | `${fmtWeight(s.weight, units)} × ${s.reps}` |
| `SessionDetail.tsx:100` | `{s.weight * s.reps} кг` | `{fmtWeight(s.weight * s.reps, units)}` |

`Progress`: важно — конвертируем только весовые строки (`!s.rb`); reps-based (`s.unit='повт.'`) не трогаем. Спарклайн/бары — формы, значения не подписаны единицей → оставить как есть (кг-масштаб, визуально идентично).

### 1.7 Стабильность округления

`toDisplayWeight`/`fromDisplayWeight` работают на фиксированной сетке (кг — 0,5; lb — целые), поэтому показанное число, переведённое в кг и обратно, даёт то же число — инпут не «дребезжит» при вводе. Это осознанный компромисс: в lb-режиме введённые 135 хранятся как ≈61,235 кг и показываются обратно как 135. Плитчатая раскладка в lb использует имперский набор — числа на блинах целые.

---

## 2. Звук и вибрация по окончании таймера отдыха

Сейчас `settings.soundOn` только переключается в UI. Озвучить момент, когда таймер отдыха дошёл до нуля.

### 2.1 Новый модуль `src/lib/sound.ts`

Короткий WebAudio-бип, ленивый переиспользуемый контекст, best-effort вибро. Без ассетов.

```ts
let ctx: AudioContext | null = null

/** Разблокировать/создать AudioContext на пользовательском жесте (нужно для iOS). */
export function primeAudio(): void {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* нет WebAudio — молча */ }
}

/** Двойной короткий бип + вибро. Вызывать по окончании таймера, если soundOn. */
export function chime(): void {
  try {
    if (!ctx) primeAudio()
    if (ctx) {
      const now = ctx.currentTime
      for (const [i, f] of [880, 1180].entries()) {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f
        const t = now + i * 0.14
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.28, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.14)
      }
    }
  } catch { /* игнор */ }
  if ('vibrate' in navigator) navigator.vibrate?.([90, 40, 90]) // iOS PWA игнорирует — ок
}
```

### 2.2 `Workout.tsx` — разблокировка и триггер

- **Разблокировка (iOS):** AudioContext стартует только с жеста. В `logSet()` (это тап) первой строкой — `if (data.settings.soundOn) primeAudio()`. К моменту, когда первый отдых дойдёт до нуля, контекст уже «живой».
- **Триггер:** интервал отдыха (стр. 67) гасит таймер при `x <= 1`. Там же, в момент достижения нуля, вызвать `chime()` под настройкой:

```ts
const t = setInterval(() => setRestLeft((x) => {
  if (x <= 1) { setRestActive(false); if (data.settings.soundOn) chime(); return 0 }
  return x - 1
}), 1000)
```

Импорт: `import { chime, primeAudio } from '../lib/sound'`. Больше нигде звук не нужен.

---

## 3. Импорт из JSON

Дополнить блок «Данные». Экспорт уже есть (`exportJson`, стр. 17–25) — добавить парный импорт с валидацией и подтверждением перезаписи.

### 3.1 `src/lib/store.tsx` — метод `replaceAll`

Рядом с `resetAll` (стр. 54–58):

```ts
replaceAll: (next: AppData) => { clearActiveWorkout(); setData(next) },
```

Добавить в интерфейс `StoreCtx` (стр. 7–19): `replaceAll: (next: AppData) => void`. Персист сработает сам через существующий `useEffect(() => saveData(data), [data])`.

### 3.2 Валидация (в `Settings.tsx` или маленький хелпер)

Не доверять содержимому файла: проверить версию схемы и форму.

```ts
function isValidAppData(x: any): x is AppData {
  return x && typeof x === 'object'
    && x.schemaVersion === SCHEMA_VERSION
    && Array.isArray(x.exercises) && Array.isArray(x.programs)
    && Array.isArray(x.sessions) && x.settings && typeof x.settings === 'object'
    && typeof x.userId === 'string'
}
```

`SCHEMA_VERSION` импортировать из `../lib/storage`.

### 3.3 `Settings.tsx` — строка импорта

- Скрытый инпут + реф: `const fileRef = useRef<HTMLInputElement>(null)`.
- Строка в карточке «Данные» (перед «Экспорт» или после — на выбор), в стиле существующих строк-кнопок:

```tsx
<button className="srow" style={{ width:'100%', background:'none', border:0, textAlign:'left' }}
  onClick={() => fileRef.current?.click()}>
  <div className="sk">Импорт из JSON</div><div className="sr chev"><Icon name="chev-r" /></div>
</button>
<input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
```

- Обработчик:

```ts
const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]; e.target.value = '' // позволить повторный выбор того же файла
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      if (!isValidAppData(parsed)) { alert('Файл не похож на резервную копию (несовместимая версия или структура).'); return }
      if (confirm('Импорт заменит все текущие данные — программы, историю, настройки. Продолжить?')) {
        replaceAll(parsed); nav('/')
      }
    } catch { alert('Не удалось прочитать JSON.') }
  }
  reader.readAsText(file)
}
```

`replaceAll` взять из `useStore()`. После импорта уводим на главную (`nav('/')`), чтобы экраны перечитали новые данные. Осознанное упрощение: только полная замена, без слияния (merge — вне скоупа).

---

## 4. Тема: честная тёмная-only

Полноценная светлая тема — большой отдельный редизайн (второй набор токенов, стеклo/aurora/контрасты на всех экранах) — **вне скоупа этого плана** (отложено владельцем). Сейчас задача — **перестать врать**: убрать нерабочие кнопки «Светлая»/«Авто».

В `Settings.tsx` секцию «Оформление» (стр. 65–75) заменить трёхкнопочный `.seg` на честную статичную строку:

```tsx
<div className="sec-label">Оформление</div>
<div className="card">
  <div className="srow">
    <div><div className="sk">Тема</div><div className="sd">светлая — в планах</div></div>
    <div className="sr"><span className="chip">Тёмная</span></div>
  </div>
</div>
```

- Поле `settings.theme` в модели и `updateSettings` **оставить как есть** (безвредно, задел на будущее) — просто не выставляем `light`/`auto` из UI. Никакого `data-theme`/`prefers-color-scheme` не заводим (это и есть отложенная работа).
- Класс `.chip` уже существует в проекте (используется в `SessionDetail`) — переиспользовать.

---

## 5. Опционально / стретч (по желанию владельца, не блокирует)

Небольшие честные доводки той же страницы; каждая самостоятельна.

- **Статус хранилища.** Бэклог отмечает: сбой `localStorage` сейчас молча глотается (`storage.ts` `saveData` catch). Можно добавить в секцию «Данные» строку-индикатор «Хранилище: ок / недоступно» (проба записи-чтения ключа при монтировании) — чтобы приватный режим/переполнение были видимы.
- **Реальная версия.** Подвал сейчас хардкодит `v0.1`. Можно прокинуть `version` из `package.json` (`0.1.0`) через `define` в `vite.config` (`__APP_VERSION__`) и подставить в подвал.
- **Кнопка «Установить приложение».** Перехват `beforeinstallprompt` → строка «Установить на устройство» (только когда событие доступно). PWA-нативность к месту на этом экране.

---

## Порядок работ

1. `src/lib/units.ts` — модуль конвертации. → `npx tsc --noEmit`.
2. Единицы, ввод: `plates.ts` (параметризация) → `WeightVisual.tsx` (проп `units`, имперские блины) → `Workout.tsx` степпер+строка+визуал. Прогон Workout вживую (штанга/гантель/стек/свой вес, kg и lb).
3. Единицы, показ: `Home`, `Progress`, `SessionDetail` по таблице 1.6. Прогон каждого экрана в обоих режимах.
4. Звук: `src/lib/sound.ts` → разблокировка в `logSet` + триггер в интервале отдыха. Прогон на iOS PWA.
5. Импорт: `store.replaceAll` → строка и обработчик в `Settings`. Экспорт → правка файла → импорт — круговой тест.
6. Тема: честная статичная строка в `Settings`.
7. (Опц.) пункты раздела 5.
8. Финал: `npx tsc --noEmit` чистый, `npm run build` чистый.

## Ручная проверка (`npm run dev` → localhost:5173)

- **Единицы, переключение.** Настройки → «фунты». Пройти по всем экранам: Workout (степпер показывает фунты, шаг 5 lb для штанги; записанный подход «132 фунт × 5»; визуал — имперские блины 45/35/25 на 45-lb грифе, подпись «на сторону» в фунтах), Home (рекорды и объём в фунтах / «тыс lb»), Progress (весовые строки и PR в фунтах, reps-упражнения без изменений), SessionDetail (подходы и объём в фунтах). Вернуть «кг» — всё как раньше, историческая раскладка блинов идентична.
- **Каноничность данных.** Записать подход в lb → переключить на kg: тот же вес показан в кг (данные не переписаны). Экспорт JSON в lb-режиме содержит вес в кг.
- **Звук.** soundOn=on: записать подход, дождаться нуля таймера → двойной бип + (где поддерживается) вибро. soundOff → тишина. iOS standalone PWA: после первого тапа «Записать подход» звук по окончании отдыха проигрывается (AudioContext разблокирован).
- **Импорт.** Экспорт → «Сбросить всё» → Импорт того же файла: программы/история/настройки вернулись. Импорт мусорного .json → аккуратный alert, данные целы. Импорт файла со старой `schemaVersion` → отклонён с сообщением.
- **Тема.** В «Оформление» только честная строка «Тёмная · светлая — в планах», нерабочих кнопок нет.
- Системный reduced motion не затрагивается (звук — не анимация, но и не мешает).
- `npm run build` чистый.

## Критерии приёмки

- [ ] Тумблер «кг/фунты» реально меняет все читаемые и вводимые числа во всём приложении, включая плитчатый визуал (имперский набор блинов в lb).
- [ ] Хранилище и расчёты остались в кг: `LoggedSet.weight`, `calc.ts`, сравнение PR, амплитуда whip — не изменены; конвертация только на границе show/input.
- [ ] Округление стабильно: ввод в фунтах не «дребезжит» на round-trip.
- [ ] Звук/вибро срабатывают по окончании таймера при soundOn и молчат при off; на iOS PWA контекст разблокирован жестом.
- [ ] Импорт JSON заменяет данные только после валидации схемы и подтверждения; мусор отклоняется без порчи данных; экспorт↔импорт — обратимы.
- [ ] Тема-контрол честный (тёмная-only), фейковых кнопок нет; поле `settings.theme` в модели сохранено.
- [ ] Ноль новых зависимостей; `npx tsc --noEmit` и `npm run build` без ошибок; прогон на iOS standalone PWA пройден.

## Вне скоупа

- **Полноценная светлая тема** (второй набор токенов, `data-theme`, авто по системе) — отдельный редизайн, отложен владельцем. Здесь только честная тёмная-only.
- Слияние (merge) при импорте — только полная замена.
- Отдельная физическая точность имперской раскладки сверх заданного набора блинов (микроблины, цветовой код федераций) и per-exercise единицы.
- Хаптика на iOS (`navigator.vibrate` там игнорируется) — вызов оставляем best-effort, но на результат не рассчитываем.
- CSV/сторонние форматы, облачная синхронизация.
