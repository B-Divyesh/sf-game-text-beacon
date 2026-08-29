import { describe, expect, test } from 'vitest'
import { macDependencyCandidates } from '../scripts/macos-library-layout.mjs'

describe('macOS OCR runtime library layout', () => {
  test('copies Homebrew libsharpyuv referenced through libwebpmux @rpath', () => {
    expect(macDependencyCandidates({
      dependency: '@rpath/libsharpyuv.0.dylib',
      libraryPath: '/opt/homebrew/Cellar/webp/1.5.0/lib/libwebpmux.3.dylib'
    })).toEqual(['/opt/homebrew/Cellar/webp/1.5.0/lib/libsharpyuv.0.dylib'])
  })
})
