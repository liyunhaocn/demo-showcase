import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const dist = path.join(root, 'dist')
const entries = ['index.html', 'styles.css', 'app.js', 'data', 'assets', 'demos', 'docs']

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist, { recursive: true })

for (const entry of entries) {
  const from = path.join(root, entry)
  if (!fs.existsSync(from)) continue
  const to = path.join(dist, entry)
  fs.cpSync(from, to, { recursive: true })
}

console.log(`Built static site into ${path.relative(root, dist)}`)
