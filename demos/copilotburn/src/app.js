import { buildMarkdown, copyMarkdown, downloadMarkdown } from './export.js'
import { COST_DRIVERS, SIMULATION_NOTICE, STATUS_LABELS, VIEW_COPY, scoreBand } from './model.js'
import { getPreset } from './presets.js'
import { generateBrief, validateProfile } from './scoring.js'
import { clearSavedState, loadDraftProfile, loadLastBrief, saveDraftProfile, saveLastBrief, storageAvailable } from './storage.js'

const params = new URLSearchParams(window.location.search)
const forceStorageDisabled = params.get('storage') === 'off'
const forceCopyFallback = params.get('copy') === 'fallback'

const state = {
  brief: null,
  view: 'founder',
  storageDisabled: forceStorageDisabled || !storageAvailable(),
  copyFallbackVisible: false,
  lastMessage: '',
}

const elements = {
  form: document.querySelector('#burn-form'),
  orgName: document.querySelector('#org-name'),
  githubOrg: document.querySelector('#github-org'),
  planTier: document.querySelector('#plan-tier'),
  seats: document.querySelector('#seats'),
  activeDevelopers: document.querySelector('#active-developers'),
  repos: document.querySelector('#repos'),
  prsPerMonth: document.querySelector('#prs-per-month'),
  codeReviewShare: document.querySelector('#code-review-share'),
  advancedModelShare: document.querySelector('#advanced-model-share'),
  monthlyCreditCap: document.querySelector('#monthly-credit-cap'),
  orgNameError: document.querySelector('#org-name-error'),
  githubOrgError: document.querySelector('#github-org-error'),
  seatsError: document.querySelector('#seats-error'),
  activeDevelopersError: document.querySelector('#active-developers-error'),
  reposError: document.querySelector('#repos-error'),
  prsPerMonthError: document.querySelector('#prs-per-month-error'),
  codeReviewShareError: document.querySelector('#code-review-share-error'),
  advancedModelShareError: document.querySelector('#advanced-model-share-error'),
  monthlyCreditCapError: document.querySelector('#monthly-credit-cap-error'),
  creditCapHint: document.querySelector('#credit-cap-hint'),
  storageNotice: document.querySelector('#storage-notice'),
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
  fallbackButton: document.querySelector('#fallback-button'),
  fallbackPanel: document.querySelector('#fallback-panel'),
  fallbackMarkdown: document.querySelector('#fallback-markdown'),
  selectFallback: document.querySelector('#select-fallback-button'),
  closeFallback: document.querySelector('#close-fallback-button'),
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
    const confirmed = window.confirm('Reset demo data and clear the saved CopilotBurn brief from this browser?')
    if (!confirmed) return
    state.brief = null
    state.copyFallbackVisible = false
    clearErrors()
    fillForm({
      orgName: '',
      githubOrg: '',
      plan: 'business',
      seats: '',
      activeDevelopers: '',
      repos: '',
      prsPerMonth: '',
      codeReviewShare: '',
      advancedModelShare: '',
      monthlyCreditCap: '',
      objective: 'forecast',
    })
    if (!state.storageDisabled) clearSavedState()
    state.lastMessage = 'Reset complete. Start a new deterministic spend brief.'
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
      state.lastMessage = 'Markdown brief copied to clipboard.'
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

  elements.fallbackButton.addEventListener('click', () => {
    state.copyFallbackVisible = true
    state.lastMessage = 'Markdown fallback opened for manual copy.'
    renderReport()
  })

  elements.selectFallback.addEventListener('click', () => {
    elements.fallbackMarkdown.focus()
    elements.fallbackMarkdown.select()
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
    state.lastMessage = 'Fix the highlighted fields before generating a brief.'
    render()
    return
  }

  const submit = elements.form.querySelector('button[type="submit"]')
  submit.disabled = true
  submit.textContent = 'Building deterministic spend brief...'

  window.setTimeout(() => {
    state.brief = generateBrief(validation.profile)
    state.copyFallbackVisible = false
    state.lastMessage = 'Brief generated as a deterministic demo simulation.'
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
    orgName: elements.orgName.value,
    githubOrg: elements.githubOrg.value,
    plan: elements.planTier.value,
    seats: elements.seats.value,
    activeDevelopers: elements.activeDevelopers.value,
    repos: elements.repos.value,
    prsPerMonth: elements.prsPerMonth.value,
    codeReviewShare: elements.codeReviewShare.value,
    advancedModelShare: elements.advancedModelShare.value,
    monthlyCreditCap: elements.monthlyCreditCap.value,
    objective: document.querySelector('input[name="objective"]:checked')?.value || 'forecast',
  }
}

function fillForm(profile) {
  elements.orgName.value = profile.orgName || ''
  elements.githubOrg.value = profile.githubOrg || ''
  elements.planTier.value = profile.plan || 'business'
  elements.seats.value = profile.seats || ''
  elements.activeDevelopers.value = profile.activeDevelopers || ''
  elements.repos.value = profile.repos || ''
  elements.prsPerMonth.value = profile.prsPerMonth || ''
  elements.codeReviewShare.value = profile.codeReviewShare || ''
  elements.advancedModelShare.value = profile.advancedModelShare || ''
  elements.monthlyCreditCap.value = profile.monthlyCreditCap || ''
  const objectiveInput = document.querySelector(`input[name="objective"][value="${profile.objective || 'forecast'}"]`)
  if (objectiveInput) objectiveInput.checked = true
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
    elements.storageNotice.textContent = storageDisabledMessage()
    elements.restoreBanner.hidden = true
    return
  }

  elements.storageNotice.hidden = !state.lastMessage
  elements.storageNotice.textContent = state.lastMessage || ''
  const loaded = loadLastBrief()
  elements.restoreBanner.hidden = !(loaded.ok && loaded.value?.schemaVersion === 1 && !state.brief)
}

function render() {
  refreshStorageState()
  elements.emptyState.hidden = Boolean(state.brief)
  elements.reportShell.hidden = !state.brief
  if (state.brief) renderReport()
  setGenerateLabel()
}

function renderReport() {
  if (!state.brief) return
  const brief = state.brief
  const copy = VIEW_COPY[state.view] || VIEW_COPY.founder

  elements.copyButton.textContent = copy.copyCta
  elements.downloadButton.textContent = copy.downloadCta
  elements.generatedAt.textContent = `${SIMULATION_NOTICE} Generated ${formatDate(brief.generatedAt)}`

  replaceChildren(elements.scoreGrid, [
    metricCard(`${brief.score.overall}`, `Burn control score - ${scoreBand(brief.score.overall)}`),
    metricCard(`${brief.forecast.projectedCredits}`, 'Projected AI credits'),
    metricCard(`${brief.forecast.includedCredits}`, 'Included credits'),
    metricCard(`${brief.forecast.overageCredits}`, 'Projected overage'),
  ])

  replaceChildren(elements.summaryGrid, [
    summaryCard('Usage snapshot', brief.summary.usageSnapshot),
    summaryCard('Cost driver', brief.summary.costDriver),
    summaryCard('Next week focus', `${copy.framing} Priority: ${brief.summary.nextWeekFocus}`),
  ])

  replaceChildren(elements.promptList, brief.findings.map((finding) => promptCard(brief, finding)))
  replaceChildren(elements.readinessList, brief.readiness.map(readinessCard))
  replaceChildren(elements.actionList, brief.actions.map(actionCard))

  const markdown = buildMarkdown(brief, state.view)
  elements.fallbackMarkdown.value = markdown
  elements.fallbackPanel.hidden = !state.copyFallbackVisible
  elements.storageNotice.hidden = !state.storageDisabled && !state.lastMessage
  elements.storageNotice.textContent = state.storageDisabled ? storageDisabledMessage() : state.lastMessage || ''
}

function metricCard(value, label) {
  const card = el('article', 'metric-card')
  const strong = el('strong')
  strong.textContent = value
  const span = el('span')
  span.textContent = label
  card.append(strong, span)
  return card
}

function summaryCard(title, text) {
  const card = el('article', 'summary-card')
  const heading = el('h3')
  heading.textContent = title
  const copy = el('p')
  copy.textContent = text
  card.append(heading, copy)
  return card
}

function promptCard(brief, finding) {
  const prompt = brief.prompts.find((item) => item.id === finding.promptId)
  const card = el('article', 'prompt-card')
  card.append(
    cell('Billing question', prompt?.prompt || finding.promptId),
    statusCell(finding.status),
    cell('Intent', prompt?.intentGroup || ''),
    cell('Cost driver', COST_DRIVERS[finding.likelySourceGap] || finding.likelySourceGap),
    cell('Recommended action', finding.recommendedAction),
  )
  if (finding.topDrivers.length) {
    card.append(cell('Hotspots', finding.topDrivers.map((driver) => COST_DRIVERS[driver] || driver).join(', ')))
  }
  return card
}

function cell(label, value) {
  const wrapper = el('div', 'prompt-cell')
  const labelNode = el('span', 'prompt-label')
  labelNode.textContent = label
  const valueNode = el('div', 'prompt-value')
  valueNode.textContent = value || 'None'
  wrapper.append(labelNode, valueNode)
  return wrapper
}

function statusCell(status) {
  const wrapper = el('div', 'prompt-cell')
  const label = el('span', 'prompt-label')
  label.textContent = 'State'
  const pill = el('span', `status-pill status-${status}`)
  pill.textContent = STATUS_LABELS[status] || status
  wrapper.append(label, pill)
  return wrapper
}

function readinessCard(check) {
  const card = el('article', 'readiness-card')
  const pill = el('span', `status-pill state-${check.state}`)
  pill.textContent = check.state
  const heading = el('h3')
  heading.textContent = check.label
  const detail = el('p')
  detail.textContent = check.detail
  card.append(pill, heading, detail)
  return card
}

function actionCard(action) {
  const card = el('article', 'action-card')
  const meta = el('div', 'action-meta')
  const impact = el('span')
  impact.textContent = `Impact ${action.impact}/5`
  const effort = el('span')
  effort.textContent = `Effort ${action.effort}/5`
  meta.append(impact, effort)
  const heading = el('h3')
  heading.textContent = action.title
  const why = el('p')
  why.textContent = action.why
  card.append(meta, heading, why)
  return card
}

function renderValidation(validation) {
  clearErrors()
  elements.orgNameError.textContent = validation.errors.orgName || ''
  elements.githubOrgError.textContent = validation.errors.githubOrg || ''
  elements.seatsError.textContent = validation.errors.seats || ''
  elements.activeDevelopersError.textContent = validation.errors.activeDevelopers || ''
  elements.reposError.textContent = validation.errors.repos || ''
  elements.prsPerMonthError.textContent = validation.errors.prsPerMonth || ''
  elements.codeReviewShareError.textContent = validation.errors.codeReviewShare || ''
  elements.advancedModelShareError.textContent = validation.errors.advancedModelShare || ''
  elements.monthlyCreditCapError.textContent = validation.errors.monthlyCreditCap || ''
  elements.creditCapHint.textContent = validation.notes.length
    ? validation.notes.join(' ')
    : 'Optional. If blank, the demo uses plan allowance and workload shape to estimate buffer.'
}

function clearErrors() {
  elements.orgNameError.textContent = ''
  elements.githubOrgError.textContent = ''
  elements.seatsError.textContent = ''
  elements.activeDevelopersError.textContent = ''
  elements.reposError.textContent = ''
  elements.prsPerMonthError.textContent = ''
  elements.codeReviewShareError.textContent = ''
  elements.advancedModelShareError.textContent = ''
  elements.monthlyCreditCapError.textContent = ''
}

function setGenerateLabel() {
  const submit = elements.form.querySelector('button[type="submit"]')
  if (!submit.disabled) submit.textContent = state.brief ? 'Regenerate spend brief' : 'Generate spend brief'
}

function el(tag, className = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function replaceChildren(parent, children) {
  parent.replaceChildren(...children)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function storageDisabledMessage() {
  const prefix = state.lastMessage ? `${state.lastMessage} ` : ''
  return `${prefix}Storage disabled: you can still generate, copy, and download reports, but restore will not be available. Test with ?storage=off.`
}
