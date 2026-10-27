import assert from "node:assert/strict"
import test from "node:test"

import {
  collectRows,
  filterRows,
  formatShortcutColumn,
  groupRows,
  shortcutList,
  type CheatRow,
  type CommandLike,
} from "../lib.ts"

function row(input: Partial<CheatRow> & Pick<CheatRow, "id" | "title">): CheatRow {
  const keys = input.keys ?? ["ctrl+k"]
  return {
    keys,
    label: input.label ?? keys.join(" / "),
    group: input.group ?? "General",
    shared: input.shared ?? [],
    ...input,
  }
}

test("shortcutList normalizes strings, arrays and junk", () => {
  assert.deepEqual(shortcutList(["ctrl+x p", "  <leader>v  "]), ["ctrl+x p", "<leader>v"])
  assert.deepEqual(shortcutList("ctrl+alt+k"), ["ctrl+alt+k"])
  assert.deepEqual(shortcutList(["ctrl+k", "ctrl+k"]), ["ctrl+k"])
  assert.deepEqual(shortcutList(["", "   ", "ctrl+k"]), ["ctrl+k"])
  assert.deepEqual(shortcutList(undefined), [])
  assert.deepEqual(shortcutList(null), [])
  assert.deepEqual(shortcutList([] as string[]), [])
})

test("formatShortcutColumn pads and truncates labels", () => {
  assert.equal(formatShortcutColumn("ctrl+k", 10), "ctrl+k    ")
  assert.equal(formatShortcutColumn("ctrl+x ] / ctrl+tab", 10), "ctrl+x ] …")
  assert.equal(formatShortcutColumn("abc", 1), "…")
  assert.equal(formatShortcutColumn("abc", 0), "")
})

test("collectRows keeps bound commands and groups unlabeled ones under General", () => {
  const commands: CommandLike[] = [
    { id: "b", title: "Second", group: "Zeta", bind: "x" },
    { id: "a", title: "First", bind: "y" },
    { id: "c", title: "No shortcut" },
    { id: "d", title: "Disabled", bind: false },
    { title: "Untitled" },
    { id: "e" },
  ]
  const shortcuts = (id: string) => (id === "a" ? ["ctrl+a"] : id === "b" ? ["ctrl+b"] : [])

  assert.deepEqual(
    collectRows(commands, shortcuts).map((item) => [item.group, item.title, item.label]),
    [
      ["General", "First", "ctrl+a"],
      ["Zeta", "Second", "ctrl+b"],
    ],
  )
})

test("collectRows includes bind:false commands that have configured shortcuts", () => {
  const rows = collectRows([{ id: "session.tab.next", title: "Next tab", bind: false }], () => [
    "ctrl+x ]",
    "ctrl+tab",
  ])
  assert.deepEqual(rows.map((item) => [item.id, item.label]), [
    ["session.tab.next", "ctrl+x ] / ctrl+tab"],
  ])
})

test("collectRows survives a throwing shortcuts resolver", () => {  const commands: CommandLike[] = [
    { id: "broken", title: "Broken" },
    { id: "ok", title: "Ok" },
  ]
  const rows = collectRows(commands, (id) => {
    if (id === "broken") throw new Error("unknown command")
    return ["ctrl+o"]
  })
  assert.deepEqual(rows.map((item) => item.id), ["ok"])
})

test("collectRows formats multi-key sequences and aliases", () => {
  const rows = collectRows([{ id: "tabs.next", title: "Next tab", group: "Session" }], () => [
    "<leader>]",
    "ctrl+tab",
    "alt+down",
  ])
  assert.equal(rows[0]?.label, "<leader>] / ctrl+tab / alt+down")
  assert.deepEqual(rows[0]?.keys, ["<leader>]", "ctrl+tab", "alt+down"])
})

test("collectRows marks sequences shared by several commands", () => {
  const commands: CommandLike[] = [
    { id: "one", title: "One" },
    { id: "two", title: "Two" },
    { id: "three", title: "Three" },
  ]
  const rows = collectRows(commands, (id) => {
    if (id === "one") return ["ctrl+d"]
    if (id === "two") return ["ctrl+d", "ctrl+e"]
    return ["ctrl+e"]
  })

  assert.deepEqual(rows.map((item) => [item.id, item.shared]), [
    ["one", ["ctrl+d"]],
    ["three", ["ctrl+e"]],
    ["two", ["ctrl+d", "ctrl+e"]],
  ])
})

test("collectRows sorts rows by group and title", () => {
  const rows = collectRows(
    [
      { id: "3", title: "Zulu", group: "VCS" },
      { id: "2", title: "Alpha", group: "Session" },
      { id: "1", title: "Beta", group: "Session" },
    ],
    (id) => [`ctrl+${id}`],
  )
  assert.deepEqual(rows.map((item) => item.id), ["2", "1", "3"])
})

test("filterRows matches title, group and keys case-insensitively", () => {
  const rows = [
    row({ id: "1", title: "Next tab", group: "Session", keys: ["<leader>]", "ctrl+tab"] }),
    row({ id: "2", title: "Diff open", group: "VCS", keys: ["<leader>d"] }),
    row({ id: "3", title: "Plugins", group: "General", keys: ["<leader>p"] }),
  ]

  assert.deepEqual(filterRows(rows, "TAB").map((item) => item.id), ["1"])
  assert.deepEqual(filterRows(rows, "vcs").map((item) => item.id), ["2"])
  assert.deepEqual(filterRows(rows, "<leader>d").map((item) => item.id), ["2"])
  assert.deepEqual(filterRows(rows, "leader").map((item) => item.id), ["1", "2", "3"])
})

test("filterRows prefers an exact phrase over loose terms", () => {
  const rows = [
    row({ id: "1", title: "Plugins", group: "System", keys: ["ctrl+x p"] }),
    row({ id: "2", title: "Previous tab", group: "Session", keys: ["ctrl+x [", "ctrl+shift+tab"] }),
  ]
  assert.deepEqual(filterRows(rows, "ctrl+x p").map((item) => item.id), ["1"])
})

test("filterRows requires every whitespace-separated term", () => {
  const rows = [
    row({ id: "1", title: "Next tab", group: "Session", keys: ["ctrl+tab"] }),
    row({ id: "2", title: "Previous tab", group: "Session", keys: ["ctrl+shift+tab"] }),
  ]
  assert.deepEqual(filterRows(rows, "session tab prev").map((item) => item.id), ["2"])
  assert.deepEqual(filterRows(rows, "session missing"), [])
})

test("filterRows returns a copy for an empty query", () => {
  const rows = [row({ id: "1", title: "One" })]
  const result = filterRows(rows, "   ")
  assert.deepEqual(result, rows)
  assert.notEqual(result, rows)
})

test("groupRows groups rows preserving order", () => {
  const groups = groupRows([
    row({ id: "1", title: "One", group: "B" }),
    row({ id: "2", title: "Two", group: "A" }),
    row({ id: "3", title: "Three", group: "B" }),
  ])
  assert.deepEqual(
    groups.map((group) => [group.name, group.rows.map((item) => item.id)]),
    [
      ["B", ["1", "3"]],
      ["A", ["2"]],
    ],
  )
})
