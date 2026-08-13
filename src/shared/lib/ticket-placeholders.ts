/**
 * {{placeholder.x}} tokens for favorite ticket templates.
 *
 * Tokens are whitespace-agnostic inside the braces: `{{placeholder.file}}`,
 * `{{ placeholder.file }}` and `{{ placeholder.file}}` all reference the
 * placeholder named "file". Names may contain letters, digits, `_`, `-` and `.`.
 */
const PLACEHOLDER_PATTERN = /\{\{\s*placeholder\.([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*\}\}/g

/**
 * Extracts the unique placeholder names referenced by the given texts, in
 * order of first appearance. Null/undefined texts are skipped.
 */
export function extractPlaceholderNames(...texts: Array<string | null | undefined>): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
      const name = match[1]
      if (!seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    }
  }
  return names
}

/**
 * Replaces every {{placeholder.x}} occurrence with values[x]. Tokens without a
 * provided value are left untouched. Uses a replacer callback so `$`
 * sequences in values are never interpreted as replacement tokens.
 */
export function substitutePlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER_PATTERN, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : token
  )
}

/** True when the text references at least one {{placeholder.x}} token. */
export function hasPlaceholders(...texts: Array<string | null | undefined>): boolean {
  return extractPlaceholderNames(...texts).length > 0
}
