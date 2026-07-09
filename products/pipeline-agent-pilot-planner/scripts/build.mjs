import fs from 'node:fs'
import path from 'node:path'

const productRoot = path.resolve(new URL('..', import.meta.url).pathname)
const showcaseRoot = path.resolve(productRoot, '..', '..')
const output = path.join(showcaseRoot, 'demos', 'pipeline-agent-pilot-planner')

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(path.join(output, 'src'), { recursive: true })

for (const entry of ['index.html', 'styles.css']) {
  fs.copyFileSync(path.join(productRoot, entry), path.join(output, entry))
}

for (const entry of ['app.js', 'model.mjs']) {
  fs.copyFileSync(path.join(productRoot, 'src', entry), path.join(output, 'src', entry))
}

console.log(`Built Pipeline Agent Pilot Planner static demo into ${path.relative(showcaseRoot, output)}`)
