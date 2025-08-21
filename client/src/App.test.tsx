import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

const renderApp = () => render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

describe('App routing and theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders Home route with CTA buttons', () => {
    renderApp()
    expect(screen.getByText('BizPilot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('applies dark theme based on prefers-color-scheme', () => {
    const matcher = window.matchMedia
    // @ts-expect-error override for test
    window.matchMedia = () => ({ matches: true, addEventListener(){}, removeEventListener(){}, media: '', onchange: null, addListener(){}, removeListener(){} })
    renderApp()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    window.matchMedia = matcher
  })
})


