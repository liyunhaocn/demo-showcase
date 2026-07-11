export const SIMULATION_DISCLAIMER =
  'Deterministic demo simulation. No live call, audio, model, provider, or customer data.'

export const PROFILES = Object.freeze({
  pilot: { label: 'Pilot', responseGapMs: 1400, talkOverMs: 450, yieldMs: 650 },
  production: { label: 'Production', responseGapMs: 900, talkOverMs: 300, yieldMs: 450 },
  strict: { label: 'Strict', responseGapMs: 750, talkOverMs: 200, yieldMs: 350 },
})

export const USE_CASES = Object.freeze(['billing-support', 'appointment-change', 'service-outage'])
export const OUTCOMES = Object.freeze(['resolved', 'scheduled', 'human-handoff'])
export const SPEAKERS = Object.freeze({
  caller: 'Caller',
  agent: 'Agent',
  human: 'Human',
  system: 'System',
})

const TURN_LIMIT = 200
const TRANSCRIPT_LIMIT_BYTES = 64 * 1024
const LINE_LIMIT = 80
const NON_EMPTY_LINE_LIMIT = 4

const TRANSCRIPT_PATTERN = /^(\d{2}):(\d{2})\.(\d{3})-(\d{2}):(\d{2})\.(\d{3})\s*\|\s*(CALLER|USER|AGENT|HUMAN|SYSTEM)\s*\|\s*(.*)$/

const REPAIR_PATTERN = /\b(no|actually|wait|not that|i said|that's not)\b/i
const ACK_PATTERN = /\b(got it|understand|sorry|thanks for correcting|let me correct|you're right|roger|will do|i can correct)\b/i

const OUTCOME_PATTERNS = {
  resolved: [
    /\b(resolved|fixed|completed|closed|taken care of|issue is resolved|refund is confirmed)\b/i,
  ],
  scheduled: [
    /\b(scheduled|rescheduled|booked|confirmed for|appointment is scheduled|set for)\b/i,
  ],
  'human-handoff': [
    /\b(transfer(?:ring)?|handoff|escalat(?:e|ing)|specialist|human agent|human representative|live agent)\b/i,
  ],
}

const ISSUE_SEVERITY = {
  'missing-handoff': 'critical',
  'talk-over': 'high',
  'slow-yield': 'high',
  'missing-outcome': 'high',
  'dead-air': 'medium',
  'missed-repair': 'medium',
  'missing-disclosure': 'medium',
}

const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function parseTranscript(text) {
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')

  const turns = []
  const errors = []
  let previousStartMs = -1

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1
    const line = rawLine.trim()
    if (!line) return

    if (turns.length >= TURN_LIMIT) {
      errors.push({ line: lineNo, message: `transcript exceeds ${TURN_LIMIT} turns` })
      return
    }

    const match = line.match(TRANSCRIPT_PATTERN)
    if (!match) {
      errors.push({
        line: lineNo,
        message: 'expected MM:SS.mmm-MM:SS.mmm | CALLER|AGENT|HUMAN|SYSTEM | text',
      })
      return
    }

    const startMs = timeToMs(match[1], match[2], match[3])
    const endMs = timeToMs(match[4], match[5], match[6])
    const speaker = normalizeSpeaker(match[7])
    const textValue = match[8].trim()

    if (!textValue) {
      errors.push({ line: lineNo, message: 'turn text cannot be empty' })
      return
    }

    if (!speaker) {
      errors.push({ line: lineNo, message: 'unsupported speaker' })
      return
    }

    if (endMs <= startMs) {
      errors.push({ line: lineNo, message: 'turn end must be after start' })
      return
    }

    if (previousStartMs !== -1 && startMs < previousStartMs) {
      errors.push({ line: lineNo, message: 'turn start times must be non-decreasing' })
      return
    }

    previousStartMs = startMs
    turns.push({
      id: `turn-${turns.length + 1}`,
      lineNo,
      speaker,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      text: textValue,
    })
  })

  return errors.length ? { ok: false, errors, turns: [] } : { ok: true, errors: [], turns }
}

export function validateAnalysisInput(input) {
  const normalized = normalizeInput(input)
  const rawDisclosureRequired = input?.disclosureRequired
  const errors = {
    projectName: [],
    useCase: [],
    profile: [],
    expectedOutcome: [],
    disclosureRequired: [],
    transcript: [],
  }

  if (normalized.projectName.length < 2 || normalized.projectName.length > 80) {
    errors.projectName.push('project name must be 2-80 trimmed characters')
  }

  if (!USE_CASES.includes(normalized.useCase)) {
    errors.useCase.push(`use case must be one of: ${USE_CASES.join(', ')}`)
  }

  if (!Object.hasOwn(PROFILES, normalized.profile)) {
    errors.profile.push(`profile must be one of: ${Object.keys(PROFILES).join(', ')}`)
  }

  if (!OUTCOMES.includes(normalized.expectedOutcome)) {
    errors.expectedOutcome.push(`expected outcome must be one of: ${OUTCOMES.join(', ')}`)
  }

  if (typeof rawDisclosureRequired !== 'boolean') {
    errors.disclosureRequired.push('disclosureRequired must be a boolean')
  }

  if (normalized.transcript.length === 0) {
    errors.transcript.push('transcript is required')
  } else {
    if (byteLength(normalized.transcript) > TRANSCRIPT_LIMIT_BYTES) {
      errors.transcript.push(`transcript must be at most ${TRANSCRIPT_LIMIT_BYTES} bytes`)
    }

    const turnCount = normalized.transcript
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
    if (turnCount < NON_EMPTY_LINE_LIMIT || turnCount > LINE_LIMIT) {
      errors.transcript.push(`transcript must contain ${NON_EMPTY_LINE_LIMIT}-${LINE_LIMIT} non-empty turns`)
    }

    const parsed = parseTranscript(normalized.transcript)
    if (!parsed.ok) {
      errors.transcript.push(...parsed.errors.map((error) => `line ${error.line}: ${error.message}`))
    }
  }

  const ok = Object.values(errors).every((items) => items.length === 0)
  return ok ? { ok: true, errors: {}, value: normalized } : { ok: false, errors, value: normalized }
}

export function analyzeTranscript(input) {
  const validation = validateAnalysisInput(input)
  if (!validation.ok) {
    const message = Object.entries(validation.errors)
      .flatMap(([field, items]) => items.map((item) => `${field}: ${item}`))
      .join('; ')
    throw new Error(`invalid analysis input: ${message}`)
  }

  const parsed = parseTranscript(validation.value.transcript)
  if (!parsed.ok) {
    throw new Error('transcript failed validation unexpectedly')
  }

  const turns = canonicalizeTurns(parsed.turns)
  const profile = PROFILES[validation.value.profile]
  const metrics = buildMetrics(turns, profile, validation.value)
  const issues = buildIssues(turns, profile, validation.value)
  const acceptanceChecks = buildAcceptanceChecks(turns, profile, validation.value, issues)
  const retestChecklist = buildRetestChecklist(issues)
  const verdict = deriveVerdict(issues, acceptanceChecks)
  const normalized = canonicalizeInput({ ...validation.value, turns })
  const analysisId = `vtqa-${stableHash(JSON.stringify(normalized)).toString(16).padStart(8, '0')}`

  return {
    schemaVersion: 1,
    analysisId,
    input: validation.value,
    profile: validation.value.profile,
    profileLabel: profile.label,
    projectName: validation.value.projectName,
    useCase: validation.value.useCase,
    expectedOutcome: validation.value.expectedOutcome,
    disclosureRequired: validation.value.disclosureRequired,
    turns,
    metrics,
    issues,
    acceptanceChecks,
    retestChecklist,
    verdict,
    summary: buildSummary({
      turns,
      profile,
      issues,
      verdict,
      validation: validation.value,
      metrics,
    }),
  }
}

export function toMarkdown(analysis) {
  const lines = []
  lines.push('# Voice Turn QA Lab')
  lines.push(`- Project: ${analysis.projectName}`)
  lines.push(`- Profile: ${analysis.profileLabel}`)
  lines.push(`- Use case: ${analysis.useCase}`)
  lines.push(`- Expected outcome: ${analysis.expectedOutcome}`)
  lines.push(`- Verdict: ${analysis.verdict}`)
  lines.push(`- Analysis ID: ${analysis.analysisId}`)
  lines.push('')
  lines.push('## Boundary')
  lines.push(SIMULATION_DISCLAIMER)
  lines.push('')
  lines.push('## Metrics')
  lines.push('| Metric | Value | Threshold | Status | Evidence |')
  lines.push('| --- | ---: | ---: | --- | --- |')
  for (const metric of analysis.metrics) {
    lines.push(
      `| ${escapeMarkdownCell(metric.label)} | ${metric.value} ${metric.unit} | ${metric.threshold} ${metric.unit} | ${metric.status} | ${metric.evidenceTurnIds.join(', ')} |`,
    )
  }
  lines.push('')
  lines.push('## Issues')
  if (analysis.issues.length === 0) {
    lines.push('None.')
  } else {
    for (const issue of analysis.issues) {
      lines.push(
        `- **${issue.type}** (${issue.severity}) on ${issue.turnIds.join(', ')}: ${issue.message}`,
      )
    }
  }
  lines.push('')
  lines.push('## Acceptance checks')
  for (const check of analysis.acceptanceChecks) {
    lines.push(`- ${check.status === 'pass' ? 'Pass' : 'Fail'}: ${check.label}`)
  }
  lines.push('')
  lines.push('## Retest checklist')
  for (const step of analysis.retestChecklist) {
    lines.push(`- ${step}`)
  }
  lines.push('')
  lines.push('## Transcript evidence')
  for (const turn of analysis.turns) {
    lines.push(
      `- ${formatMs(turn.startMs)}-${formatMs(turn.endMs)} ${turn.speaker.toUpperCase()}: ${turn.text}`,
    )
  }
  lines.push('')
  lines.push(SIMULATION_DISCLAIMER)
  return lines.join('\n')
}

function buildMetrics(turns, profile, input) {
  const pairs = buildPairs(turns)
  const responseGaps = []
  const talkOvers = []
  const yieldDelays = []
  let maxOverlapMs = 0

  for (const pair of pairs) {
    const overlapMs = overlapDuration(pair.prev, pair.next)
    if (overlapMs > 0) {
      maxOverlapMs = Math.max(maxOverlapMs, overlapMs)
    }

    const gapMs = pair.next.startMs - pair.prev.endMs
    if (pair.prev.speaker === 'caller' && (pair.next.speaker === 'agent' || pair.next.speaker === 'human')) {
      responseGaps.push({
        value: Math.max(gapMs, 0),
        turnIds: [pair.prev.id, pair.next.id],
      })
    }

    if (pair.prev.speaker === 'caller' && (pair.next.speaker === 'agent' || pair.next.speaker === 'human')) {
      if (overlapMs > 0) {
        talkOvers.push({
          value: overlapMs,
          turnIds: [pair.prev.id, pair.next.id],
        })
      }
    }

    if ((pair.prev.speaker === 'agent' || pair.prev.speaker === 'human') && pair.next.speaker === 'caller') {
      if (overlapMs > 0) {
        yieldDelays.push({
          value: overlapMs,
          turnIds: [pair.prev.id, pair.next.id],
        })
      }
    }
  }

  const maxResponseGapMs = responseGaps.reduce((max, item) => Math.max(max, item.value), 0)
  const maxTalkOverMs = talkOvers.reduce((max, item) => Math.max(max, item.value), 0)
  const maxYieldMs = yieldDelays.reduce((max, item) => Math.max(max, item.value), 0)
  const overlapPairs = pairs
    .filter((pair) => overlapDuration(pair.prev, pair.next) > 0)
    .map((pair) => ({
      value: overlapDuration(pair.prev, pair.next),
      turnIds: [pair.prev.id, pair.next.id],
    }))

  return [
    buildMetric('response-gap', 'Longest caller-to-agent gap', maxResponseGapMs, profile.responseGapMs, 'ms', maxResponseGapMs <= profile.responseGapMs ? 'pass' : 'review', responseGaps),
    buildMetric('talk-over', 'Longest talk-over', maxTalkOverMs, profile.talkOverMs, 'ms', maxTalkOverMs <= profile.talkOverMs ? 'pass' : 'fail', talkOvers),
    buildMetric('yield-delay', 'Longest caller interruption yield', maxYieldMs, profile.yieldMs, 'ms', maxYieldMs <= profile.yieldMs ? 'pass' : 'fail', yieldDelays),
    buildMetric('turn-count', 'Turn count', turns.filter((turn) => turn.speaker !== 'system').length, TURN_LIMIT, 'turns', 'pass', []),
    buildMetric('overlap', 'Any overlap max', maxOverlapMs, profile.talkOverMs, 'ms', maxOverlapMs <= profile.talkOverMs ? 'pass' : 'review', overlapPairs),
    buildMetric('outcome', 'Outcome check', input.expectedOutcome === 'human-handoff' ? 1 : 1, 1, 'check', 'pass', []),
  ]
}

function buildIssues(turns, profile, input) {
  const issues = []
  const spokenTurns = turns.filter((turn) => turn.speaker !== 'system')

  for (let index = 0; index < spokenTurns.length - 1; index += 1) {
    const current = spokenTurns[index]
    const next = spokenTurns[index + 1]
    const overlapMs = overlapDuration(current, next)
    if (current.speaker === 'caller' && (next.speaker === 'agent' || next.speaker === 'human')) {
      const gapMs = next.startMs - current.endMs
      if (gapMs > profile.responseGapMs) {
        issues.push({
          id: `dead-air-${issues.length + 1}`,
          type: 'dead-air',
          severity: severityFor('dead-air', gapMs, profile.responseGapMs),
          turnIds: [current.id, next.id],
          startMs: current.endMs,
          endMs: next.startMs,
          expected: `response within ${profile.responseGapMs} ms`,
          actual: `${gapMs} ms gap`,
          evidence: `${formatMs(current.endMs)}-${formatMs(next.startMs)} gap before ${next.speaker}`,
          message: `Caller waited ${gapMs} ms before the next response.`,
        })
      }
    }

    if (current.speaker === 'caller' && (next.speaker === 'agent' || next.speaker === 'human') && overlapMs > profile.talkOverMs) {
      issues.push({
        id: `talk-over-${issues.length + 1}`,
        type: 'talk-over',
        severity: 'high',
        turnIds: [current.id, next.id],
        startMs: next.startMs,
        endMs: current.endMs,
        expected: `overlap no more than ${profile.talkOverMs} ms`,
        actual: `${overlapMs} ms overlap`,
        evidence: `${formatMs(next.startMs)}-${formatMs(current.endMs)} overlap`,
        message: `Agent started ${overlapMs} ms before the caller finished.`,
      })
    }

    if ((current.speaker === 'agent' || current.speaker === 'human') && next.speaker === 'caller' && overlapMs > profile.yieldMs) {
      issues.push({
        id: `slow-yield-${issues.length + 1}`,
        type: 'slow-yield',
        severity: 'high',
        turnIds: [current.id, next.id],
        startMs: next.startMs,
        endMs: current.endMs,
        expected: `yield within ${profile.yieldMs} ms`,
        actual: `${overlapMs} ms overlap`,
        evidence: `${formatMs(next.startMs)}-${formatMs(current.endMs)} yield lag`,
        message: `Agent kept talking ${overlapMs} ms after the caller interrupted.`,
      })
    }
  }

  const repairTurns = spokenTurns.filter((turn) => turn.speaker === 'caller' && REPAIR_PATTERN.test(turn.text))
  for (const repairTurn of repairTurns) {
    const nextSpeakerTurn = spokenTurns.slice(spokenTurns.indexOf(repairTurn) + 1).find((turn) => turn.speaker === 'agent' || turn.speaker === 'human')
    if (!nextSpeakerTurn || !ACK_PATTERN.test(nextSpeakerTurn.text)) {
      issues.push({
        id: `missed-repair-${issues.length + 1}`,
        type: 'missed-repair',
        severity: 'medium',
        turnIds: nextSpeakerTurn ? [repairTurn.id, nextSpeakerTurn.id] : [repairTurn.id],
        startMs: repairTurn.startMs,
        endMs: nextSpeakerTurn?.endMs ?? repairTurn.endMs,
        expected: 'caller correction acknowledged in the next agent or human response',
        actual: nextSpeakerTurn ? nextSpeakerTurn.text : 'no follow-up response',
        evidence: `${repairTurn.lineNo}${nextSpeakerTurn ? ` -> ${nextSpeakerTurn.lineNo}` : ''}`,
        message: 'Caller correction was not acknowledged by the next response.',
      })
    }
  }

  const disclosureStatus = evaluateDisclosure(spokenTurns, input.disclosureRequired)
  if (disclosureStatus.issue) issues.push(disclosureStatus.issue)

  const outcomeStatus = evaluateOutcome(spokenTurns, input.expectedOutcome)
  if (outcomeStatus.issue) issues.push(outcomeStatus.issue)

  const handoffStatus = evaluateHandoff(spokenTurns, input.expectedOutcome)
  if (handoffStatus.issue) issues.push(handoffStatus.issue)

  issues.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
    if (severityDelta !== 0) return severityDelta
    return left.startMs - right.startMs || left.turnIds[0].localeCompare(right.turnIds[0])
  })

  return issues
}

function buildAcceptanceChecks(turns, profile, input, issues) {
  const checks = []
  const firstAgentTurn = turns.find((turn) => turn.speaker === 'agent')
  const disclosureOk = !input.disclosureRequired || (firstAgentTurn ? /\b(ai|virtual|automated|assistant|bot)\b/i.test(firstAgentTurn.text) : false)
  const outcomeOk = !issues.some((issue) => issue.type === 'missing-outcome')
  const handoffOk = input.expectedOutcome !== 'human-handoff' || !issues.some((issue) => issue.type === 'missing-handoff')
  const timingOk = !issues.some((issue) => issue.type === 'dead-air' || issue.type === 'talk-over' || issue.type === 'slow-yield')

  checks.push({
    id: 'timing',
    label: `Timing stays inside ${profile.label} threshold`,
    status: timingOk ? 'pass' : 'fail',
    evidenceTurnIds: issues.filter((issue) => issue.type === 'dead-air' || issue.type === 'talk-over' || issue.type === 'slow-yield').flatMap((issue) => issue.turnIds),
  })
  checks.push({
    id: 'outcome',
    label: `Expected outcome "${input.expectedOutcome}" is confirmed`,
    status: outcomeOk ? 'pass' : 'fail',
    evidenceTurnIds: issues.filter((issue) => issue.type === 'missing-outcome').flatMap((issue) => issue.turnIds),
  })
  checks.push({
    id: 'disclosure',
    label: input.disclosureRequired ? 'Opening disclosure is present' : 'Disclosure is not required',
    status: disclosureOk ? 'pass' : 'fail',
    evidenceTurnIds: issues.filter((issue) => issue.type === 'missing-disclosure').flatMap((issue) => issue.turnIds),
  })
  if (input.expectedOutcome === 'human-handoff') {
    checks.push({
      id: 'handoff',
      label: 'Human handoff is explicit',
      status: handoffOk ? 'pass' : 'fail',
      evidenceTurnIds: issues.filter((issue) => issue.type === 'missing-handoff').flatMap((issue) => issue.turnIds),
    })
  }
  return checks
}

function buildRetestChecklist(issues) {
  if (!issues.length) {
    return [
      'Re-run the same transcript to confirm the verdict is stable.',
      'Keep the same profile and expected outcome to preserve the acceptance baseline.',
      'Archive this packet and reuse it as the regression reference.',
    ]
  }

  return issues.slice(0, 6).map((issue, index) => `${index + 1}. Fix ${issue.type} on ${issue.turnIds.join(', ')}: ${issue.message}`)
}

function buildSummary({ turns, profile, issues, verdict, validation, metrics }) {
  return {
    projectName: validation.projectName,
    profile: validation.profile,
    profileLabel: profile.label,
    useCase: validation.useCase,
    expectedOutcome: validation.expectedOutcome,
    disclosureRequired: validation.disclosureRequired,
    turnCount: turns.filter((turn) => turn.speaker !== 'system').length,
    maxOverlapMs: metrics.find((metric) => metric.id === 'overlap')?.value ?? 0,
    maxDeadAirMs: metrics.find((metric) => metric.id === 'response-gap')?.value ?? 0,
    verdict,
    issueCount: issues.length,
  }
}

function evaluateDisclosure(turns, disclosureRequired) {
  if (!disclosureRequired) return { issue: null }
  const firstAgentTurn = turns.find((turn) => turn.speaker === 'agent')
  if (!firstAgentTurn) {
    return {
      issue: {
        id: 'missing-disclosure-1',
        type: 'missing-disclosure',
        severity: ISSUE_SEVERITY['missing-disclosure'],
        turnIds: [],
        startMs: 0,
        endMs: 0,
        expected: 'first agent turn identifies the assistant as AI/virtual/automated',
        actual: 'no agent turn',
        evidence: 'no agent opening',
        message: 'No agent opening disclosure was found.',
      },
    }
  }

  if (!/\b(ai|virtual|automated|assistant|bot)\b/i.test(firstAgentTurn.text)) {
    return {
      issue: {
        id: 'missing-disclosure-1',
        type: 'missing-disclosure',
        severity: ISSUE_SEVERITY['missing-disclosure'],
        turnIds: [firstAgentTurn.id],
        startMs: firstAgentTurn.startMs,
        endMs: firstAgentTurn.endMs,
        expected: 'first agent turn identifies the assistant as AI/virtual/automated',
        actual: firstAgentTurn.text,
        evidence: `${firstAgentTurn.lineNo}`,
        message: 'The opening agent turn does not disclose the assistant identity.',
      },
    }
  }

  return { issue: null }
}

function evaluateOutcome(turns, expectedOutcome) {
  const relevantTurns = turns.filter((turn) => turn.speaker === 'agent' || turn.speaker === 'human')
  const finalTurn = relevantTurns.at(-1)
  if (!finalTurn) {
    return {
      issue: {
        id: 'missing-outcome-1',
        type: 'missing-outcome',
        severity: ISSUE_SEVERITY['missing-outcome'],
        turnIds: [],
        startMs: 0,
        endMs: 0,
        expected: `${expectedOutcome} outcome`,
        actual: 'no final agent or human turn',
        evidence: 'conversation has no closing response',
        message: 'The conversation never reached a closing response.',
      },
    }
  }

  const patterns = OUTCOME_PATTERNS[expectedOutcome]
  if (!patterns.some((pattern) => pattern.test(finalTurn.text))) {
    return {
      issue: {
        id: 'missing-outcome-1',
        type: 'missing-outcome',
        severity: ISSUE_SEVERITY['missing-outcome'],
        turnIds: [finalTurn.id],
        startMs: finalTurn.startMs,
        endMs: finalTurn.endMs,
        expected: `${expectedOutcome} outcome`,
        actual: finalTurn.text,
        evidence: `${finalTurn.lineNo}`,
        message: `The closing response does not confirm the expected ${expectedOutcome} outcome.`,
      },
    }
  }

  return { issue: null }
}

function evaluateHandoff(turns, expectedOutcome) {
  if (expectedOutcome !== 'human-handoff') return { issue: null }
  const hasHumanTurn = turns.some((turn) => turn.speaker === 'human')
  const triggerTurn = turns.find((turn) => turn.speaker === 'caller' && OUTCOME_PATTERNS['human-handoff'].some((pattern) => pattern.test(turn.text)))
  if (hasHumanTurn) return { issue: null }
  if (triggerTurn) {
    return {
      issue: {
        id: 'missing-handoff-1',
        type: 'missing-handoff',
        severity: ISSUE_SEVERITY['missing-handoff'],
        turnIds: [triggerTurn.id],
        startMs: triggerTurn.startMs,
        endMs: triggerTurn.endMs,
        expected: 'human handoff after escalation request',
        actual: 'no human turn followed',
        evidence: `${triggerTurn.lineNo}`,
        message: 'The transcript requests a human but never shows the handoff.',
      },
    }
  }
  return {
    issue: {
      id: 'missing-handoff-1',
      type: 'missing-handoff',
      severity: ISSUE_SEVERITY['missing-handoff'],
      turnIds: [],
      startMs: 0,
      endMs: 0,
      expected: 'human handoff',
      actual: 'no human handoff evidence',
      evidence: 'no human turn',
      message: 'The transcript does not contain a human handoff.',
    },
  }
}

function deriveVerdict(issues) {
  if (issues.some((issue) => issue.severity === 'critical' || issue.severity === 'high')) return 'fail'
  if (issues.some((issue) => issue.severity === 'medium' || issue.severity === 'low')) return 'needs-review'
  return 'pass'
}

function buildMetric(id, label, value, threshold, unit, status, evidence) {
  return {
    id,
    label,
    value,
    threshold,
    unit,
    status,
    evidenceTurnIds: evidence.flatMap((item) => item.turnIds).filter(Boolean),
  }
}

function canonicalizeTurns(turns) {
  return turns
    .slice()
    .sort((left, right) => left.startMs - right.startMs || left.lineNo - right.lineNo)
    .map((turn, index) => ({
      ...turn,
      id: `turn-${index + 1}`,
    }))
}

function canonicalizeInput(input) {
  return {
    projectName: input.projectName,
    useCase: input.useCase,
    profile: input.profile,
    expectedOutcome: input.expectedOutcome,
    disclosureRequired: input.disclosureRequired,
    turns: input.turns.map((turn) => ({
      lineNo: turn.lineNo,
      speaker: turn.speaker,
      startMs: turn.startMs,
      endMs: turn.endMs,
      text: turn.text,
    })),
  }
}

function buildPairs(turns) {
  return turns.slice(1).map((turn, index) => ({
    prev: turns[index],
    next: turn,
  }))
}

function overlapDuration(left, right) {
  const start = Math.max(left.startMs, right.startMs)
  const end = Math.min(left.endMs, right.endMs)
  return Math.max(0, end - start)
}

function severityFor(type, value, threshold) {
  if (type !== 'dead-air') return ISSUE_SEVERITY[type]
  if (value > threshold * 2) return 'high'
  return ISSUE_SEVERITY[type]
}

function normalizeInput(input) {
  return {
    projectName: String(input?.projectName ?? '').trim(),
    useCase: String(input?.useCase ?? '').trim(),
    profile: String(input?.profile ?? '').trim(),
    expectedOutcome: String(input?.expectedOutcome ?? '').trim(),
    disclosureRequired: Boolean(input?.disclosureRequired),
    transcript: String(input?.transcript ?? '').trim(),
  }
}

function normalizeSpeaker(value) {
  switch (String(value).toUpperCase()) {
    case 'CALLER':
    case 'USER':
      return 'caller'
    case 'AGENT':
      return 'agent'
    case 'HUMAN':
      return 'human'
    case 'SYSTEM':
      return 'system'
    default:
      return null
  }
}

function timeToMs(minutes, seconds, millis) {
  return (Number(minutes) * 60 * 1000) + (Number(seconds) * 1000) + Number(millis)
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms))
  const minutes = String(Math.floor(total / 60000)).padStart(2, '0')
  const seconds = String(Math.floor((total % 60000) / 1000)).padStart(2, '0')
  const millis = String(total % 1000).padStart(3, '0')
  return `${minutes}:${seconds}.${millis}`
}

function stableHash(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, '\\|')
}

function byteLength(value) {
  return new TextEncoder().encode(String(value)).length
}
