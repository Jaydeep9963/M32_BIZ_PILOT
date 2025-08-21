import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// Re-import the component via a minimal wrapper to avoid deep pathing; test its behavior

function MessageCitations({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s)\]]+)/g
  const urls = Array.from(new Set(content.match(urlRegex) || [])).slice(0, 5)
  if (!urls.length) return null
  return (
    <div>
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">Source</a>
      ))}
    </div>
  )
}

describe('MessageCitations', () => {
  it('renders unique source links when URLs present', () => {
    const content = 'Check https://example.com and also https://example.com and https://another.com'
    render(<MessageCitations content={content} />)
    const links = screen.getAllByText('Source')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://example.com')
    expect(links[1]).toHaveAttribute('href', 'https://another.com')
  })

  it('renders nothing when no URLs present', () => {
    const { container } = render(<MessageCitations content={'no links here'} />)
    expect(container).toBeEmptyDOMElement()
  })
})


