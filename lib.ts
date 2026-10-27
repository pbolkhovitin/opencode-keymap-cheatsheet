/**
 * Pure helpers for the keymap cheatsheet.
 *
 * Kept free of Solid/OpenTUI imports so they can be unit-tested with Node's
 * built-in test runner.
 */

/** The subset of a keymap command the cheatsheet needs. */
export type CommandLike = {
  readonly id?: string
  readonly title?: string
  readonly group?: string
  readonly bind?: false | string
}

/** `keymap.shortcuts()` returns a list, but older shapes used a single string. */
export type ShortcutSource = readonly string[] | string | null | undefined

export type ShortcutResolver = (id: string) => ShortcutSource

export type CheatRow = {
  id: string
  title: string
  /** Individual formatted shortcuts, e.g. ["ctrl+x p", "<leader>v"]. */
  keys: string[]
  /** Shortcuts joined for display, e.g. "ctrl+x p / <leader>v". */
  label: string
  group: string
  /** Keys that another command also uses (display conflict). */
  shared: string[]
}

export type CheatGroup = {
  name: string
  rows: CheatRow[]
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

/**
 * Normalizes a `shortcuts()` value into a de-duplicated list of non-empty
 * shortcut strings. Accepts arrays, a single string, and nullish values.
 */
export function shortcutList(source: ShortcutSource): string[] {
  const values = typeof source === "string" ? [source] : Array.isArray(source) ? source : []
  const keys: string[] = []
  for (const value of values) {
    if (typeof value !== "string") continue
    const key = normalizeKey(value)
    if (key) keys.push(key)
  }
  return [...new Set(keys)]
}

function compareRows(a: CheatRow, b: CheatRow): number {
  return (
    a.group.localeCompare(b.group) ||
    a.title.localeCompare(b.title) ||
    a.label.localeCompare(b.label) ||
    a.id.localeCompare(b.id)
  )
}

/**
 * Builds the display rows from reachable commands and their shortcuts.
 *
 * Skips commands without an id/title, resolver failures, and commands
 * without any shortcut. `bind === false` only disables the layer's default
 * fallback binding; the command may still have configured shortcuts, so it is
 * not a reason to skip. Rows are sorted by group, then title. Sequences used
 * by more than one command are recorded in `shared`.
 */
export function collectRows(commands: Iterable<CommandLike>, shortcuts: ShortcutResolver): CheatRow[] {
  const rows: CheatRow[] = []
  for (const command of commands) {
    if (!command.id || !command.title) continue

    let source: ShortcutSource
    try {
      source = shortcuts(command.id)
    } catch {
      continue
    }

    const keys = shortcutList(source)
    if (keys.length === 0) continue

    rows.push({
      id: command.id,
      title: command.title.trim() || command.id,
      keys,
      label: keys.join(" / "),
      group: command.group?.trim() || "General",
      shared: [],
    })
  }

  const owners = new Map<string, Set<string>>()
  for (const row of rows) {
    for (const key of row.keys) {
      const ids = owners.get(key) ?? new Set<string>()
      ids.add(row.id)
      owners.set(key, ids)
    }
  }
  for (const row of rows) {
    row.shared = row.keys.filter((key) => (owners.get(key)?.size ?? 0) > 1)
  }

  return rows.sort(compareRows)
}

/**
 * Pads or truncates a shortcut label to a fixed terminal column. Labels are
 * rendered as a single text node so a long sequence cannot overlap the title.
 */
export function formatShortcutColumn(label: string, width: number): string {
  if (width <= 0) return ""
  const chars = [...label]
  if (chars.length > width) {
    if (width === 1) return "…"
    return `${chars.slice(0, width - 1).join("")}…`
  }
  return label.padEnd(width)
}

/**
 * Case-insensitive filter across shortcut keys, command title, and group.
 *
 * A query that matches as an exact phrase wins, so `ctrl+x p` selects that
 * sequence instead of every row containing both `ctrl+x` and the letter `p`.
 * Otherwise whitespace-separated terms must all match somewhere in the row.
 */
export function filterRows(rows: readonly CheatRow[], query: string): CheatRow[] {
  const needle = query.trim().toLowerCase().replace(/\s+/g, " ")
  if (needle.length === 0) return [...rows]

  const haystack = (row: CheatRow) => `${row.label} ${row.title} ${row.group}`.toLowerCase()
  const phrase = rows.filter((row) => haystack(row).includes(needle))
  if (phrase.length > 0) return phrase

  const terms = needle.split(" ").filter(Boolean)
  return rows.filter((row) => {
    const text = haystack(row)
    return terms.every((term) => text.includes(term))
  })
}

/** Groups rows preserving their order, with one entry per group. */
export function groupRows(rows: readonly CheatRow[]): CheatGroup[] {
  const groups = new Map<string, CheatRow[]>()
  for (const row of rows) {
    const items = groups.get(row.group) ?? []
    items.push(row)
    groups.set(row.group, items)
  }
  return [...groups.entries()].map(([name, items]) => ({ name, rows: items }))
}
