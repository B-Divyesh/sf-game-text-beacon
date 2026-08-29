import { dirname, join } from 'node:path'

// Some Tesseract builds include the tessdata directory in `--list-langs` and
// Ubuntu 22.04's build does not. Keep the fallback locations pure and tested
// so package preparation stays compatible with both output formats.
export const tessdataCandidates = ({ platform, executable, environment, packageFiles }) => {
  const candidates = [environment.TESSDATA_PREFIX]
  if (platform === 'windows') candidates.push(join(dirname(executable), 'tessdata'))
  if (platform === 'macos') candidates.push(join(dirname(dirname(executable)), 'share', 'tessdata'))
  if (platform === 'linux') {
    candidates.push(
      '/usr/share/tesseract-ocr/5/tessdata',
      '/usr/share/tesseract-ocr/4.00/tessdata',
      '/usr/share/tesseract-ocr/tessdata',
      '/usr/local/share/tessdata'
    )
    candidates.push(...packageFiles.split(/\r?\n/).filter((file) => file.endsWith('/eng.traineddata')).map(dirname))
  }
  return candidates.filter(Boolean)
}
