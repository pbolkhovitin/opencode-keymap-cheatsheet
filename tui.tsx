import { createMemo, createSignal } from "solid-js"
import { Plugin } from "@opencode/plugin/tui"

const PLUGIN_ID = "keymap-cheatsheet"

type Row = {
  keys: string
  title: string
  group: string
}

type Group = [string, Row[]]

function shortcutLabel(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(" / ")
  if (typeof value === "string") return value
  return ""
}

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(context) {
    const [open, setOpen] = createSignal(false)

    const rows = createMemo<Row[]>(() => {
      const result: Row[] = []
      for (const command of context.keymap.commands()) {
        if (!command.id || !command.title) continue
        if (command.bind === false) continue

        let keys = ""
        try {
          keys = shortcutLabel(context.keymap.shortcuts(command.id))
        } catch {
          continue
        }
        if (!keys) continue

        result.push({
          keys,
          title: command.title,
          group: command.group ?? "General",
        })
      }
      return result.sort(
        (a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title),
      )
    })

    const groups = createMemo<Group[]>(() => {
      const map = new Map<string, Row[]>()
      for (const row of rows()) {
        const items = map.get(row.group) ?? []
        items.push(row)
        map.set(row.group, items)
      }
      return [...map.entries()]
    })

    const close = () => {
      setOpen(false)
      context.ui.dialog.clear()
    }

    const show = () => {
      setOpen(true)
      context.ui.dialog.set({ size: "large" })
      context.ui.dialog.show(
        () => (
          <box flexDirection="column" padding={1}>
            <text fg={context.theme.text.base}>Keyboard shortcuts</text>
            <text fg={context.theme.text.muted}>esc — close · ctrl+alt+k — toggle</text>
            {rows().length === 0 ? (
              <text fg={context.theme.text.muted}>No bound commands found.</text>
            ) : (
              groups().map(([group, items]) => (
                <box flexDirection="column" marginTop={1}>
                  <text fg={context.theme.text.muted}>{group}</text>
                  {items.map((row) => (
                    <box flexDirection="row">
                      <text fg={context.theme.text.base}>{row.keys.padEnd(32)}</text>
                      <text fg={context.theme.text.base}>{row.title}</text>
                    </box>
                  ))}
                </box>
              ))
            )}
          </box>
        ),
        () => setOpen(false),
      )
    }

    context.keymap.layer(() => ({
      mode: "modal",
      enabled: open(),
      commands: [
        {
          id: `${PLUGIN_ID}.close`,
          title: "Close keyboard shortcuts",
          bind: "escape",
          run: close,
        },
      ],
    }))

    context.keymap.layer(() => ({
      commands: [
        {
          id: `${PLUGIN_ID}.show`,
          title: "Keyboard shortcuts",
          group: "Help",
          bind: "ctrl+alt+k",
          run: show,
        },
      ],
    }))
  },
})
