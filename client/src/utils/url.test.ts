import { describe, it, expect } from 'vitest'
import { extractUniqueUrls } from './url'

describe('extractUniqueUrls', () => {
  it('returns unique urls in order, capped by max', () => {
    const input = 'a https://a.com b https://a.com c https://b.com d https://c.com e https://d.com f https://e.com g https://f.com'
    const out = extractUniqueUrls(input, 5)
    expect(out).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
      'https://d.com',
      'https://e.com',
    ])
  })

  it('handles no urls', () => {
    expect(extractUniqueUrls('no urls here')).toEqual([])
  })
})


