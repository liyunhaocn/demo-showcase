import fs from 'node:fs'
import path from 'node:path'

const productRoot = path.resolve(new URL('..', import.meta.url).pathname)
const showcaseRoot = path.resolve(productRoot, '..', '..')
const output = path.join(showcaseRoot, 'demos', 'workspace-agent-route-planner')

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })

for (const entry of ['index.html', 'styles.css', 'src']) {
  fs.cpSync(path.join(productRoot, entry), path.join(output, entry), { recursive: true })
}

console.log(`Built Workspace Agent Route Planner static demo into ${path.relative(showcaseRoot, output)}`)
