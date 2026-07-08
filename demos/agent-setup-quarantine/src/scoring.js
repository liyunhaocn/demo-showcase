const COMMAND_LIMIT = 8

const RISK_RULES = [
  {
    id: 'dns-payload',
    severity: 'critical',
    label: 'DNS TXT payload fetch',
    patterns: [/\bdig\b.*\bTXT\b/i, /\bnslookup\b.*\bTXT\b/i, /\bdns\b/i],
    action: 'Block DNS TXT payload retrieval and require a pinned setup artifact.',
  },
  {
    id: 'remote-shell',
    severity: 'critical',
    label: 'Remote shell pipeline',
    patterns: [/\bcurl\b.*\|\s*(bash|sh)\b/i, /\bwget\b.*\|\s*(bash|sh)\b/i, /\bbash\s+-c\b/i],
    action: 'Block remote shell pipelines until the fetched payload is pinned and reviewed.',
  },
  {
    id: 'secret-exposure',
    severity: 'high',
    label: 'Environment or token exposure',
    patterns: [/\benv\b/i, /printenv/i, /process\.env/i, /\b[A-Z0-9_]*(TOKEN|SECRET|KEY)\b/i],
    action: 'Run with a scrubbed environment and deny secret-bearing variables.',
  },
  {
    id: 'postinstall-script',
    severity: 'high',
    label: 'Lifecycle setup script',
    patterns: [/postinstall/i, /preinstall/i, /\bprepare\b/i],
    action: 'Route lifecycle scripts through manual review before the agent continues.',
  },
  {
    id: 'network-download',
    severity: 'medium',
    label: 'Network download',
    patterns: [/\bcurl\b/i, /\bwget\b/i, /\bfetch\b/i, /https?:\/\//i],
    action: 'Allow only in a sandbox with egress logging and artifact pinning.',
  },
  {
    id: 'filesystem-write',
    severity: 'medium',
    label: 'Filesystem mutation',
    patterns: [/\brm\s+-rf\b/i, /\bchmod\b/i, /\bchown\b/i, />\s*\//i],
    action: 'Require an explicit path allowlist before filesystem mutation.',
  },
]

const SEVERITY_WEIGHT = {
  critical: 32,
  high: 9,
  medium: 6,
  low: 4,
}

export function normalizeCommandRows(rows) {
  return rows
    .slice(0, COMMAND_LIMIT)
    .map((row, index) => {
      if (typeof row === 'string') {
        const parts = row.split('|').map((part) => part.trim())
        const shellPipeline = /^(bash|sh|zsh|fish)$/i.test(parts[1] || '')
        if (shellPipeline) {
          return {
            id: `cmd-${index + 1}`,
            command: [parts[0], parts[1]].join(' | '),
            source: parts[2] || 'setup',
            owner: parts.length >= 5 ? parts[3] || 'none' : 'none',
            note: parts.length >= 5 ? parts[4] || '' : parts[3] || '',
          }
        }

        const hasStructuredTail = parts.length >= 4
        return {
          id: `cmd-${index + 1}`,
          command: hasStructuredTail ? parts.slice(0, -3).join(' | ') : parts[0] || '',
          source: hasStructuredTail ? parts.at(-3) || 'setup' : parts[1] || 'setup',
          owner: hasStructuredTail ? parts.at(-2) || 'none' : parts[2] || 'none',
          note: hasStructuredTail ? parts.at(-1) || '' : parts[3] || '',
        }
      }

      return {
        id: row.id || `cmd-${index + 1}`,
        command: String(row.command || '').trim(),
        source: String(row.source || 'setup').trim(),
        owner: String(row.owner || 'none').trim(),
        note: String(row.note || '').trim(),
      }
    })
    .filter((row) => row.command)
}

export function analyzeSetupTrace(commands) {
  const rows = normalizeCommandRows(commands)
  const findings = rows.flatMap((row) => commandFindings(row))
  const penalty = findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0)
  const missingOwners = rows.filter((row) => row.owner.toLowerCase() === 'none').length
  const score = clamp(100 - penalty - missingOwners, 0, 100)
  const criticalCount = findings.filter((finding) => finding.severity === 'critical').length
  const highCount = findings.filter((finding) => finding.severity === 'high').length
  const overallRisk = criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : findings.length ? 'watch' : 'ready'

  return {
    score,
    overallRisk,
    findings,
    gates: buildGates({ findings, rows, overallRisk }),
    metrics: {
      commands: rows.length,
      criticalCount,
      highCount,
      missingOwners,
      ownerCoverage: rows.length ? Math.round(((rows.length - missingOwners) / rows.length) * 100) : 100,
    },
  }
}

export function buildQuarantineBrief(profile) {
  const commands = normalizeCommandRows(profile.commands || [])
  const trace = analyzeSetupTrace(commands)
  const topAction = topActionFor(trace)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: {
      workspaceName: profile.workspaceName?.trim() || 'Agent setup lane',
      agentRuntime: profile.agentRuntime?.trim() || 'AI coding agent',
      owner: profile.owner?.trim() || 'Unassigned',
      objective: profile.objective || 'prevent-runtime-payload',
      commands,
    },
    summary: {
      topAction,
      posture: postureFor(trace.overallRisk),
      operatorFocus: operatorFocusFor(trace),
    },
    trace,
    actions: buildActions(trace, topAction),
  }
}

function commandFindings(row) {
  const haystack = `${row.command} ${row.source} ${row.note}`
  const seen = new Set()

  return RISK_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(haystack)))
    .filter((rule) => {
      if (seen.has(rule.id)) return false
      seen.add(rule.id)
      return true
    })
    .map((rule) => ({
      id: `${row.id}-${rule.id}`,
      commandId: row.id,
      command: row.command,
      source: row.source,
      owner: row.owner,
      ruleId: rule.id,
      label: rule.label,
      severity: rule.severity,
      recommendedAction: rule.action,
    }))
}

function buildGates({ findings, rows, overallRisk }) {
  const hasCritical = findings.some((finding) => finding.severity === 'critical')
  const hasSecrets = findings.some((finding) => finding.ruleId === 'secret-exposure')
  const hasMissingOwners = rows.some((row) => row.owner.toLowerCase() === 'none')

  return [
    {
      state: hasCritical ? 'blocked' : overallRisk === 'ready' ? 'ready' : 'manual-review',
      label: 'Pre-execution command gate',
      detail: hasCritical
        ? 'Hold the setup run before the coding agent executes remote payload or DNS-derived commands.'
        : 'Setup can proceed only after the listed watch items are accepted by the owner.',
    },
    {
      state: hasMissingOwners ? 'manual-review' : 'ready',
      label: 'Human owner gate',
      detail: hasMissingOwners
        ? 'At least one command has no accountable owner; assign an approver before agent execution.'
        : 'Each setup command has an accountable owner.',
    },
    {
      state: hasSecrets || hasCritical ? 'sandbox-only' : 'ready',
      label: 'Sandbox and egress gate',
      detail: hasSecrets || hasCritical
        ? 'Run only in a sandbox with scrubbed environment variables and recorded egress.'
        : 'No secret exposure or remote payload pattern was detected in the provided trace.',
    },
  ]
}

function buildActions(trace, topAction) {
  const actions = [
    {
      title: 'Freeze setup execution before the agent continues',
      why: topAction,
      impact: 5,
      effort: 2,
    },
    {
      title: 'Pin and diff every fetched setup artifact',
      why: 'Replace live network payloads with reviewed, checksum-pinned files before rerunning the agent.',
      impact: 5,
      effort: 3,
    },
    {
      title: 'Run the replay with secrets removed',
      why: trace.metrics.highCount > 0
        ? 'The trace contains secret or lifecycle-script exposure risk that should not inherit developer credentials.'
        : 'A scrubbed replay keeps clean traces safe and repeatable.',
      impact: 4,
      effort: 2,
    },
  ]

  if (trace.metrics.missingOwners > 0) {
    actions.push({
      title: 'Assign an accountable setup approver',
      why: `${trace.metrics.missingOwners} command row(s) have no explicit owner.`,
      impact: 3,
      effort: 1,
    })
  }

  return actions
}

function topActionFor(trace) {
  const remoteShell = trace.findings.find((finding) => finding.ruleId === 'remote-shell')
  if (remoteShell) return remoteShell.recommendedAction

  const dns = trace.findings.find((finding) => finding.ruleId === 'dns-payload')
  if (dns) return dns.recommendedAction

  const high = trace.findings.find((finding) => finding.severity === 'high')
  if (high) return high.recommendedAction

  return 'Allow setup only after a recorded dry-run confirms no new command risk appears.'
}

function postureFor(risk) {
  if (risk === 'critical') return 'Quarantine required'
  if (risk === 'high') return 'Manual review required'
  if (risk === 'watch') return 'Sandbox review recommended'
  return 'Ready with audit log'
}

function operatorFocusFor(trace) {
  if (trace.overallRisk === 'critical') return 'Stop agent execution, preserve the trace, and replace live payloads with reviewed artifacts.'
  if (trace.overallRisk === 'high') return 'Approve lifecycle scripts and secret handling before granting agent execution.'
  return 'Keep the setup run logged and compare future command drift against this baseline.'
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
