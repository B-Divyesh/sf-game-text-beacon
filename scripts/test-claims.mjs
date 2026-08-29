import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8'))
assert(Array.isArray(claims) && claims.length > 0, '.factory/claims.json must contain claims')

for (const claim of claims) {
  assert.match(claim.id, /^[a-z0-9-]+$/, `Invalid claim id: ${claim.id}`)
  assert.equal(typeof claim.test, 'string', `Claim ${claim.id} has no exact test command`)
  console.log(`\n=== @claim:${claim.id} ===`)
  const result = spawnSync('sh', ['-c', claim.test], { cwd: new URL('..', import.meta.url), stdio: 'inherit' })
  assert.equal(result.status, 0, `@claim:${claim.id} failed: ${claim.test}`)
}

console.log(`\nPASS ${claims.length}/${claims.length} exact claim commands`)
