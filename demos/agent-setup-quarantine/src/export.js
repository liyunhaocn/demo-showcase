export function buildMarkdown(brief, view) {
  const ownerLine = view === 'security'
    ? `Security owner: ${brief.profile.owner}`
    : `Workspace owner: ${brief.profile.owner}`

  const findings = brief.trace.findings.length
    ? brief.trace.findings.map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.label}: \`${finding.command}\` -> ${finding.recommendedAction}`).join('\n')
    : '- No risky setup commands were detected in the submitted trace.'

  const gates = brief.trace.gates.map((gate) => `- ${gate.label}: ${gate.state} - ${gate.detail}`).join('\n')
  const actions = brief.actions.map((action) => `- P${6 - action.impact}: ${action.title} (${action.why})`).join('\n')

  return `# Agent Setup Quarantine Brief

Generated: ${new Date(brief.generatedAt).toISOString()}
Workspace: ${brief.profile.workspaceName}
Runtime: ${brief.profile.agentRuntime}
${ownerLine}
Posture: ${brief.summary.posture}
Score: ${brief.trace.score}/100

## Top Action
${brief.summary.topAction}

## Findings
${findings}

## Gates
${gates}

## Operator Actions
${actions}

## Simulation Boundary
This static demo uses deterministic command-pattern scoring only. A production version would inspect real sandbox logs, network egress records, package metadata, and policy controls before allowing an AI coding agent to continue.
`
}

export async function copyMarkdown(markdown, forceFallback = false) {
  if (forceFallback || !navigator.clipboard?.writeText) {
    return { ok: false, reason: 'Clipboard API unavailable or fallback mode requested.' }
  }

  try {
    await navigator.clipboard.writeText(markdown)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Clipboard write failed.' }
  }
}

export function downloadMarkdown(brief, markdown) {
  const slug = brief.profile.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent-setup-quarantine'
  const fileName = `${slug}-quarantine-brief.md`
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return fileName
}
