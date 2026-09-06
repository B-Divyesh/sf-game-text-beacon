import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const output = process.argv[2]
assert(output, 'Pass the built 404 HTML file to version')

const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
const tauriVersion = JSON.parse(readFileSync(resolve('src-tauri/tauri.conf.json'), 'utf8')).version
const cargoVersion = readFileSync(resolve('src-tauri/Cargo.toml'), 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1]
const placeholder = '__GAME_TEXT_BEACON_VERSION__'
const outputPath = resolve(output)
const html = readFileSync(outputPath, 'utf8')
const replacements = html.split(placeholder).length - 1

assert.equal(tauriVersion, version, 'The desktop application and site must have the same version')
assert.equal(cargoVersion, version, 'The desktop crate and site must have the same version')
assert.equal(replacements, 1, `Expected one site-version placeholder in ${outputPath}, found ${replacements}`)
writeFileSync(outputPath, html.replace(placeholder, version))
console.log(`Set the built 404 footer to v${version}.`)
