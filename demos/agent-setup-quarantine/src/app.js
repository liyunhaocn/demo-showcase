import { buildMarkdown, copyMarkdown, downloadMarkdown } from './export.js'
import { getPreset } from './presets.js'
import { analyzeSetupTrace, buildQuarantineBrief, normalizeCommandRows } from './scoring.js'

const params = new URLSearchParams(window.location.search)
const forceCopyFallback = params.get('copy') === 'fallback'
const forceStorageDisabled = params.get('storage') === 'off'

const state = {
  brief: null,
  view: 'operator',
  fallbackOpen: false,
  message: forceStorageDisabled
    ? 'Storage disabled: this demo does not require browser storage, so generation, copy fallback, and download still work.'
    : '',
}

const elements = {
  form: document.querySelector('#quarantine-form'),
  workspaceName: document.querySelector('#workspace-name'),
  agentRuntime: document.querySelector('#agent-runtime'),
  owner: document.querySelector('#owner'),
  commands: document.querySelector('#commands'),
  message: document.querySelector('#message-row'),
  empty: document.querySelector('#empty-state'),
  report: document.querySelector('#report'),
  generatedAt: document.querySelector('#generated-at'),
  metrics: document.querySelector('#metrics'),
  summary: document.querySelector('#summary'),
  findings: document.querySelector('#findings'),
  gates: document.querySelector('#gates'),
  actions: document.querySelector('#actions'),
  markdown: document.querySelector('#markdown-fallback'),
  fallbackPanel: document.querySelector('#fallback-panel'),
  copy: document.querySelector('#copy-brief'),
  download: document.querySelector('#download-brief'),
  showFallback: document.querySelector('#show-fallback'),
  selectFallback: document.querySelector('#select-fallback'),
  closeFallback: document.querySelector('#close-fallback'),
  reset: document.querySelector('#reset-demo'),
  presetButtons: document.querySelectorAll('[data-preset]'),
  viewInputs: document.querySelectorAll('input[name="report-view"]'),
  errors: {
    workspaceName: document.querySelector('#workspace-name-error'),
    agentRuntime: document.querySelector('#agent-runtime-error'),
    owner: document.querySelector('#owner-error'),
    commands: document.querySelector('#commands-error'),
  },
}

bindEvents()
loadPreset('clean-repo-trap')
generate()

function bindEvents() {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    generate()
  })

  elements.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      loadPreset(button.dataset.preset)
      generate()
    })
  })

  elements.viewInputs.forEach((input) => {
    input.addEventListener('change', () => {
      state.view = input.value
      renderReport()
    })
  })

  elements.copy.addEventListener('click', async () => {
    if (!state.brief) return
    const markdown = buildMarkdown(state.brief, state.view)
    const result = await copyMarkdown(markdown, forceCopyFallback)
    state.fallbackOpen = !result.ok
    state.message = result.ok ? 'Quarantine brief copied.' : `Copy fallback opened. ${result.reason}`
    renderReport()
  })

  elements.download.addEventListener('click', () => {
    if (!state.brief) return
    const fileName = downloadMarkdown(state.brief, buildMarkdown(state.brief, state.view))
    state.message = `Downloaded ${fileName}.`
    renderReport()
  })

  elements.showFallback.addEventListener('click', () => {
    state.fallbackOpen = true
    state.message = 'Markdown fallback opened for manual copy.'
    renderReport()
  })

  elements.selectFallback.addEventListener('click', () => {
    elements.markdown.focus()
    elements.markdown.select()
  })

  elements.closeFallback.addEventListener('click', () => {
    state.fallbackOpen = false
    renderReport()
  })

  elements.reset.addEventListener('click', () => {
    loadPreset('clean-repo-trap')
    state.message = 'Demo reset to the clean repo trap preset.'
    generate()
  })
}

function loadPreset(id) {
  const preset = getPreset(id)
  if (!preset) return

  elements.workspaceName.value = preset.profile.workspaceName
  elements.agentRuntime.value = preset.profile.agentRuntime
  elements.owner.value = preset.profile.owner
  const objective = document.querySelector(`input[name="objective"][value="${preset.profile.objective}"]`)
  if (objective) objective.checked = true
  elements.commands.value = preset.profile.commands.join('\n')
}

function generate() {
  clearErrors()
  const profile = readProfile()
  const validation = validateProfile(profile)
  if (!validation.ok) {
    renderErrors(validation.errors)
    state.message = 'Fix the highlighted fields before generating a quarantine brief.'
    renderShell()
    return
  }

  state.brief = buildQuarantineBrief(profile)
  state.fallbackOpen = false
  state.message = state.message || 'Deterministic quarantine brief generated.'
  renderReport()
}

function readProfile() {
  return {
    workspaceName: elements.workspaceName.value,
    agentRuntime: elements.agentRuntime.value,
    owner: elements.owner.value,
    objective: document.querySelector('input[name="objective"]:checked')?.value || 'prevent-runtime-payload',
    commands: normalizeCommandRows(elements.commands.value.split('\n')),
  }
}

function validateProfile(profile) {
  const errors = {}
  if (profile.workspaceName.trim().length < 3) errors.workspaceName = 'Name the workspace or setup lane.'
  if (profile.agentRuntime.trim().length < 3) errors.agentRuntime = 'Name the AI coding agent runtime.'
  if (profile.owner.trim().length < 3) errors.owner = 'Name the accountable owner.'
  if (profile.commands.length < 2) errors.commands = 'Paste at least two setup command rows.'
  return { ok: Object.keys(errors).length === 0, errors }
}

function renderReport() {
  if (!state.brief) {
    renderShell()
    return
  }

  const trace = analyzeSetupTrace(state.brief.profile.commands)
  state.brief.trace = trace
  state.brief.summary.topAction = state.brief.summary.topAction

  elements.generatedAt.textContent = `Generated ${formatDate(state.brief.generatedAt)}`
  replaceChildren(elements.metrics, [
    metricCard(`${trace.score}`, `Readiness score - ${state.brief.summary.posture}`),
    metricCard(trace.overallRisk, 'overall risk'),
    metricCard(`${trace.metrics.commands}`, 'commands scanned'),
    metricCard(`${trace.metrics.ownerCoverage}%`, 'owner coverage'),
  ])

  replaceChildren(elements.summary, [
    summaryCard('Quarantine decision', state.brief.summary.topAction),
    summaryCard('Operator focus', state.brief.summary.operatorFocus),
    summaryCard('Simulation boundary', 'Static pattern scoring only; no live repo, network, or model calls are made.'),
  ])

  replaceChildren(elements.findings, trace.findings.length ? trace.findings.map(findingCard) : [emptyCard('No risky setup commands detected.')])
  replaceChildren(elements.gates, trace.gates.map(gateCard))
  replaceChildren(elements.actions, state.brief.actions.map(actionCard))

  elements.markdown.value = buildMarkdown(state.brief, state.view)
  elements.fallbackPanel.hidden = !state.fallbackOpen
  renderShell()
}

function renderShell() {
  elements.message.hidden = !state.message
  elements.message.textContent = state.message
  elements.empty.hidden = Boolean(state.brief)
  elements.report.hidden = !state.brief
}

function metricCard(value, label) {
  const card = create('article', 'metric-card')
  const strong = create('strong')
  strong.textContent = value
  const span = create('span')
  span.textContent = label
  card.append(strong, span)
  return card
}

function summaryCard(title, text) {
  const card = create('article', 'summary-card')
  const heading = create('h3')
  heading.textContent = title
  const body = create('p')
  body.textContent = text
  card.append(heading, body)
  return card
}

function findingCard(finding) {
  const card = create('article', 'finding-card')
  card.append(
    labelValue('Command', finding.command),
    pillValue('Severity', finding.severity, `severity-${finding.severity}`),
    labelValue('Pattern', finding.label),
    labelValue('Action', finding.recommendedAction),
  )
  return card
}

function gateCard(gate) {
  const card = create('article', 'gate-card')
  const pill = create('span', `state-pill state-${gate.state}`)
  pill.textContent = gate.state
  const heading = create('h3')
  heading.textContent = gate.label
  const detail = create('p')
  detail.textContent = gate.detail
  card.append(pill, heading, detail)
  return card
}

function actionCard(action) {
  const card = create('article', 'action-card')
  const meta = create('div', 'action-meta')
  meta.append(metaChip(`Impact ${action.impact}/5`), metaChip(`Effort ${action.effort}/5`))
  const heading = create('h3')
  heading.textContent = action.title
  const body = create('p')
  body.textContent = action.why
  card.append(meta, heading, body)
  return card
}

function emptyCard(text) {
  const card = create('article', 'empty-card')
  card.textContent = text
  return card
}

function labelValue(label, value) {
  const wrapper = create('div', 'finding-cell')
  const labelNode = create('span')
  labelNode.textContent = label
  const valueNode = create('p')
  valueNode.textContent = value || 'None'
  wrapper.append(labelNode, valueNode)
  return wrapper
}

function pillValue(label, value, className) {
  const wrapper = create('div', 'finding-cell')
  const labelNode = create('span')
  labelNode.textContent = label
  const pill = create('strong', `severity-pill ${className}`)
  pill.textContent = value
  wrapper.append(labelNode, pill)
  return wrapper
}

function metaChip(text) {
  const chip = create('span')
  chip.textContent = text
  return chip
}

function renderErrors(errors) {
  elements.errors.workspaceName.textContent = errors.workspaceName || ''
  elements.errors.agentRuntime.textContent = errors.agentRuntime || ''
  elements.errors.owner.textContent = errors.owner || ''
  elements.errors.commands.textContent = errors.commands || ''
}

function clearErrors() {
  renderErrors({})
}

function replaceChildren(parent, children) {
  parent.replaceChildren(...children)
}

function create(tag, className = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
