import { SIMULATION_NOTICE, SOURCE_GAPS, VIEW_COPY } from './model.js'

export function buildMarkdown(brief, view = 'security-lead') {
  const copy = VIEW_COPY[view] || VIEW_COPY['security-lead']
  const lines = [
    `# Secret Exposure Response Planner - ${copy.reportTitle}`,
    '',
    SIMULATION_NOTICE,
    '',
    '## Incident profile',
    '',
    `- Incident: ${brief.profile.incidentName}`,
    `- Alert source: ${brief.profile.alertSource}`,
    `- Secret type: ${brief.profile.secretType}`,
    `- Exposure surface: ${brief.profile.exposureSurface}`,
    `- Owning team: ${brief.profile.owningTeam}`,
    `- Alert age (hours): ${brief.profile.alertAgeHours || 'Not set'}`,
    `- Objective: ${objectiveLabel(brief.profile.objective)}`,
    `- Generated date: ${brief.generatedAt}`,
    '',
    '## Severity summary',
    '',
    `- Overall score: ${brief.score.overall}/100`,
    `- Severity score: ${brief.score.severity}/100`,
    `- Containment score: ${brief.score.containment}/100`,
    `- Owner clarity: ${brief.score.ownerClarity}/100`,
    `- Comms readiness: ${brief.score.comms}/100`,
    '',
    '## Incident questions',
    '',
    ...brief.prompts.map((prompt) => `- ${prompt.prompt}`),
    '',
    '## Containment matrix',
    '',
    '| Alert | Evidence | Owner | State | Status | Gap | Recommended action |',
    '|---|---|---|---|---|---|---|',
    ...brief.findings.map((finding) => `| ${finding.promptId} | ${finding.evidence || '—'} | ${finding.owner || '—'} | ${finding.exposureMode} | ${statusLabel(finding.status)} | ${gapLabel(finding.likelySourceGap)} | ${escapePipe(finding.recommendedAction)} |`),
    '',
    '## Response checks',
    '',
    ...brief.readiness.map((item) => `- ${item.label}: ${item.detail}`),
    '',
    '## Response checklist',
    '',
    ...brief.actions.map((action) => `- ${action.title} — ${action.why}`),
    '',
    '## Next iteration',
    '',
    'This deterministic simulation proves the incident-response graph. A future product would validate against live alert data before containment decisions.',
  ]

  return lines.join('\n')
}

export function copyMarkdown(markdown, forceFallback = false) {
  if (!forceFallback && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(markdown)
      .then(() => ({ ok: true }))
      .catch((error) => ({ ok: false, error, reason: error?.message || 'Clipboard write failed.' }))
  }

  return { ok: false, reason: forceFallback ? 'Clipboard fallback requested.' : 'Clipboard API unavailable.' }
}

export function downloadMarkdown(brief, markdown) {
  const fileName = `${slugify(brief.profile.incidentName || 'secret-response-report')}-incident-brief.md`
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return fileName
}

function objectiveLabel(objective) {
  if (objective === 'rotate-first') return 'Rotate first'
  if (objective === 'notify-comms') return 'Notify comms'
  return 'Contain fast'
}

function statusLabel(status) {
  return {
    critical: 'Contain now',
    watch: 'Needs owner',
    contained: 'Contained',
    clean: 'Already covered',
  }[status] || status
}

function gapLabel(gap) {
  return SOURCE_GAPS[gap] || gap || '—'
}

function escapePipe(value) {
  return String(value || '').replaceAll('|', '\\|')
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
