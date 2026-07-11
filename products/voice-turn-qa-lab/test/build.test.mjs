import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildScript = path.join(root, 'scripts', 'build.mjs')
const demoRoot = path.join(root, '..', '..', 'demos', 'voice-turn-qa-lab')

assert.equal(fs.existsSync(buildScript), true, 'missing build script')

const expectedFiles = [
  'index.html',
  'styles.css',
  path.join('src', 'app.js'),
  path.join('src', 'model.mjs'),
  path.join('src', 'presets.mjs'),
  path.join('src', 'export.mjs'),
  path.join('src', 'storage.mjs'),
]

for (const file of expectedFiles) {
  assert.equal(fs.existsSync(path.join(demoRoot, file)), true, `missing built file: ${file}`)
}

console.log('voice turn build contract passed')
