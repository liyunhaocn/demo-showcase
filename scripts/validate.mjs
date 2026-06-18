import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const dataPath = path.join(root, 'data', 'demos.json')
const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

const requiredStringFields = ['id', 'name', 'date', 'status', 'tagline', 'audience', 'problem', 'cover']
const requiredArrayFields = ['tags', 'monetization', 'validation', 'stack']
const validStatuses = new Set(['validated', 'prototype', 'queued'])
const ids = new Set()

if (!Array.isArray(payload.demos)) {
  throw new Error('data/demos.json must contain a demos array')
}

for (const demo of payload.demos) {
  for (const field of requiredStringFields) {
    if (typeof demo[field] !== 'string' || demo[field].trim() === '') {
      throw new Error(`${demo.id ?? 'unknown'} missing string field: ${field}`)
    }
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(demo[field]) || demo[field].length === 0) {
      throw new Error(`${demo.id} missing non-empty array field: ${field}`)
    }
  }

  if (ids.has(demo.id)) throw new Error(`duplicate demo id: ${demo.id}`)
  ids.add(demo.id)

  if (!validStatuses.has(demo.status)) {
    throw new Error(`${demo.id} has invalid status: ${demo.status}`)
  }

  if (!Number.isInteger(demo.score) || demo.score < 0 || demo.score > 100) {
    throw new Error(`${demo.id} score must be an integer between 0 and 100`)
  }

  const coverPath = path.resolve(root, demo.cover)
  if (!fs.existsSync(coverPath)) {
    throw new Error(`${demo.id} cover asset not found: ${demo.cover}`)
  }
}

console.log(`Validated ${payload.demos.length} demos`)
