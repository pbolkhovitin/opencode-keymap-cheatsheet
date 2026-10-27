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

- [x] Каркас `tui.tsx`: команда `keymap-cheatsheet.show` с `ctrl+alt+k`,
      модальный диалог, группировка по `group`.
- [x] Фактические сочетания из `context.keymap.shortcuts(id)`, включая
      multi-key sequences и альтернативные бинды.
- [x] Закрытие по `Esc` через штатный dialog-слой OpenCode; повторное открытие
      проверено. Отдельный перехват `escape` убран, чтобы не конфликтовать с
      DialogProvider.
- [x] Поиск/фильтр по названию, группе и клавишам (ввод в поле диалога).
- [x] Прокрутка: `↑`/`↓`, `PgUp`/`PgDn`, `Home`/`End`; список ограничен по
      высоте терминала.
- [x] Отображение multi-key sequences, дублей (`dup`) и команд без явного
      `bind` (у них могут быть бинды из конфига).
- [x] Чистая логика вынесена в `lib.ts`: нормализация shortcuts, сборка строк,
      группировка, фильтрация, форматирование колонки.
- [x] Unit-тесты `tests/lib.test.ts` на `node:test` (12 тестов).
- [x] README/TASK/DESIGN обновлены: установка, управление, ограничения,
      проверка.
- [x] `npm run check` и `npm test` проходят.
- [x] Живой тест в tmux: открытие, фильтр (`tab` → 17/41), прокрутка,
      `Esc`, повторное открытие.
- [x] `git init`, первый коммит; финальный коммит — после проверки.

## Критерии приёмки

- [x] `Ctrl+Alt+K` открывает диалог; `Esc` закрывает.
- [x] В списке есть команды с фактическими биндами, сгруппированные по `group`.
- [x] Поиск и прокрутка работают.
- [x] Нет ошибок в логе и крашей TUI.
- [x] `npm run check` проходит.
- [x] `npm test` проходит.
- [x] README содержит установку, управление и ограничения.
- [x] Изменения закоммичены.

## Ограничения

- Плагин только читает keymap, не переопределяет бинды и не выполняет команды.
- Показываются именованные команды; анонимные inline-биндинги без заголовка
  (внутреннее редактирование ввода) не выводятся.
- Список — снимок на момент открытия, без live-обновления при открытом диалоге.
- Не претендует на upstream which-key.
- Для работы нужен OpenCode 2.2.0+ и OpenTUI 0.7.

## Проверка

```bash
cd ~/github/opencode-keymap-cheatsheet
npm run check
npm test
```

Живой тест:

```bash
tmux -L test new-session -d -s whk -x 140 -y 45 "opencode --standalone"
sleep 22
tmux -L test send-keys -t whk C-M-k
sleep 2
tmux -L test capture-pane -p -t whk -S -45
tmux -L test send-keys -t whk -l "tab"
sleep 1
tmux -L test send-keys -t whk NPage
sleep 1
tmux -L test send-keys -t whk Escape
tmux -L test kill-server
```
