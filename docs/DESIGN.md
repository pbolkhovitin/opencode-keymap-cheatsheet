# Design: keymap-cheatsheet

## Проблема

В OpenCode 2.2.0 нет working which-key. `which-key.*` объявлены в
`packages/tui/src/config/keybind.ts`, но обработчика в TUI нет; `/plugins` не
показывает which-key, release notes 2.2.0 её не упоминают. `F1` открывает
короткий Help, который лишь отправляет в `Ctrl+P`.

## Решение

TUI-плагин, который:

1. Регистрирует команду `keymap-cheatsheet.show` с биндом `ctrl+alt+k`.
2. По вызову снимает снимок `context.keymap.commands()` **до** показа диалога,
   пока активен базовый режим.
3. Для каждой команды с `id` и `title` получает `context.keymap.shortcuts(id)`
   и нормализует результат.
4. Строит строки, сортирует по группе/названию, помечает общие
   последовательности (`dup`).
5. Показывает модальный диалог с полем поиска и прокручиваемым списком.
6. Закрывает диалог по `Esc` штатным DialogProvider; `Ctrl+Alt+K` в модальном
   слое тоже закрывает.

Снимок нужен потому, что после открытия диалога OpenCode переключается в
`modal`-режим, и `commands()` (visibility `reachable`) перестаёт возвращать
базовые команды.

## API

```ts
import { Plugin } from "@opencode/plugin/tui"

export default Plugin.define({
  id: "keymap-cheatsheet",
  async setup(context) {
    context.keymap.layer(() => ({
      commands: [{ id, title, group, bind: "ctrl+alt+k", run: show }],
    }))
    context.ui.dialog.show(() => <box>...</box>, () => setOpen(false))
  },
})
```

Используемые элементы:

- `context.keymap.commands()` — команды, доступные в текущем режиме; читается
  один раз при открытии.
- `context.keymap.shortcuts(id)` — фактические сочетания (форматированные
  keymap, включая `<leader>` и несколько альтернатив).
- `context.keymap.layer(factory)` — базовый слой с командой открытия и
  модальный слой с прокруткой/закрытием.
- `context.ui.dialog.show/set/clear` — показ, размер (`large`) и закрытие.
- `context.theme.text.*`, `context.theme.background.formfield.*` — цвета.
- `context.renderer.terminalHeight` — ограничение высоты списка.

## Чистая логика (`lib.ts`)

- `shortcutList(source)` — нормализует `string[] | string | null` в
  дедуплицированный список непустых строк.
- `collectRows(commands, shortcuts)` — пропускает команды без `id`/`title`,
  ошибки resolver'а и команды без сочетаний; сортирует; вычисляет `shared`.
- `filterRows(rows, query)` — регистронезависимый поиск по label/title/group;
  точная фраза имеет приоритет, иначе все слова запроса должны найтись.
- `groupRows(rows)` — группировка с сохранением порядка.
- `formatShortcutColumn(label, width)` — фиксированная колонка с обрезкой и
  `…`, чтобы длинная последовательность не наезжала на название.

`bind === false` **не** является причиной пропуска: в OpenCode это отключение
fallback-бинда слоя, при этом у команды могут быть бинды из конфига. Решение
принимается по непустому результату `shortcuts(id)`.

## UX

- Заголовок: `Keyboard shortcuts`, справа `esc close`.
- Поле поиска: `Search by command, group or keys`, автофокус.
- Группы: `Agent`, `Session`, `System`, `VCS`, `Prompt`, `Help` и т.д.
- Строка: `сочетания (колонка 34)  название`, при конфликте — `dup`.
- Футер: `N/M · ↑↓ scroll · PgUp/PgDn · esc close`.
- Если ничего не найдено: `No matching shortcuts.`
- Если команд с биндами нет: `No bound commands found.`

## Крайние случаи

- `shortcuts(id)` может бросить — команда пропускается.
- `shortcuts(id)` может вернуть `string[]` или `string` — нормализуем.
- Команды без `title` (внутренние `input.*`) пропускаются.
- Повторы внутри одной команды схлопываются; общие с другой командой
  помечаются `dup`.
- Диалог может быть закрыт извне — `onClose` сбрасывает `open`.
- При открытии ставим `dialog.set({ size: "large" })`.
- `Esc` обрабатывает DialogProvider; собственный `escape`-биндинг не нужен и
  может конфликтовать.
- Прокрутка реализована командами модального слоя, потому что фокус остаётся в
  поле поиска.

## Ограничения

- Это не upstream which-key: нет pending-preview, layout-switch, навигации по
  группам.
- Список обновляется при открытии, но не перерисовывается на лету, если
  keymap меняется при открытом диалоге.
- Показываются только именованные команды; анонимные inline-биндинги без
  заголовка не выводятся.

## Проверка

1. `npm run check` — TypeScript без ошибок.
2. `npm test` — 12 unit-тестов логики.
3. Симлинк в `~/.config/opencode/plugins/keymap-cheatsheet`.
4. `opencode --standalone` → `Ctrl+Alt+K` → диалог со списком.
5. В логе нет ошибок загрузки плагина.
6. Проверены `Esc`, повторное открытие, фильтр, прокрутка, отсутствие
   конфликта с `Ctrl+P`.
