import { SIMULATION_DISCLAIMER, toMarkdown } from './model.mjs'

export function buildMarkdown(report) {
  return toMarkdown(report)
}

export async function copyMarkdown(markdown, forceFallback = false) {
  if (forceFallback || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return { ok: false, reason: 'clipboard-unavailable' }
  }

  try {
    await navigator.clipboard.writeText(markdown)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error?.message || 'clipboard-failed' }
  }
}

export function downloadMarkdown(report, markdown) {
  const slug = String(report.projectName || 'voice-turn-qa-lab').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const fileName = `${slug || 'voice-turn-qa-lab'}-acceptance-packet.md`
  const blob = new Blob([`${markdown}\n`], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return fileName
}

export { SIMULATION_DISCLAIMER }
