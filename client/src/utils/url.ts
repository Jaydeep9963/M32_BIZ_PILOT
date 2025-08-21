export function extractUniqueUrls(input: string, max: number = 5): string[] {
  const urlRegex = /(https?:\/\/[^\s)\]]+)/g
  const matches = input.match(urlRegex) || []
  const unique = Array.from(new Set(matches))
  return unique.slice(0, max)
}


