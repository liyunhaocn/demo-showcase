import { INTENT_GROUPS, SIMULATION_NOTICE, SOURCE_GAPS, VIEW_COPY } from './model.js'

export function buildMarkdown(brief, view = 'founder') {
  const copy = VIEW_COPY[view] || VIEW_COPY.founder
  const lines = [
    `# Issue Triage Field Planner - ${copy.reportTitle}`,
    '',
    SIMULATION_NOTICE,
    '',
    '## Queue profile',
    '',
    `- Queue: ${brief.profile.appName}`,
    `- Source: ${brief.profile.provider}`,
    `- Triage goal: ${brief.profile.currentModel}`,
    `- Repo / queue: ${brief.profile.workload}`,
    `- Owning team: ${brief.profile.region}`,
    `- Issue count: ${brief.profile.monthlyRequests || 'Not set'}`,
    `- Objective: ${objectiveLabel(brief.profile.objective)}`,
    `- Generated date: ${brief.generatedAt}`,
    '',
    '## Triage summary',
    '',
    `- Overall score: ${brief.score.overall}/100`,
    `- Duplicate coverage: ${brief.score.impactSplit}/100`,
    `- Owner clarity: ${brief.score.ownerClarity}/100`,
    `- Action clarity: ${brief.score.actionClarity}/100`,
    `- Safety: ${brief.score.safety}/100`,
    '',
    '## Triage questions',
    '',
    ...brief.prompts.map((prompt) => `- ${prompt.prompt}`),
    '',
    '## Issue matrix',
    '',
    '| Issue | Dependency | Owner | Mode | Status | Gap | Recommended action |',
    '|---|---|---|---|---|---|---|',
    ...brief.findings.map((finding) => `| ${finding.promptId} | ${finding.dependency || '—'} | ${finding.owner || '—'} | ${finding.triageMode} | ${statusLabel(finding.status)} | ${gapLabel(finding.likelySourceGap)} | ${escapePipe(finding.recommendedAction)} |`),
    '',
    '## Readiness checks',
    '',
    ...brief.readiness.map((item) => `- ${item.label}: ${item.detail}`),
    '',
    '## Execution checklist',
    '',
    ...brief.actions.map((action) => `- ${action.title} — ${action.why}`),
    '',
    '## Next iteration',
    '',
    'This deterministic simulation proves the triage graph. A future product would validate against live GitHub issue data before automation decisions.',
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
  const fileName = `${slugify(brief.profile.appName || 'triage-plan')}-issue-brief.md`
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
  if (objective === 'release-readiness') return 'Release readiness'
  if (objective === 'field-coverage') return 'Field coverage'
  return 'Reduce duplicate load'
}

function statusLabel(status) {
  return {
    critical: 'Duplicate cluster',
    watch: 'Needs owner',
    opportunity: 'Ready to route',
    'no-action': 'Already covered',
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
