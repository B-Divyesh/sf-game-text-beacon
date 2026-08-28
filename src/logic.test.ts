import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
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

  it('@claim:desktop-local-ocr keeps the native capture path local', () => {
    const native = readFileSync('src-tauri/src/lib.rs', 'utf8')
    expect(native).toContain('Command::new("tesseract")')
    expect(native).not.toMatch(/https?:\/\//)
  })

  it('@claim:free-no-account has no account or payment flow in the shipped app', () => {
    const client = readFileSync('src/main.ts', 'utf8')
    expect(client).not.toMatch(/sign in|create account|checkout|payment/i)
  })
})
