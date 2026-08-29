import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tessdataCandidates } from './tessdata-layout.mjs'

// This runs only while building a desktop package. It turns the OCR engine
// already provisioned on the release runner into a private app resource. The
// shipped app never downloads an OCR engine and never depends on PATH.
const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const resourceRoot = join(repositoryRoot, 'src-tauri', 'resources', 'ocr')
const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux'
const runtimeRoot = join(resourceRoot, platform)
const libraryRoot = join(runtimeRoot, 'lib')

const fail = (message) => {
  throw new Error(`Cannot prepare the bundled OCR runtime: ${message}`)
}

const run = (program, args, options = {}) => {
  const result = spawnSync(program, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) fail(`${program} ${args.join(' ')} failed. ${result.stderr || result.stdout}`)
  return result.stdout
}

const commandPath = () => {
  if (process.env.BEACON_TESSERACT) return resolve(process.env.BEACON_TESSERACT)
  if (platform === 'windows') {
    const output = spawnSync('where.exe', ['tesseract.exe'], { encoding: 'utf8' })
    const first = output.stdout.split(/\r?\n/).find(Boolean)
    if (first) return first.trim()
    const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Tesseract-OCR', 'tesseract.exe')
    if (existsSync(candidate)) return candidate
  } else {
    const output = spawnSync('which', ['tesseract'], { encoding: 'utf8' })
    const first = output.stdout.split(/\r?\n/).find(Boolean)
    if (first) return first.trim()
  }
  fail('Tesseract is not installed on this build runner. Install the release runtime prerequisite before packaging.')
}

const copy = (source, destination) => {
  mkdirSync(dirname(destination), { recursive: true })
  copyFileSync(source, destination)
}

const parseTessdataDirectory = (executable) => {
  const output = run(executable, ['--list-langs'])
  const match = output.match(/in "([^"]+)"/)
  if (match) return match[1]

  const packageFiles = platform === 'linux'
    ? spawnSync('dpkg-query', ['-L', 'tesseract-ocr-eng'], { encoding: 'utf8' }).stdout
    : ''
  const candidates = tessdataCandidates({ platform, executable, environment: process.env, packageFiles })
  const tessdata = candidates.find((directory) => directory && existsSync(join(directory, 'eng.traineddata')))
  if (tessdata) return tessdata
  fail(`could not find Tesseract data directory in: ${output}`)
}

const copyEnglishData = (executable) => {
  const tessdata = parseTessdataDirectory(executable)
  const english = join(tessdata, 'eng.traineddata')
  if (!existsSync(english)) fail(`English language data is missing at ${english}`)
  copy(english, join(runtimeRoot, 'tessdata', 'eng.traineddata'))
}

const linkedLibraries = (file) => {
  if (platform === 'linux') {
    return run('ldd', [file])
      .split('\n')
      .map((line) => line.match(/=>\s+(\/\S+)/)?.[1] ?? line.match(/^\s*(\/\S+)/)?.[1])
      .filter((path) => path && existsSync(path))
  }
  if (platform === 'macos') {
    return run('otool', ['-L', file])
      .split('\n')
      .slice(1)
      .map((line) => line.trim().split(' ')[0])
      .filter((path) => path?.startsWith('/') && existsSync(path))
  }
  return []
}

const isPlatformRuntimeLibrary = (path) => {
  const name = basename(path)
  if (platform === 'linux') {
    return !/^(libc|libm|libpthread|librt|libdl|ld-linux)\./.test(name)
  }
  if (platform === 'macos') return !path.startsWith('/usr/lib/') && !path.startsWith('/System/Library/')
  return false
}

const copyLibraryClosure = (executable) => {
  if (platform === 'windows') {
    const sourceDirectory = dirname(executable)
    for (const name of readdirSync(sourceDirectory)) {
      const source = join(sourceDirectory, name)
      if (statSync(source).isFile() && /\.dll$/i.test(name)) copy(source, join(libraryRoot, name))
    }
    return
  }

  const queued = [executable]
  const visited = new Set()
  while (queued.length) {
    const source = queued.pop()
    if (!source || visited.has(source)) continue
    visited.add(source)
    for (const dependency of linkedLibraries(source)) {
      if (!isPlatformRuntimeLibrary(dependency) || visited.has(dependency)) continue
      const destination = join(libraryRoot, basename(dependency))
      if (!existsSync(destination)) copy(dependency, destination)
      queued.push(dependency)
    }
  }
}

const files = (directory) => readdirSync(directory, { recursive: true })
  .filter((name) => statSync(join(directory, name)).isFile())
  .sort()

rmSync(runtimeRoot, { recursive: true, force: true })
mkdirSync(libraryRoot, { recursive: true })
const executable = commandPath()
const executableName = platform === 'windows' ? 'tesseract.exe' : 'tesseract'
copy(executable, join(runtimeRoot, executableName))
if (platform !== 'windows') {
  // Tauri preserves this mode in every package format, including AppImage.
  // `chmod` is harmless on macOS and unavailable only on Windows.
  try { run('chmod', ['755', join(runtimeRoot, executableName)]) } catch { /* Windows never reaches this branch. */ }
}
copyLibraryClosure(executable)
copyEnglishData(executable)
if (platform === 'linux') {
  const speech = spawnSync('which', ['espeak-ng'], { encoding: 'utf8' }).stdout.trim()
  if (!speech) fail('eSpeak NG is not installed on this Linux build runner.')
  copy(speech, join(runtimeRoot, 'speech', 'espeak-ng'))
  run('chmod', ['755', join(runtimeRoot, 'speech', 'espeak-ng')])
  copyLibraryClosure(speech)
  const speechVersion = run(speech, ['--version'])
  const dataDirectory = speechVersion.match(/Data at:\s*(.+)/)?.[1]?.trim()
  if (!dataDirectory || !existsSync(dataDirectory)) fail(`could not find eSpeak NG data directory in: ${speechVersion}`)
  cpSync(dataDirectory, join(runtimeRoot, 'speech', 'espeak-ng-data'), { recursive: true })
}

const version = run(executable, ['--version']).split(/\r?\n/)[0]
const manifest = {
  platform,
  engine: version,
  language: 'eng',
  files: files(runtimeRoot)
}
writeFileSync(join(runtimeRoot, 'runtime-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Prepared bundled OCR runtime for ${platform}: ${version}`)
console.log(`Included ${manifest.files.length} files, including English language data.`)
