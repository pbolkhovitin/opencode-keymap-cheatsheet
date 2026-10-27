# Design: keymap-cheatsheet

## Проблема

В OpenCode 2.2.0 нет working which-key. `which-key.*` объявлены в
`packages/tui/src/config/keybind.ts`, но обработчика в TUI нет; `/plugins` не
показывает which-key, release notes 2.2.0 её не упоминают. `F1` открывает
короткий Help, который лишь отправляет в `Ctrl+P`.

## Решение

TUI-плагин, который:

1. Регистрирует команду `keymap-cheatsheet.show` с биндом `ctrl+alt+k`.
2. По вызову собирает `context.keymap.commands()`.
3. Для каждой команды с `id` и `title` получает `context.keymap.shortcuts(id)`.
4. Показывает модальный диалог, сгруппированный по `command.group`.
5. Закрывается по `esc` (отдельный modal-слой) или закрытию диалога.

## API

```ts
import { Plugin } from "@opencode/plugin/tui"
import { createMemo, createSignal } from "solid-js"

export default Plugin.define({
  id: "keymap-cheatsheet",
  async setup(context) {
    context.keymap.layer(() => ({
      commands: [{ id, title, group, bind: "ctrl+alt+k", run }],
    }))
    context.ui.dialog.show(() => <box>...</box>, onClose)
  },
})
```

Используемые элементы:

- `context.keymap.commands()` — доступные команды (reactive).
- `context.keymap.shortcuts(id)` — фактические сочетания.
- `context.keymap.layer(factory)` — регистрация команды и modal-слоя.
- `context.ui.dialog.show/set/clear` — показ и закрытие.
- `context.theme.text.base/muted` — цвета.

## UX

- Заголовок: `Keyboard shortcuts`.
- Подзаголовок: `esc — close · ctrl+alt+k — toggle`.
- Группы: `Session`, `Dialog`, `Help`, `General` и т.д. (как в keymap).
- Строка: `сочетание (32)  название`.
- Если команд с биндами нет — `No bound commands found.`

## Крайние случаи

- `shortcuts(id)` может вернуть `string[]` или `string` — нормализуем.
- Команды без `bind` и без shortcut не показываем.
- `bind === false` пропускаем.
- `context.keymap.shortcuts` может бросить для неизвестного id — пропускаем.
- Диалог может быть закрыт извне — `onClose` сбрасывает `open`.
- При открытии ставим `dialog.set({ size: "large" })`.

## Ограничения

- Это не upstream which-key: нет pending-preview, layout-switch, scroll
  groups, навигации по группам.
- Нет поиска/фильтра (кандидат на следующую итерацию).
- Список обновляется при открытии, но не перерисовывается на лету, если
  keymap меняется при открытом диалоге.

## Проверка

1. `npm run check` — TypeScript без ошибок.
2. Симлинк в `~/.config/opencode/plugins/keymap-cheatsheet`.
3. `opencode --standalone` → `Ctrl+Alt+K` → диалог со списком.
4. В логе нет ошибок загрузки плагина.
5. Проверить `esc`, повторное открытие, отсутствие конфликта с `Ctrl+P`.
