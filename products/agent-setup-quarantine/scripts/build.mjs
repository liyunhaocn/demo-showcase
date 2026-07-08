import fs from 'node:fs'
import path from 'node:path'

const productRoot = path.resolve(new URL('..', import.meta.url).pathname)
const showcaseRoot = path.resolve(productRoot, '..', '..')
const output = path.join(showcaseRoot, 'demos', 'agent-setup-quarantine')

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(path.join(output, 'src'), { recursive: true })

for (const entry of ['index.html', 'styles.css']) {
  fs.copyFileSync(path.join(productRoot, entry), path.join(output, entry))
}

for (const entry of ['app.js', 'export.js', 'presets.js', 'scoring.js']) {
  fs.copyFileSync(path.join(productRoot, 'src', entry), path.join(output, 'src', entry))
}

console.log(`Built Agent Setup Quarantine static demo into ${path.relative(showcaseRoot, output)}`)
