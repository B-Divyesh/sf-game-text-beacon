import { describe, expect, test } from 'vitest'
import { tessdataCandidates } from '../scripts/tessdata-layout.mjs'

describe('Tesseract tessdata package layouts', () => {
  test('finds Ubuntu 22.04 English data when --list-langs omits its directory', () => {
    const ubuntu2204ListOutput = 'List of available languages (2):\neng\nosd\n'
    expect(ubuntu2204ListOutput).not.toMatch(/in "/)
    expect(tessdataCandidates({
      platform: 'linux',
      executable: '/usr/bin/tesseract',
      environment: {},
      packageFiles: '/usr/share/tesseract-ocr/4.00/tessdata/eng.traineddata\n'
    })).toContain('/usr/share/tesseract-ocr/4.00/tessdata')
  })
})
