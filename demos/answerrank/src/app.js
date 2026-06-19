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
  view: 'founder',
  storageDisabled: forceStorageDisabled || !storageAvailable(),
  copyFallbackVisible: false,
  lastMessage: '',
}

const elements = {
  form: document.querySelector('#brand-form'),
  brandName: document.querySelector('#brand-name'),
  website: document.querySelector('#website'),
  category: document.querySelector('#category'),
  targetBuyer: document.querySelector('#target-buyer'),
  competitors: document.querySelector('#competitors'),
  competitorHint: document.querySelector('#competitor-hint'),
  brandNameError: document.querySelector('#brand-name-error'),
  websiteError: document.querySelector('#website-error'),
  categoryError: document.querySelector('#category-error'),
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
    const confirmed = window.confirm('Reset demo data and clear the saved AnswerRank brief from this browser?')
    if (!confirmed) return
    state.brief = null
    state.copyFallbackVisible = false
    clearErrors()
    fillForm({
      brandName: '',
      website: '',
      category: '',
      targetBuyer: '',
      objective: 'comparison',
      competitors: [],
    })
    if (!state.storageDisabled) clearSavedState()
    state.lastMessage = 'Reset complete. Start a new deterministic brief.'
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
  submit.textContent = 'Building deterministic brief...'

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
    brandName: elements.brandName.value,
    website: elements.website.value,
    category: elements.category.value,
    targetBuyer: elements.targetBuyer.value,
    objective: document.querySelector('input[name="objective"]:checked')?.value || 'comparison',
    competitors: elements.competitors.value
      .split('\n')
      .map((line, index) => parseCompetitor(line, index))
      .filter(Boolean),
  }
}

function parseCompetitor(line, index) {
  const raw = line.trim()
  if (!raw) return null
  const parts = raw.split(/[|,]/).map((part) => part.trim()).filter(Boolean)
  return {
    id: `competitor-${index + 1}`,
    name: parts[0],
    website: parts[1] || '',
  }
}

function fillForm(profile) {
  elements.brandName.value = profile.brandName || ''
  elements.website.value = profile.website || profile.normalizedDomain || ''
  elements.category.value = profile.category || ''
  elements.targetBuyer.value = profile.targetBuyer || ''
  const objectiveInput = document.querySelector(`input[name="objective"][value="${profile.objective || 'comparison'}"]`)
  if (objectiveInput) objectiveInput.checked = true
  elements.competitors.value = (profile.competitors || [])
    .map((competitor) => competitor.website ? `${competitor.name} | ${competitor.website}` : competitor.name)
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
    metricCard(`${brief.score.overall}`, `Overall visibility score - ${scoreBand(brief.score.overall)}`),
    metricCard(`${brief.findings.length}`, 'buyer prompts tested'),
    metricCard(`${brief.score.citationReadiness}`, 'citation readiness'),
    metricCard(`${brief.score.competitorPressure}`, 'competitor pressure'),
  ])

  replaceChildren(elements.summaryGrid, [
    summaryCard('Brand snapshot', `${brief.profile.brandName} in ${brief.profile.category} for ${brief.profile.targetBuyer || 'target buyers'}.`),
    summaryCard('Competitor gap', brief.summary.competitorGap),
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
    cell('Buyer question', prompt?.prompt || finding.promptId),
    statusCell(finding.status),
    cell('Intent', INTENT_GROUPS[prompt?.intentGroup] || prompt?.intentGroup || ''),
    cell('Source gap', SOURCE_GAPS[finding.likelySourceGap] || finding.likelySourceGap),
    cell('Recommended action', finding.recommendedAction),
  )
  if (finding.topCompetitors.length) {
    card.append(cell('Competitor pressure', finding.topCompetitors.join(', ')))
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
  label.textContent = 'Status'
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
  elements.brandNameError.textContent = validation.errors.brandName || ''
  elements.websiteError.textContent = validation.errors.website || ''
  elements.categoryError.textContent = validation.errors.category || ''
  elements.competitorHint.textContent = validation.notes.length
    ? validation.notes.join(' ')
    : 'Optional. Extra rows are ignored after the first 4.'
}

function clearErrors() {
  elements.brandNameError.textContent = ''
  elements.websiteError.textContent = ''
  elements.categoryError.textContent = ''
}

function setGenerateLabel() {
  const submit = elements.form.querySelector('button[type="submit"]')
  if (!submit.disabled) submit.textContent = state.brief ? 'Regenerate visibility brief' : 'Generate visibility brief'
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
