import { writeFileSync } from 'node:fs'

// A portable ASCII PGM fixture keeps installed-package tests independent of
// image libraries or fonts on Windows, macOS, and Linux. It spells TEST in a
// large high-contrast bitmap that Tesseract reads with single-line mode.
const glyphs = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100']
}

export const writeOcrFixture = (path, text = 'TEST') => {
  const scale = 12
  const margin = 18
  const spacing = 3 * scale
  const width = margin * 2 + text.length * 5 * scale + (text.length - 1) * spacing
  const height = margin * 2 + 7 * scale
  const pixels = Array.from({ length: height }, () => Array(width).fill(255))
  for (let index = 0; index < text.length; index += 1) {
    const glyph = glyphs[text[index]]
    if (!glyph) throw new Error(`No OCR fixture glyph for ${text[index]}`)
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== '1') continue
        for (let y = 0; y < scale; y += 1) {
          for (let x = 0; x < scale; x += 1) {
            pixels[margin + row * scale + y][margin + index * (5 * scale + spacing) + column * scale + x] = 0
          }
        }
      }
    }
  }
  writeFileSync(path, `P2\n${width} ${height}\n255\n${pixels.map((row) => row.join(' ')).join('\n')}\n`)
}
