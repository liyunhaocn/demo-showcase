import { buildMarkdown, copyMarkdown, downloadMarkdown } from './export.mjs'
import { analyzeTranscript, PROFILES, SIMULATION_DISCLAIMER } from './model.mjs'
import { DEFAULT_PRESET_ID, PRESETS, getPreset } from './presets.mjs'
import { createStorage } from './storage.mjs'

const params = new URLSearchParams(window.location.search)
const forceStorageDisabled = params.get('storage') === 'off'
const forceCopyFallback = params.get('copy') === 'fallback'
const storage = createStorage({ enabled: !forceStorageDisabled, key: 'voice-turn-qa-lab:last-analysis:v1' })

const elements = {
  body: document.body,
  form: document.querySelector('#qa-form'),
  presetRow: document.querySelector('#preset-row'),
  storageNotice: document.querySelector('#storage-notice'),
  restoreBanner: document.querySelector('#restore-banner'),
  restoreButton: document.querySelector('#restore-button'),
  resetButton: document.querySelector('#reset-button'),
  saveButton: document.querySelector('#save-button'),
  analyzeButton: document.querySelector('#analyze-button'),
  projectName: document.querySelector('#project-name'),
  useCase: document.querySelector('#use-case'),
  acceptanceProfile: document.querySelector('#acceptance-profile'),
  expectedOutcome: document.querySelector('#expected-outcome'),
  disclosureRequired: document.querySelector('#disclosure-required'),
  transcript: document.querySelector('#transcript'),
  projectNameError: document.querySelector('#project-name-error'),
  useCaseError: document.querySelector('#use-case-error'),
  acceptanceProfileError: document.querySelector('#acceptance-profile-error'),
  expectedOutcomeError: document.querySelector('#expected-outcome-error'),
  disclosureRequiredError: document.querySelector('#disclosure-required-error'),
  transcriptError: document.querySelector('#transcript-error'),
  emptyState: document.querySelector('#empty-state'),
  reportView: document.querySelector('#report-view'),
  reportShell: document.querySelector('#report-shell'),
  verdictBox: document.querySelector('#verdict-box'),
  summaryStrip: document.querySelector('#summary-strip'),
  metricGrid: document.querySelector('#metric-grid'),
  timeline: document.querySelector('#timeline'),
  incidentList: document.querySelector('#incident-list'),
  acceptanceList: document.querySelector('#acceptance-list'),
  retestList: document.querySelector('#retest-list'),
  copyButton: document.querySelector('#copy-button'),
  downloadButton: document.querySelector('#download-button'),
  fallbackPanel: document.querySelector('#fallback-panel'),
  markdownFallback: document.querySelector('#markdown-fallback'),
  selectFallbackButton: document.querySelector('#select-drift-button'),
  closeFallbackButton: document.querySelector('#close-drift-button'),
}

const state = {
  draft: cloneDraft(getPreset(DEFAULT_PRESET_ID).form),
  report: null,
  reportState: 'idle',
  message: '',
  activePresetId: DEFAULT_PRESET_ID,
  copyFallbackVisible: false,
}

init()

function init() {
  renderPresetButtons()
  bindEvents()
  restoreSavedReport()
  if (!state.report) {
    applyDraft(state.draft)
  }
  refreshStorageNotice()
  render()
}

function bindEvents() {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    runAnalysis()
  })

  elements.form.addEventListener('input', () => {
    state.draft = readDraftFromForm()
    state.report = null
    state.reportState = 'dirty'
    state.message = 'Draft changed. Re-run analysis to refresh the report.'
    state.copyFallbackVisible = false
    render()
  })

  elements.restoreButton.addEventListener('click', () => {
    restoreSavedReport()
    render()
  })

  elements.saveButton.addEventListener('click', () => {
    if (!state.report) {
      state.message = 'Generate a report before saving it locally.'
      render()
      return
    }
    const result = storage.save({
      schemaVersion: 1,
      report: state.report,
      draft: state.draft,
    })
    state.message = result.ok ? 'Saved report to this browser.' : 'Local save failed.'
    refreshStorageNotice()
    render()
  })

  elements.resetButton.addEventListener('click', () => {
    if (!window.confirm('Reset the demo, clear the browser report, and restore the default preset?')) return
    state.report = null
    state.reportState = 'idle'
    state.message = 'Demo reset.'
    state.copyFallbackVisible = false
    state.draft = cloneDraft(getPreset(DEFAULT_PRESET_ID).form)
    storage.clear()
    applyDraft(state.draft)
    refreshStorageNotice()
    render()
  })

  elements.copyButton.addEventListener('click', async () => {
    if (!state.report) return
    const markdown = buildMarkdown(state.report)
    const result = await copyMarkdown(markdown, forceCopyFallback)
    if (result.ok) {
      state.message = 'Markdown copied to the clipboard.'
      state.copyFallbackVisible = false
    } else {
      state.message = 'Clipboard unavailable. Use the manual copy buffer.'
      state.copyFallbackVisible = true
      elements.markdownFallback.value = markdown
    }
    render()
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.report) return
    const markdown = buildMarkdown(state.report)
    const fileName = downloadMarkdown(state.report, markdown)
    state.message = `Downloaded ${fileName}.`
    render()
  })

  elements.selectFallbackButton.addEventListener('click', () => {
    elements.markdownFallback.focus()
    elements.markdownFallback.select()
  })

  elements.closeFallbackButton.addEventListener('click', () => {
    state.copyFallbackVisible = false
    render()
  })

  for (const button of elements.presetRow.querySelectorAll('button[data-preset]')) {
    button.addEventListener('click', () => {
      applyPreset(button.dataset.preset)
      state.report = null
      state.reportState = 'dirty'
      state.message = `Loaded preset: ${button.dataset.preset}.`
      state.copyFallbackVisible = false
      render()
    })
  }
}

function runAnalysis() {
  clearFieldErrors()
  state.draft = readDraftFromForm()
  const validation = validateDraft(state.draft)
  if (!validation.ok) {
    renderFieldErrors(validation.errors)
    state.report = null
    state.reportState = 'invalid'
    state.message = 'Fix the highlighted fields before analyzing.'
    render()
    return
  }

  try {
    state.report = analyzeTranscript(validation.value)
    state.reportState = 'report-ready'
    state.message = `${state.report.verdict.toUpperCase()} verdict generated for ${state.report.projectName}.`
    state.copyFallbackVisible = false
    applyReportToFormState(state.report)
    storage.save({
      schemaVersion: 1,
      report: state.report,
      draft: state.draft,
    })
    refreshStorageNotice()
    render()
  } catch (error) {
    state.report = null
    state.reportState = 'invalid'
    state.message = error?.message || 'Analysis failed.'
    render()
  }
}

function restoreSavedReport() {
  if (!storage.available) {
    state.message = 'Storage off. Reports stay in memory only.'
    state.report = null
    return
  }

  const loaded = storage.load()
  if (loaded.ok && loaded.value?.schemaVersion === 1 && loaded.value.report?.analysisId) {
    state.report = loaded.value.report
    state.draft = normalizeSavedDraft(loaded.value.draft || loaded.value.report.input)
    state.reportState = 'report-ready'
    state.copyFallbackVisible = false
    state.message = 'Restored last saved report from this browser.'
    applyDraft(state.draft)
  }
}

function renderPresetButtons() {
  elements.presetRow.replaceChildren(
    ...PRESETS.map((preset) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'preset-card'
      button.dataset.preset = preset.id
      button.setAttribute('aria-pressed', String(preset.id === state.activePresetId))
      button.innerHTML = ''
      const title = document.createElement('strong')
      title.textContent = preset.label
      const desc = document.createElement('span')
      desc.textContent = preset.description
      button.append(title, desc)
      return button
    }),
  )
}

function applyPreset(id) {
  const preset = getPreset(id)
  if (!preset) return
  state.activePresetId = preset.id
  state.draft = cloneDraft(preset.form)
  applyDraft(state.draft)
  updatePresetPressedState()
}

function applyDraft(draft) {
  elements.projectName.value = draft.projectName || ''
  elements.useCase.value = draft.useCase || 'appointment-change'
  elements.acceptanceProfile.value = draft.profile || 'production'
  elements.expectedOutcome.value = draft.expectedOutcome || 'scheduled'
  elements.disclosureRequired.checked = Boolean(draft.disclosureRequired)
  elements.transcript.value = draft.transcript || ''
  updatePresetPressedState()
}

function applyReportToFormState(report) {
  state.activePresetId = findPresetForReport(report) || state.activePresetId
  updatePresetPressedState()
}

function updatePresetPressedState() {
  for (const button of elements.presetRow.querySelectorAll('button[data-preset]')) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === state.activePresetId))
  }
}

function render() {
  document.body.dataset.reportState = state.reportState
  refreshStorageNotice()
  elements.restoreBanner.hidden = !storage.available
  elements.restoreButton.disabled = !storage.available
  elements.emptyState.hidden = Boolean(state.report)
  elements.reportView.hidden = !state.report
  elements.copyButton.disabled = !state.report
  elements.downloadButton.disabled = !state.report
  elements.saveButton.disabled = !state.report || !storage.available
  elements.analyzeButton.textContent = state.report ? 'Refresh report' : 'Analyze transcript'
  elements.verdictBox.replaceChildren()

  renderMessage()

  if (!state.report) return

  elements.reportShell.dataset.verdict = state.report.verdict
  elements.reportShell.dataset.schemaVersion = String(state.report.schemaVersion || 1)
  renderVerdict()
  renderSummary()
  renderMetrics()
  renderTimeline()
  renderIncidents()
  renderAcceptance()
  renderRetest()
  renderFallback()
}

function renderMessage() {
  elements.storageNotice.replaceChildren()
  const storageLine = document.createElement('div')
  storageLine.className = 'status-chip'
  storageLine.textContent = storage.available ? 'Storage enabled' : 'Storage off'
  const messageLine = document.createElement('div')
  messageLine.className = 'status-chip'
  messageLine.textContent = state.message || SIMULATION_DISCLAIMER
  elements.storageNotice.append(storageLine, messageLine)
  elements.reportShell.dataset.messageState = state.reportState
}

function renderVerdict() {
  const badge = document.createElement('div')
  badge.className = `verdict-badge verdict-${state.report.verdict}`
  badge.textContent = state.report.verdict.replace('-', ' ')
  const details = document.createElement('div')
  details.className = 'metric-meta'
  details.textContent = `${state.report.summary.turnCount} turns • ${state.report.summary.issueCount} issues • ${state.report.analysisId}`
  elements.verdictBox.append(badge, details)
}

function renderSummary() {
  const chips = [
    `Project: ${state.report.projectName}`,
    `Profile: ${state.report.profileLabel}`,
    `Use case: ${state.report.useCase}`,
    `Expected: ${state.report.expectedOutcome}`,
    `Disclosure: ${state.report.disclosureRequired ? 'required' : 'not required'}`,
  ]
  elements.summaryStrip.replaceChildren(
    ...chips.map((label) => {
      const chip = document.createElement('span')
      chip.className = 'summary-chip'
      chip.textContent = label
      return chip
    }),
  )
}

function renderMetrics() {
  elements.metricGrid.replaceChildren(
    ...state.report.metrics.map((metric) => {
      const card = document.createElement('article')
      card.className = 'metric-card'
      const top = document.createElement('div')
      top.className = 'metric-top'
      const label = document.createElement('span')
      label.className = 'metric-label'
      label.textContent = metric.label
      const status = document.createElement('span')
      status.className = `metric-status status-${metric.status}`
      status.textContent = metric.status
      const value = document.createElement('div')
      value.className = 'metric-value'
      value.textContent = `${metric.value} ${metric.unit}`
      const meta = document.createElement('div')
      meta.className = 'metric-meta'
      meta.textContent = `Threshold ${metric.threshold} ${metric.unit}`
      const evidence = document.createElement('div')
      evidence.className = 'metric-meta'
      evidence.textContent = metric.evidenceTurnIds.length
        ? `Evidence: ${metric.evidenceTurnIds.join(', ')}`
        : 'Evidence: none'
      top.append(label, status)
      card.append(top, value, meta, evidence)
      return card
    }),
  )
}

function renderTimeline() {
  elements.timeline.replaceChildren(
    ...state.report.turns.map((turn) => {
      const item = document.createElement('li')
      item.className = 'turn-card'
      item.dataset.speaker = turn.speaker
      const meta = document.createElement('div')
      meta.className = 'turn-meta'
      const tag = document.createElement('span')
      tag.className = `speaker-tag ${turn.speaker}`
      tag.textContent = turn.speaker
      const time = document.createElement('span')
      time.textContent = `${formatMs(turn.startMs)}-${formatMs(turn.endMs)}`
      const line = document.createElement('span')
      line.textContent = `line ${turn.lineNo}`
      meta.append(tag, time, line)
      const text = document.createElement('div')
      text.className = 'turn-text'
      text.textContent = turn.text
      item.append(meta, text)
      return item
    }),
  )
}

function renderIncidents() {
  elements.incidentList.replaceChildren(
    ...state.report.issues.map((issue) => {
      const card = document.createElement('article')
      card.className = 'incident-card'
      const head = document.createElement('div')
      head.className = 'incident-head'
      const title = document.createElement('strong')
      title.textContent = issue.type
      const severity = document.createElement('span')
      severity.className = `severity-tag severity-${issue.severity}`
      severity.textContent = issue.severity
      const body = document.createElement('p')
      body.textContent = issue.message
      const details = document.createElement('p')
      details.textContent = `Evidence ${issue.evidence} • Turns ${issue.turnIds.join(', ')}`
      head.append(title, severity)
      card.append(head, body, details)
      return card
    }),
  )
}

function renderAcceptance() {
  elements.acceptanceList.replaceChildren(
    ...state.report.acceptanceChecks.map((check) => {
      const item = document.createElement('li')
      const row = document.createElement('div')
      row.className = 'check-row'
      const label = document.createElement('strong')
      label.textContent = check.label
      const status = document.createElement('span')
      status.className = `severity-tag severity-${check.status === 'pass' ? 'pass' : 'fail'}`
      status.textContent = check.status
      row.append(label, status)
      item.append(row)
      return item
    }),
  )
}

function renderRetest() {
  elements.retestList.replaceChildren(
    ...state.report.retestChecklist.map((step) => {
      const item = document.createElement('li')
      item.textContent = step
      return item
    }),
  )
}

function renderFallback() {
  elements.fallbackPanel.hidden = !state.copyFallbackVisible
  if (state.copyFallbackVisible && state.report) {
    elements.markdownFallback.value = buildMarkdown(state.report)
  }
}

function validateDraft(draft) {
  const errors = {
    projectName: [],
    useCase: [],
    acceptanceProfile: [],
    expectedOutcome: [],
    disclosureRequired: [],
    transcript: [],
  }

  if (draft.projectName.trim().length < 2 || draft.projectName.trim().length > 80) {
    errors.projectName.push('Project name must be 2-80 characters.')
  }

  if (!['billing-support', 'appointment-change', 'service-outage'].includes(draft.useCase)) {
    errors.useCase.push('Choose a supported use case.')
  }

  if (!Object.hasOwn(PROFILES, draft.profile)) {
    errors.acceptanceProfile.push('Choose Pilot, Production, or Strict.')
  }

  if (!['resolved', 'scheduled', 'human-handoff'].includes(draft.expectedOutcome)) {
    errors.expectedOutcome.push('Choose a supported outcome.')
  }

  if (typeof draft.disclosureRequired !== 'boolean') {
    errors.disclosureRequired.push('Disclosure must be a true or false value.')
  }

  const trimmedTranscript = draft.transcript.trim()
  const byteLength = new Blob([trimmedTranscript]).size
  const lineCount = trimmedTranscript ? trimmedTranscript.split(/\n/).filter(Boolean).length : 0
  if (!trimmedTranscript) {
    errors.transcript.push('Transcript is required.')
  } else {
    if (byteLength > 64 * 1024) {
      errors.transcript.push('Transcript must stay within 64 KiB.')
    }
    if (lineCount < 4 || lineCount > 80) {
      errors.transcript.push('Transcript must contain 4-80 non-empty lines.')
    }
  }

  const ok = Object.values(errors).every((list) => list.length === 0)
  return ok ? { ok: true, value: draft } : { ok: false, errors }
}

function renderFieldErrors(errors) {
  elements.projectNameError.textContent = errors.projectName?.[0] || ''
  elements.useCaseError.textContent = errors.useCase?.[0] || ''
  elements.acceptanceProfileError.textContent = errors.acceptanceProfile?.[0] || ''
  elements.expectedOutcomeError.textContent = errors.expectedOutcome?.[0] || ''
  elements.disclosureRequiredError.textContent = errors.disclosureRequired?.[0] || ''
  elements.transcriptError.textContent = errors.transcript?.[0] || ''
}

function clearFieldErrors() {
  renderFieldErrors({})
}

function readDraftFromForm() {
  return {
    projectName: elements.projectName.value.trim(),
    useCase: elements.useCase.value,
    profile: elements.acceptanceProfile.value,
    expectedOutcome: elements.expectedOutcome.value,
    disclosureRequired: elements.disclosureRequired.checked,
    transcript: elements.transcript.value.trim(),
  }
}

function cloneDraft(form) {
  return {
    projectName: form.projectName || '',
    useCase: form.useCase || 'appointment-change',
    profile: form.profile || 'production',
    expectedOutcome: form.expectedOutcome || 'scheduled',
    disclosureRequired: Boolean(form.disclosureRequired),
    transcript: form.transcript || '',
  }
}

function normalizeSavedDraft(saved) {
  return cloneDraft({
    projectName: saved.projectName,
    useCase: saved.useCase,
    profile: saved.profile,
    expectedOutcome: saved.expectedOutcome,
    disclosureRequired: saved.disclosureRequired,
    transcript: saved.transcript,
  })
}

function refreshStorageNotice() {
  if (!storage.available) {
    elements.storageNotice.dataset.state = 'off'
    elements.storageNotice.title = 'Storage is disabled for this session.'
  } else {
    elements.storageNotice.dataset.state = 'on'
    elements.storageNotice.title = 'Reports can be stored in this browser.'
  }
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms))
  const minutes = String(Math.floor(total / 60000)).padStart(2, '0')
  const seconds = String(Math.floor((total % 60000) / 1000)).padStart(2, '0')
  const millis = String(total % 1000).padStart(3, '0')
  return `${minutes}:${seconds}.${millis}`
}

function findPresetForReport(report) {
  const match = PRESETS.find((preset) => preset.form.projectName === report.projectName)
  return match?.id || null
}
