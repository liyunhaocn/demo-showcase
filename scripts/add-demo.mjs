import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const dataPath = path.join(root, 'data', 'demos.json')
const args = parseArgs(process.argv.slice(2))

const required = ['name', 'tagline', 'audience', 'problem', 'demo', 'repo', 'cover']
const missing = required.filter((key) => !args[key])
if (missing.length) {
  console.error(`Missing required args: ${missing.join(', ')}`)
  console.error('Example: npm run add-demo -- --name "Demo" --tagline "..." --audience "..." --problem "..." --demo "https://..." --repo "https://..." --cover "./assets/demo.png"')
  process.exit(1)
}

const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const date = args.date ?? new Date().toISOString().slice(0, 10)
const id = args.id ?? `${slugify(args.name)}-${date}`

if (payload.demos.some((demo) => demo.id === id)) {
  console.error(`Demo id already exists: ${id}`)
  process.exit(1)
}

payload.demos.unshift({
  id,
  name: args.name,
  date,
  status: args.status ?? 'prototype',
  score: Number(args.score ?? 70),
  tagline: args.tagline,
  audience: args.audience,
  problem: args.problem,
  tags: splitList(args.tags ?? 'AI,Demo'),
  monetization: splitList(args.monetization ?? '订阅收费,按使用量收费'),
  validation: splitList(args.validation ?? '可运行原型已创建'),
  stack: splitList(args.stack ?? 'Static,Frontend'),
  cover: args.cover,
  links: {
    demo: args.demo,
    repo: args.repo,
  },
})

fs.writeFileSync(dataPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Added ${id}`)

function parseArgs(values) {
  const result = {}
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = values[index + 1]
    if (!next || next.startsWith('--')) {
      result[key] = 'true'
    } else {
      result[key] = next
      index += 1
    }
  }
  return result
}

function splitList(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
