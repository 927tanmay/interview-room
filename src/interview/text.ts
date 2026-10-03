// Small text helpers shared by the engine and the angle rules.

// Bank text is written about the candidate ("their own part"); spoken to them,
// it becomes "your own part".
export function toYou(text: string): string {
  return text
    .replace(/\bthemselves\b/g, 'yourself')
    .replace(/\btheir\b/g, 'your')
    .replace(/\bthey are\b/g, 'you are')
    .replace(/\bthey\b/g, 'you')
    .replace(/\bthem\b/g, 'you')
}

export function wordCount(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
