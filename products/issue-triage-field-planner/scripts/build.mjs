import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const productRoot = path.resolve(new URL('..', import.meta.url).pathname)
const showcaseRoot = path.resolve(productRoot, '..', '..')
const output = path.join(showcaseRoot, 'demos', 'issue-triage-field-planner')

fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })

for (const entry of ['index.html', 'styles.css', 'src']) {
  fs.cpSync(path.join(productRoot, entry), path.join(output, entry), { recursive: true })
}

const bundlePath = path.join(output, 'src', 'app.bundle.js')
execFileSync(
  'npx',
  [
    '--yes',
    'esbuild',
    path.join(productRoot, 'src', 'app.js'),
    '--bundle',
    '--format=iife',
    '--platform=browser',
    '--global-name=IssueTriageFieldPlanner',
    `--outfile=${bundlePath}`,
  ],
  { stdio: 'inherit' },
)

const indexPath = path.join(output, 'index.html')
const html = fs.readFileSync(indexPath, 'utf8').replace(
  '<script type="module" src="./src/app.js"></script>',
  '<script src="./src/app.bundle.js"></script>',
)
fs.writeFileSync(indexPath, html)

console.log(`Built Issue Triage Field Planner static demo into ${path.relative(showcaseRoot, output)}`)
