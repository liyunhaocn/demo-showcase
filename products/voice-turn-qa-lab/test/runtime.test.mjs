import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = path.join(root, 'index.html')
const cssPath = path.join(root, 'styles.css')
const appPath = path.join(root, 'src', 'app.js')

for (const file of [htmlPath, cssPath, appPath]) {
  assert.equal(fs.existsSync(file), true, `missing runtime file: ${path.relative(root, file)}`)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const app = fs.readFileSync(appPath, 'utf8')

for (const id of [
  'qa-form',
  'project-name',
  'use-case',
  'acceptance-profile',
  'expected-outcome',
  'disclosure-required',
  'transcript',
  'notice-row',
  'empty-state',
  'report-shell',
  'metric-grid',
  'timeline',
  'incident-list',
  'acceptance-list',
  'retest-list',
  'copy-button',
  'download-button',
  'save-button',
  'fallback-panel',
  'markdown-fallback',
  'restore-banner',
  'restore-button',
  'reset-button',
]) {
  assert.equal(html.includes(`id="${id}"`), true, `missing #${id}`)
}

assert.equal(html.includes('Deterministic demo simulation.'), true)
assert.equal(html.includes('type="module"'), true)
assert.equal(/https?:\/\//.test(html), false)
assert.equal(/@import|https?:\/\//.test(css), false)
assert.equal(app.includes("params.get('copy') === 'fallback'"), true)
assert.equal(app.includes("params.get('storage') === 'off'"), true)
assert.equal(fs.readFileSync(path.join(root, 'src', 'storage.mjs'), 'utf8').includes('localStorage'), true)

console.log('voice turn runtime contract passed')
