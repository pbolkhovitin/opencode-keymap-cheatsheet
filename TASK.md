# TASK: keymap-cheatsheet

## Цель

Довести TUI-плагин `opencode-keymap-cheatsheet` до рабочего состояния:
`Ctrl+Alt+K` открывает список доступных клавиатурных сокращений OpenCode 2.2.0.

## Контекст

- Основной репозиторий конфига: `~/.local/share/opencode/opencode-synced/repo`.
- Этот репозиторий — отдельный: `~/github/opencode-keymap-cheatsheet`.
- В `~/.config/opencode/cli.json` уже удалены мёртвые `help.show` и
  `which-key.toggle`; не возвращать их.
- В OpenCode 2.2.0 which-key не реализована: `which-key.toggle` есть только в
  keybind-схеме и docs, обработчика/панели нет.
- Не трогать незакоммиченные изменения основного репозитория (`opencode-mcp-sets`).

## Сделано

- Каркас `tui.tsx`: команда, диалог, группировка, закрытие по `esc`.
- `package.json`, `tsconfig.json`, README, этот план, `docs/DESIGN.md`.
- `git init`, первый коммит.

## Первые шаги

1. `npm install`.
2. `npm run check`; исправить типы под фактический `@opencode/plugin` 2.2.0.
3. Симлинк:
   ```bash
   ln -sfn ~/github/opencode-keymap-cheatsheet \
           ~/.config/opencode/plugins/keymap-cheatsheet
   ```
4. Запустить `opencode --standalone`, проверить `Ctrl+Alt+K`.
5. Проверить лог: `loading plugin ... keymap-cheatsheet`.
6. Добить UX: поиск, прокрутка, отображение multi-key sequences.
7. `git add -A && git commit`.

## Критерии приёмки

- `Ctrl+Alt+K` открывает диалог; `esc` закрывает.
- В списке есть команды с фактическими биндами, сгруппированные.
- Нет ошибок в логе и крашей TUI.
- `npm run check` проходит.
- README содержит установку и ограничения.

## Ограничения

- Плагин только читает keymap, не переопределяет бинды.
- Не претендует на upstream which-key.
- Для работы нужен OpenCode 2.2.0+ и OpenTUI 0.7.
