# opencode-keymap-cheatsheet

TUI-плагин для OpenCode 2.2.0: показывает список доступных клавиатурных
сокращений по `Ctrl+Alt+K`.

## Зачем

В OpenCode 2.2.0 `which-key` объявлен в keybind-схеме и документации, но
обработчика и панели нет: `which-key.toggle` встречается только в
`packages/tui/src/config/keybind.ts` и docs, а в TUI-плагинах отсутствует.
`Ctrl+P` открывает палитру команд, `F1` — короткий Help, но не список биндов.

Плагин закрывает именно эту нишу: читает текущие команды из keymap и показывает
их сгруппированный список с фактическими сочетаниями клавиш.

## Установка

```bash
git clone <repo> ~/github/opencode-keymap-cheatsheet
ln -s ~/github/opencode-keymap-cheatsheet \
      ~/.config/opencode/plugins/keymap-cheatsheet
```

Перезапустить OpenCode или выполнить `/reload`. В логе должно появиться:

```text
loading plugin id=.../plugins/keymap-cheatsheet entrypoint=.../tui.tsx
```

Проверка: `Ctrl+Alt+K` в TUI.

## Разработка

```bash
npm install
npm run check
```

Для локальной проверки удобно держать симлинк из `~/.config/opencode/plugins`
на этот каталог.

## Ограничения

- Показывает только команды, у которых есть явное сочетание клавиш.
- Multi-key sequences (`<leader>...`) отображаются как заданы в keymap.
- Плагин не заменяет `which-key` из upstream и не меняет поведение OpenCode.
- Нужен OpenCode 2.2.0+ и `@opencode/plugin` 2.2.0 (OpenTUI 0.7).

## Статус

Каркас: команда, диалог и группировка. Дальше — поиск, прокрутка, обработка
конфликтов и тесты. План и критерии приёмки — в [TASK.md](TASK.md) и
[docs/DESIGN.md](docs/DESIGN.md).
