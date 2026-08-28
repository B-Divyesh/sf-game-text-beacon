import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const executable = fileURLToPath(new URL('../node_modules/.bin/tauri', import.meta.url))
const args = process.argv.slice(2)
if (args[0] === 'build' || args[0] === 'dev') args.push('--features', 'desktop')
const environment = { ...process.env }
if (environment.CI === '1') environment.CI = 'true'
const result = spawnSync(executable, args, { stdio: 'inherit', env: environment, shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
