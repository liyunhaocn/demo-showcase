import { buildMarkdown, copyMarkdown, downloadMarkdown } from './export.js'
import { INTENT_GROUPS, SIMULATION_NOTICE, SOURCE_GAPS, STATUS_LABELS, VIEW_COPY, scoreBand } from './model.js'
import { getPreset } from './presets.js'
import { generateBrief, validateProfile } from './scoring.js'
import { clearSavedState, loadDraftProfile, loadLastBrief, saveDraftProfile, saveLastBrief, storageAvailable } from './storage.js'

const params = new URLSearchParams(window.location.search)
const forceStorageDisabled = params.get('storage') === 'off'
const forceCopyFallback = params.get('copy') === 'fallback'

const state = {
  brief: null,
  view: 'security-lead',
  storageDisabled: forceStorageDisabled || !storageAvailable(),
  copyFallbackVisible: false,
  lastMessage: '',
}

const elements = {
  form: document.querySelector('#brand-form'),
  incidentName: document.querySelector('#incident-name'),
  alertSource: document.querySelector('#alert-source'),
  secretType: document.querySelector('#secret-type'),
  exposureSurface: document.querySelector('#exposure-surface'),
  owningTeam: document.querySelector('#owning-team'),
  alertAgeHours: document.querySelector('#alert-age-hours'),
  reviewModels: document.querySelector('#review-models'),
  reviewHint: document.querySelector('#review-hint'),
  incidentNameError: document.querySelector('#incident-name-error'),
  alertSourceError: document.querySelector('#alert-source-error'),
  secretTypeError: document.querySelector('#secret-type-error'),
  exposureSurfaceError: document.querySelector('#exposure-surface-error'),
  owningTeamError: document.querySelector('#owning-team-error'),
  alertAgeHoursError: document.querySelector('#alert-age-hours-error'),
  storageNotice: document.querySelector('#storage-notice'),
  messageRow: document.querySelector('#message-row'),
  restoreBanner: document.querySelector('#restore-banner'),
  restoreButton: document.querySelector('#restore-button'),
  resetButton: document.querySelector('#reset-button'),
  emptyState: document.querySelector('#empty-state'),
  reportShell: document.querySelector('#report-shell'),
  generatedAt: document.querySelector('#generated-at'),
  scoreGrid: document.querySelector('#score-grid'),
  summaryGrid: document.querySelector('#summary-grid'),
  promptList: document.querySelector('#prompt-list'),
  readinessList: document.querySelector('#readiness-list'),
  actionList: document.querySelector('#action-list'),
  copyButton: document.querySelector('#copy-button'),
  downloadButton: document.querySelector('#download-button'),
  reviewButton: document.querySelector('#review-button'),
  reviewPanel: document.querySelector('#review-panel'),
  reviewMarkdown: document.querySelector('#review-markdown'),
  selectFallback: document.querySelector('#select-review-button'),
  closeFallback: document.querySelector('#close-review-button'),
  viewInputs: document.querySelectorAll('input[name="report-view"]'),
  presetButtons: document.querySelectorAll('[data-preset]'),
}

init()

function init() {
  bindEvents()
  restoreDraft()
  refreshStorageState()
  render()
}

function bindEvents() {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    generateFromForm()
  })

  elements.form.addEventListener('input', () => {
    saveDraft()
    setGenerateLabel()
  })

  elements.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const preset = getPreset(button.dataset.preset)
      if (!preset) return
      fillForm(preset.profile)
      generateFromForm({ fromPreset: true })
    })
  })

  elements.restoreButton.addEventListener('click', () => {
    if (state.storageDisabled) return
    const loaded = loadLastBrief()
    if (loaded.ok && loaded.value?.schemaVersion === 1) {
      state.brief = loaded.value
      fillForm(loaded.value.profile)
      state.lastMessage = 'Restored last brief from this browser.'
      state.copyFallbackVisible = false
      render()
    }
  })

  elements.resetButton.addEventListener('click', () => {
    const confirmed = window.confirm('Reset demo data and clear the saved Secret Exposure Response Planner brief from this browser?')
    if (!confirmed) return
    state.brief = null
    state.copyFallbackVisible = false
    clearErrors()
    fillForm({
      incidentName: '',
      alertSource: '',
      secretType: '',
      exposureSurface: '',
      owningTeam: '',
      alertAgeHours: '',
      objective: 'contain-fast',
      reviewModels: [],
      createdAt: '',
    })
    if (!state.storageDisabled) clearSavedState()
    state.lastMessage = 'Reset complete. Start a new deterministic incident response report.'
    refreshStorageState()
    render()
  })

  elements.viewInputs.forEach((input) => {
    input.addEventListener('change', () => {
      state.view = input.value
      renderReport()
    })
  })

  elements.copyButton.addEventListener('click', async () => {
    if (!state.brief) return
    const markdown = buildMarkdown(state.brief, state.view)
    const result = await copyMarkdown(markdown, forceCopyFallback)
    if (result.ok) {
      state.copyFallbackVisible = false
      state.lastMessage = 'Markdown incident report copied to clipboard.'
    } else {
      state.copyFallbackVisible = true
      state.lastMessage = `Clipboard copy unavailable. ${result.reason || 'Use the fallback panel.'}`
    }
    renderReport()
  })

  elements.downloadButton.addEventListener('click', () => {
    if (!state.brief) return
    const markdown = buildMarkdown(state.brief, state.view)
    const fileName = downloadMarkdown(state.brief, markdown)
    state.lastMessage = `Downloaded ${fileName}.`
    renderReport()
  })

  elements.reviewButton.addEventListener('click', () => {
    state.copyFallbackVisible = true
    state.lastMessage = 'Markdown fallback opened for manual copy.'
    renderReport()
  })

  elements.selectFallback.addEventListener('click', () => {
    elements.reviewMarkdown.focus()
    elements.reviewMarkdown.select()
  })

  elements.closeFallback.addEventListener('click', () => {
    state.copyFallbackVisible = false
    renderReport()
  })
}

function generateFromForm() {
  clearErrors()
  const raw = readForm()
  const validation = validateProfile(raw)
  if (!validation.ok) {
    renderValidation(validation)
    state.lastMessage = 'Fix the highlighted fields before generating an incident brief.'
    render()
    return
  }

  const submit = elements.form.querySelector('button[type="submit"]')
  submit.disabled = true
  submit.textContent = 'Building deterministic incident brief...'

  window.setTimeout(() => {
    state.brief = generateBrief(validation.profile)
    state.copyFallbackVisible = false
    state.lastMessage = 'Brief generated as a deterministic incident-response simulation.'
    if (!state.storageDisabled) {
      const saveResult = saveLastBrief(state.brief)
      if (!saveResult.ok) {
        state.storageDisabled = true
        state.lastMessage = 'Brief generated. Storage is unavailable, so restore is disabled.'
      }
    }
    renderValidation(validation)
    refreshStorageState()
    render()
    submit.disabled = false
    setGenerateLabel()
  }, 220)
}

function readForm() {
  return {
    incidentName: elements.incidentName.value,
    alertSource: elements.alertSource.value,
    secretType: elements.secretType.value,
    exposureSurface: elements.exposureSurface.value,
    owningTeam: elements.owningTeam.value,
    alertAgeHours: elements.alertAgeHours.value,
    objective: document.querySelector('input[name="objective"]:checked')?.value || 'contain-fast',
    reviewModels: elements.reviewModels.value
      .split('\n')
      .map((line, index) => parseInventoryRow(line, index))
      .filter(Boolean),
  }
}

function parseInventoryRow(line, index) {
  const raw = line.trim()
  if (!raw) return null
  const parts = raw.split(/[|,]/).map((part) => part.trim())
  return {
    id: `alert-${index + 1}`,
    name: parts[0] || '',
    evidence: parts[1] || '',
    owner: parts[2] || '',
    state: parts[3] || 'watch',
  }
}

function fillForm(profile) {
  elements.incidentName.value = profile.incidentName || ''
  elements.alertSource.value = profile.alertSource || ''
  elements.secretType.value = profile.secretType || ''
  elements.exposureSurface.value = profile.exposureSurface || ''
  elements.owningTeam.value = profile.owningTeam || ''
  elements.alertAgeHours.value = profile.alertAgeHours || ''
  const objectiveInput = document.querySelector(`input[name="objective"][value="${profile.objective || 'contain-fast'}"]`)
  if (objectiveInput) objectiveInput.checked = true
  elements.reviewModels.value = (profile.reviewModels || [])
    .map((alert) => {
      if (typeof alert === 'string') return alert
      return [alert.name, alert.evidence, alert.owner, alert.state].filter(Boolean).join(' | ')
    })
    .join('\n')
  saveDraft()
  setGenerateLabel()
}

function restoreDraft() {
  if (state.storageDisabled) return
  const draft = loadDraftProfile()
  if (draft.ok && draft.value) fillForm(draft.value)
}

function saveDraft() {
  if (state.storageDisabled) return
  saveDraftProfile(readForm())
}

function refreshStorageState() {
  if (state.storageDisabled) {
    elements.storageNotice.hidden = false
    elements.storageNotice.textContent = 'Storage unavailable. Restore and draft persistence are disabled for this browser session.'
    elements.restoreBanner.hidden = true
    return
  }

  elements.storageNotice.hidden = true
  const lastBrief = loadLastBrief()
  elements.restoreBanner.hidden = !(lastBrief.ok && lastBrief.value)
}

function renderValidation(validation) {
  elements.incidentNameError.textContent = validation.errors.incidentName || ''
  elements.alertSourceError.textContent = validation.errors.alertSource || ''
  elements.secretTypeError.textContent = validation.errors.secretType || ''
  elements.exposureSurfaceError.textContent = validation.errors.exposureSurface || ''
  elements.owningTeamError.textContent = validation.errors.owningTeam || ''
  elements.alertAgeHoursError.textContent = validation.errors.alertAgeHours || ''

  const hintLines = [...validation.notes]
  if (validation.rowsTruncated) {
    hintLines.push(`Only the first ${validation.profile.reviewModels.length} alerts are used in this deterministic demo.`)
  }
  if (validation.ignoredRowCount > 0) {
    hintLines.push(`${validation.ignoredRowCount} extra alert row${validation.ignoredRowCount === 1 ? '' : 's'} were ignored.`)
  }
  elements.reviewHint.textContent = hintLines.length
    ? hintLines.join(' ')
    : 'Optional. Extra rows are ignored after the first 6 alerts.'
}

function render() {
  renderReport()
  setGenerateLabel()
  elements.emptyState.hidden = Boolean(state.brief)
  elements.reportShell.hidden = !state.brief
  elements.reviewPanel.hidden = !(state.copyFallbackVisible && state.brief)
  renderMessage()
}

function renderReport() {
  if (!state.brief) return

  const copy = VIEW_COPY[state.view] || VIEW_COPY['security-lead']
  elements.generatedAt.textContent = `Generated ${new Date(state.brief.generatedAt).toLocaleString()}`
  elements.reviewMarkdown.value = buildMarkdown(state.brief, state.view)
  elements.copyButton.textContent = copy.copyCta
  elements.downloadButton.textContent = copy.downloadCta
  elements.reviewPanel.hidden = !(state.copyFallbackVisible && state.brief)

  elements.scoreGrid.innerHTML = ''
  const scoreCards = [
    { label: 'Overall score', value: state.brief.score.overall, tone: toneForScore(state.brief.score.overall), description: scoreBand(state.brief.score.overall) },
    { label: 'Severity', value: state.brief.score.severity, tone: toneForScore(state.brief.score.severity), description: 'Higher means more of the incident is still active.' },
    { label: 'Containment', value: state.brief.score.containment, tone: toneForScore(state.brief.score.containment), description: 'Higher means more alerts already look contained.' },
    { label: 'Owner clarity', value: state.brief.score.ownerClarity, tone: toneForScore(state.brief.score.ownerClarity), description: 'Higher means the owner map is easier to follow.' },
  ]
  scoreCards.forEach((card) => {
    const node = document.createElement('article')
    node.className = 'score-card'
    node.dataset.tone = card.tone
    node.innerHTML = `
      <strong>${card.label}</strong>
      <div class="score-value">${card.value}</div>
      <span class="score-description">${card.description}</span>
    `
    elements.scoreGrid.appendChild(node)
  })

  elements.summaryGrid.innerHTML = ''
  const summaryCards = [
    { label: 'Incident summary', value: state.brief.summary, tone: 'ready' },
    { label: 'Audit trail', value: state.brief.simulationNotice, tone: 'watch' },
  ]
  summaryCards.forEach((card) => {
    const node = document.createElement('article')
    node.className = 'summary-card'
    node.dataset.tone = card.tone
    node.innerHTML = `
      <strong>${card.label}</strong>
      <span>${card.value}</span>
    `
    elements.summaryGrid.appendChild(node)
  })

  elements.promptList.innerHTML = ''
  state.brief.prompts.forEach((prompt) => {
    const node = document.createElement('article')
    node.className = 'prompt-card'
    node.innerHTML = `
      <span class="prompt-pill">${prompt.intentGroup}</span>
      <strong>${prompt.prompt}</strong>
      <span>Priority: ${prompt.priority}</span>
    `
    elements.promptList.appendChild(node)
  })

  elements.readinessList.innerHTML = ''
  state.brief.readiness.forEach((item) => {
    const node = document.createElement('article')
    node.className = 'readiness-card'
    node.innerHTML = `
      <span class="status-pill" data-tone="${item.state}">${item.label}</span>
      <strong>${item.detail}</strong>
      <span>${item.gap ? `Gap: ${SOURCE_GAPS[item.gap] || item.gap}` : 'No open gap for this check.'}</span>
    `
    elements.readinessList.appendChild(node)
  })

  elements.actionList.innerHTML = ''
  state.brief.actions.forEach((action, index) => {
    const node = document.createElement('article')
    node.className = 'action-card'
    node.innerHTML = `
      <span class="status-pill" data-tone="${index === 0 ? 'critical' : 'ready'}">${index + 1}</span>
      <strong>${action.title}</strong>
      <span>${action.why}</span>
    `
    elements.actionList.appendChild(node)
  })
}

function clearErrors() {
  elements.incidentNameError.textContent = ''
  elements.alertSourceError.textContent = ''
  elements.secretTypeError.textContent = ''
  elements.exposureSurfaceError.textContent = ''
  elements.owningTeamError.textContent = ''
  elements.alertAgeHoursError.textContent = ''
}

function setGenerateLabel() {
  const submit = elements.form.querySelector('button[type="submit"]')
  if (!submit) return
  if (submit.disabled) return
  submit.textContent = state.brief ? 'Refresh incident brief' : 'Generate incident brief'
}

function toneForScore(value) {
  if (value >= 80) return 'ready'
  if (value >= 55) return 'watch'
  return 'critical'
}

function renderMessage() {
  if (!elements.messageRow) return
  const text = state.lastMessage.trim()
  elements.messageRow.hidden = !text
  elements.messageRow.textContent = text
}
