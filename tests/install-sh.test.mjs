// @vitest-environment node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

test('@claim:linux-installer verifies the Debian asset before asking apt to install it', () => {
  const root = mkdtempSync(join(tmpdir(), 'game-text-beacon-install-'))
  const bin = join(root, 'bin'); mkdirSync(bin)
  const asset = 'Game Text Beacon_0.1.2_amd64.deb'
  const bytes = 'desktop-package'
  const release = JSON.stringify({ assets: [{ name: asset, browser_download_url: 'https://example.test/beacon.deb' }, { name: 'SHA256SUMS', browser_download_url: 'https://example.test/SHA256SUMS' }] })
  const checksum = `${createHash('sha256').update(bytes).digest('hex')}  ${asset}\n`
  const curl = join(bin, 'curl')
  writeFileSync(curl, ['#!/bin/sh', 'set -eu', "out=''", "url=''", 'while [ "$#" -gt 0 ]; do', '  if [ "$1" = "-o" ]; then out="$2"; shift 2; continue; fi', '  url="$1"; shift', 'done', 'case "$url" in', '  *releases/latest) printf "%s" "$FAKE_RELEASE" ;;', '  *.deb) printf "%s" "$FAKE_DEB" > "$out" ;;', '  *SHA256SUMS) printf "%s" "$FAKE_SUM" > "$out" ;;', '  *) exit 9 ;;', 'esac'].join('\n'))
  chmodSync(curl, 0o755)
  const sudo = join(bin, 'sudo')
  writeFileSync(sudo, ['#!/bin/sh', 'printf "%s" "$*" > "$INSTALL_LOG"'].join('\n'))
  chmodSync(sudo, 0o755)
  const log = join(root, 'install.log')
  const output = execFileSync('sh', ['public/install.sh'], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: join(root, 'home'), FAKE_RELEASE: release, FAKE_DEB: bytes, FAKE_SUM: checksum, INSTALL_LOG: log } })
  expect(readFileSync(log, 'utf8')).toContain(`apt-get install -y `)
  expect(readFileSync(log, 'utf8')).toContain('.deb')
  expect(output).toContain('Verified and installed')
  rmSync(root, { recursive: true, force: true })
})
