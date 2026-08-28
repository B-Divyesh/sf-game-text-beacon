import { describe, expect, it } from 'vitest'
import { demoKey, onlySameOrigin, queueRead, sampleRead } from './logic'

describe('reading queue', () => {
  it('keeps reads in the order they were captured', () => {
    expect(queueRead([], sampleRead)).toEqual([sampleRead])
  })
})

describe('demo sandbox', () => {
  it('@claim:sample-read provides a realistic game objective for the one-click demo', () => {
    expect(sampleRead.text).toContain('radio tower')
    expect(sampleRead.source).toBe('Sample objective panel')
  })

  it('@claim:demo-isolated uses a separate storage namespace', () => {
    expect(demoKey('visited')).toMatch(/^demo:game-text-beacon:/)
  })

  it('@claim:local-demo-network allows only same-origin demo requests', () => {
    expect(onlySameOrigin(['/beacon-notebook.webp', '/assets/main.js'], 'https://game-text-beacon.sociobot.in')).toBe(true)
    expect(onlySameOrigin(['https://example.com/pixel'], 'https://game-text-beacon.sociobot.in')).toBe(false)
  })
})
