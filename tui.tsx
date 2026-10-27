import type { InputRenderable, ScrollBoxRenderable } from "@opentui/core"
import { Plugin } from "@opencode/plugin/tui"
import { createMemo, createSignal, For, Show } from "solid-js"

import { collectRows, filterRows, formatShortcutColumn, groupRows, type CheatRow } from "./lib"

const PLUGIN_ID = "keymap-cheatsheet"
const KEY_COLUMN = 34

export default Plugin.define({
  id: PLUGIN_ID,
  async setup(context) {
    const [open, setOpen] = createSignal(false)
    /** Snapshot taken before the dialog switches OpenCode into modal mode. */
    const [rows, setRows] = createSignal<CheatRow[]>([])
    const [filter, setFilter] = createSignal("")

    let scroll: ScrollBoxRenderable | undefined

    const visible = createMemo(() => filterRows(rows(), filter()))
    const groups = createMemo(() => groupRows(visible()))
    // Leave room for the header, search field, footer and the dialog's inset.
    const listHeight = () => Math.max(6, Math.floor(context.renderer.terminalHeight / 2) - 8)

    const scrollToTop = () => {
      if (!scroll || scroll.isDestroyed) return
      scroll.scrollTop = 0
    }

    const scrollBy = (delta: number) => {
      if (!scroll || scroll.isDestroyed) return
      scroll.scrollBy(delta)
    }

    const scrollToBottom = () => {
      if (!scroll || scroll.isDestroyed) return
      scroll.scrollTop = scroll.scrollHeight
    }

    const pageSize = () => Math.max(1, listHeight() - 2)

    const close = () => {
      setOpen(false)
      context.ui.dialog.clear()
    }

    const show = () => {
      if (open()) return
      // Read the active (base-mode) keymap before the dialog pushes modal mode;
      // otherwise reachable commands would shrink to dialog-only commands.
      setRows(
        collectRows(context.keymap.commands(), (id) => {
          try {
            return context.keymap.shortcuts(id)
          } catch {
            return []
          }
        }),
      )
      setFilter("")
      setOpen(true)
      context.ui.dialog.set({ size: "large" })
      context.ui.dialog.show(
        () => (
          <box flexDirection="column" paddingLeft={3} paddingRight={3} paddingBottom={1} gap={1}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={context.theme.text.base}>Keyboard shortcuts</text>
              <text fg={context.theme.text.muted}>esc close</text>
            </box>
            <input
              ref={(r: InputRenderable) => {
                setTimeout(() => {
                  if (!r.isDestroyed) r.focus()
                }, 1)
              }}
              placeholder="Search by command, group or keys"
              placeholderColor={context.theme.text.muted}
              focusedBackgroundColor={context.theme.background.formfield.focused}
              focusedTextColor={context.theme.text.formfield.focused}
              cursorColor={context.theme.text.formfield.focused}
              onInput={(value) => {
                setFilter(value)
                scrollToTop()
              }}
            />
            <Show
              when={visible().length > 0}
              fallback={
                <text fg={context.theme.text.muted}>
                  {rows().length === 0 ? "No bound commands found." : "No matching shortcuts."}
                </text>
              }
            >
              <scrollbox
                ref={(r: ScrollBoxRenderable) => {
                  scroll = r
                }}
                maxHeight={listHeight()}
                scrollbarOptions={{ visible: true }}
              >
                <For each={groups()}>
                  {(group, index) => (
                    <box flexDirection="column" marginTop={index() === 0 ? 0 : 1}>
                      <text fg={context.theme.text.muted}>{group.name}</text>
                      <For each={group.rows}>
                        {(row) => (
                          <box flexDirection="row">
                            <text wrapMode="none" fg={context.theme.text.base}>
                              {`${formatShortcutColumn(row.label, KEY_COLUMN - 1)} `}
                            </text>
                            <text
                              wrapMode="none"
                              truncate
                              flexGrow={1}
                              flexShrink={1}
                              fg={context.theme.text.base}
                            >
                              {row.title}
                            </text>
                            <Show when={row.shared.length > 0}>
                              <text
                                flexShrink={0}
                                fg={context.theme.text.feedback.warning.base}
                                marginLeft={1}
                              >
                                dup
                              </text>
                            </Show>
                          </box>
                        )}
                      </For>
                    </box>
                  )}
                </For>
              </scrollbox>
            </Show>
            <text wrapMode="none" fg={context.theme.text.muted}>
              {`${visible().length}/${rows().length} · ↑↓ scroll · PgUp/PgDn · esc close`}
            </text>
          </box>
        ),
        () => setOpen(false),
      )
    }

    context.keymap.layer(() => ({
      mode: "modal",
      enabled: open,
      commands: [
        {
          id: `${PLUGIN_ID}.scroll.up`,
          title: "Scroll shortcuts up",
          group: "Help",
          bind: "up",
          run: () => scrollBy(-1),
        },
        {
          id: `${PLUGIN_ID}.scroll.down`,
          title: "Scroll shortcuts down",
          group: "Help",
          bind: "down",
          run: () => scrollBy(1),
        },
        {
          id: `${PLUGIN_ID}.scroll.page_up`,
          title: "Page shortcuts up",
          group: "Help",
          bind: "pageup",
          run: () => scrollBy(-pageSize()),
        },
        {
          id: `${PLUGIN_ID}.scroll.page_down`,
          title: "Page shortcuts down",
          group: "Help",
          bind: "pagedown",
          run: () => scrollBy(pageSize()),
        },
        {
          id: `${PLUGIN_ID}.scroll.home`,
          title: "First shortcuts page",
          group: "Help",
          bind: "home",
          run: scrollToTop,
        },
        {
          id: `${PLUGIN_ID}.scroll.end`,
          title: "Last shortcuts page",
          group: "Help",
          bind: "end",
          run: scrollToBottom,
        },
        {
          id: `${PLUGIN_ID}.toggle`,
          title: "Close keyboard shortcuts",
          group: "Help",
          bind: "ctrl+alt+k",
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

    return () => {
      scroll = undefined
      if (!open()) return
      setOpen(false)
      context.ui.dialog.clear()
    }
  },
})
