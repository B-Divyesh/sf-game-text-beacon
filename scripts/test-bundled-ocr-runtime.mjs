import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { writeOcrFixture } from './ocr-fixture.mjs'

const requestedKind = process.argv.includes('--kind') ? process.argv[process.argv.indexOf('--kind') + 1] : undefined
const scratch = mkdtempSync(join(tmpdir(), 'game-text-beacon-bundled-ocr-'))
const packageVersion = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version

const run = (program, args, options = {}) => {
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024, ...options })
  assert.equal(result.status, 0, `${program} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  return result
}

const files = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))

const currentPackage = (directory, extension) => {
  const name = readdirSync(directory).filter((file) => file.endsWith(extension) && file.includes(packageVersion)).sort().at(-1)
  assert(name, `No current ${packageVersion} ${extension} package found in ${directory}`)
  return name
}

const packageExists = () => {
  const target = resolve('src-tauri/target')
  if (!existsSync(target)) return false
  const packageFiles = files(target)
  if (process.platform === 'linux') {
    const required = requestedKind === 'deb'
      ? ['.deb']
      : requestedKind === 'rpm'
        ? ['.rpm']
        : requestedKind === 'appimage'
          ? ['.AppImage']
          : ['.deb', '.rpm', '.AppImage']
    return required.every((extension) => packageFiles.some((file) => file.endsWith(extension) && file.includes(packageVersion)))
  }
  const extension = process.platform === 'win32' ? '.msi' : '.dmg'
  return packageFiles.some((file) => file.endsWith(extension) && file.includes(packageVersion))
}

const ensureCurrentPlatformPackage = () => {
  if (packageExists()) return
  if (process.platform === 'linux') run('sh', ['scripts/install-linux-prereqs.sh'])
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const bundles = process.platform === 'linux'
    ? requestedKind === 'deb' ? 'deb' : requestedKind === 'rpm' ? 'rpm' : requestedKind === 'appimage' ? 'appimage' : 'deb,rpm,appimage'
    : process.platform === 'win32' ? 'msi' : 'dmg'
  run(npm, ['run', 'tauri', 'build', '--', '--bundles', bundles])
}

const runtimeFrom = (directory, platform) => {
  const manifest = files(directory).find((file) => file.endsWith(join('ocr', platform, 'runtime-manifest.json')))
  assert(manifest, `Missing bundled OCR manifest for ${platform} in ${directory}`)
  const runtime = resolve(manifest, '..')
  const executable = join(runtime, platform === 'windows' ? 'tesseract.exe' : 'tesseract')
  const language = join(runtime, 'tessdata', 'eng.traineddata')
  assert(files(runtime).includes(executable), `Missing bundled Tesseract executable: ${executable}`)
  assert(files(runtime).includes(language), `Missing bundled English language data: ${language}`)
  const metadata = JSON.parse(readFileSync(manifest, 'utf8'))
  assert.equal(metadata.platform, platform)
  assert.equal(metadata.language, 'eng')
  return { runtime, executable, language }
}

const verifyRead = ({ runtime, executable }) => {
  const fixture = join(scratch, `${basename(runtime)}-beacon.pgm`)
  writeOcrFixture(fixture)
  const environment = { ...process.env, TESSDATA_PREFIX: join(runtime, 'tessdata') }
  if (process.platform === 'linux') environment.LD_LIBRARY_PATH = join(runtime, 'lib')
  if (process.platform === 'darwin') environment.DYLD_LIBRARY_PATH = join(runtime, 'lib')
  // Start the payload by its installed absolute path and deliberately omit
  // the build runner's Tesseract directory. This is the clean-machine guard:
  // the MSI's copied DLLs must be sufficient for a fresh Windows user.
  if (process.platform === 'win32') environment.PATH = join(runtime, 'lib')
  const result = run(executable, [fixture, 'stdout', '--psm', '7'], { env: environment })
  assert.match(result.stdout, /TEST/i, `The bundled engine did not read the package fixture: ${result.stdout}`)

  if (process.platform === 'linux') {
    const speech = join(runtime, 'speech', 'espeak-ng')
    assert(files(runtime).includes(speech), `Missing bundled local speech executable: ${speech}`)
    assert(
      files(runtime).some((file) => file.endsWith(join('speech', 'espeak-ng-data', 'phondata'))),
      `Missing bundled eSpeak NG data: ${runtime}`
    )
    const speechResult = run(speech, [`--path=${join(runtime, 'speech')}`, '--stdout', 'Beacon package speech check.'], { env: environment, encoding: null })
    assert.equal(speechResult.stdout.subarray(0, 4).toString('ascii'), 'RIFF', 'The bundled voice did not synthesize WAV output')
  }
}

const testDebian = () => {
  const bundleDirectory = resolve('src-tauri/target/release/bundle')
  const debDirectory = join(bundleDirectory, 'deb')
  const deb = currentPackage(debDirectory, '.deb')
  const unpacked = join(scratch, 'deb')
  run('dpkg-deb', ['-x', join(debDirectory, deb), unpacked])
  verifyRead(runtimeFrom(unpacked, 'linux'))
  console.log(`PASS bundled OCR read from extracted Debian package: ${deb}`)
}

const testRpm = () => {
  const rpmDirectory = resolve('src-tauri/target/release/bundle/rpm')
  const rpm = currentPackage(rpmDirectory, '.rpm')
  const unpacked = join(scratch, 'rpm')
  mkdirSync(unpacked)
  // Ubuntu's rpm2cpio emits a valid archive but returns 1 for the rpmbuild
  // output in this packaging toolchain. cpio extraction plus the exact OCR
  // read below are the meaningful assertions; let cpio supply the status.
  run('bash', ['-c', 'rpm2cpio "$1" | (cd "$2" && cpio -idm --quiet)', 'bundled-rpm', join(rpmDirectory, rpm), unpacked])
  verifyRead(runtimeFrom(unpacked, 'linux'))
  console.log(`PASS bundled OCR read from extracted RPM package: ${rpm}`)
}

const testAppImage = () => {
  const bundleDirectory = resolve('src-tauri/target/release/bundle')
  const appImageDirectory = join(bundleDirectory, 'appimage')
  const appImage = currentPackage(appImageDirectory, '.AppImage')
  const appImageRoot = join(scratch, 'appimage')
  mkdirSync(appImageRoot)
  run(join(appImageDirectory, appImage), ['--appimage-extract'], { cwd: appImageRoot })
  verifyRead(runtimeFrom(join(appImageRoot, 'squashfs-root'), 'linux'))
  console.log(`PASS bundled OCR read from AppImage: ${appImage}`)
}

const testLinux = () => {
  assert(
    !requestedKind || ['deb', 'rpm', 'appimage'].includes(requestedKind),
    `Unknown Linux package kind: ${requestedKind}`
  )
  if (!requestedKind || requestedKind === 'deb') testDebian()
  if (!requestedKind || requestedKind === 'rpm') testRpm()
  if (!requestedKind || requestedKind === 'appimage') testAppImage()
}

const testWindows = () => {
  const msiDirectory = resolve('src-tauri/target/release/bundle/msi')
  const msi = currentPackage(msiDirectory, '.msi')
  const installDirectory = join(scratch, 'installed')
  run('msiexec.exe', ['/i', join(msiDirectory, msi), '/qn', `INSTALLDIR=${installDirectory}`])
  verifyRead(runtimeFrom(installDirectory, 'windows'))
  console.log(`PASS bundled OCR read from installed Windows MSI: ${msi}`)
}

const testMacos = () => {
  const dmgPath = files(resolve('src-tauri/target')).filter((file) => file.endsWith('.dmg') && file.includes(packageVersion)).sort().at(-1)
  assert(dmgPath, 'No macOS DMG found in the package output')
  const mount = join(scratch, 'mounted')
  run('hdiutil', ['attach', '-nobrowse', '-mountpoint', mount, dmgPath])
  try {
    verifyRead(runtimeFrom(mount, 'macos'))
  } finally {
    run('hdiutil', ['detach', mount])
  }
  console.log(`PASS bundled OCR read from mounted macOS DMG: ${basename(dmgPath)}`)
}

try {
  ensureCurrentPlatformPackage()
  if (process.platform === 'linux') testLinux()
  else if (process.platform === 'win32') testWindows()
  else if (process.platform === 'darwin') testMacos()
  else throw new Error(`No installed-package OCR test for ${process.platform}`)
  console.log('@claim:bundled-ocr-runtime PASS')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
