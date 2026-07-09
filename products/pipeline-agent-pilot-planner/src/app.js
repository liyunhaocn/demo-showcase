import { buildPilotPlan } from './model.mjs'

const storageKey = 'pipeline-agent-pilot-planner:last-report'
const params = new URLSearchParams(window.location.search)
const forceCopyFallback = params.get('copy') === 'fallback'
const storageDisabled = params.get('storage') === 'off'

const presets = {
  'stalled-deals': {
    orgName: 'Northstar Revenue',
    crmSystem: 'Salesforce Sales Cloud',
    segment: 'Mid-market outbound',
    objective: 'recover-stalled-deals',
    pipelineValue: '4200000',
    winRate: '24',
    cycleDays: '51',
    staleDeals: '31',
    dataQuality: 'good',
    ownerCoverage: 'named',
    compliancePosture: 'approval-needed',
    agentScope: 'next-best-action',
    blockers: 'security review, manager adoption',
  },
  'forecast-hygiene': {
    orgName: 'Atlas Expansion',
    crmSystem: 'Salesforce Revenue Cloud',
    segment: 'Enterprise renewals',
    objective: 'increase-forecast-confidence',
    pipelineValue: '8500000',
    winRate: '32',
    cycleDays: '76',
    staleDeals: '18',
    dataQuality: 'mixed',
    ownerCoverage: 'partial',
    compliancePosture: 'policy-ready',
    agentScope: 'forecast-hygiene',
    blockers: 'regional field naming',
  },
  'manager-coach': {
    orgName: 'Brightline Sales',
    crmSystem: 'HubSpot Enterprise',
    segment: 'Commercial inbound',
    objective: 'speed-rep-followup',
    pipelineValue: '1900000',
    winRate: '17',
    cycleDays: '34',
    staleDeals: '22',
    dataQuality: 'excellent',
    ownerCoverage: 'named',
    compliancePosture: 'approval-needed',
    agentScope: 'manager-coach',
    blockers: 'rep enablement',
  },
}

const state = {
  plan: null,
  view: 'revops',
}

const form = document.querySelector('#pilot-form')
const notice = document.querySelector('#notice-row')
const restoreBanner = document.querySelector('#restore-banner')
const restoreButton = document.querySelector('#restore-button')
const reportShell = document.querySelector('#report-shell')
const emptyState = document.querySelector('#empty-state')
const generatedAt = document.querySelector('#generated-at')
const scoreGrid = document.querySelector('#score-grid')
const summaryGrid = document.querySelector('#summary-grid')
const findingList = document.querySelector('#finding-list')
const gateList = document.querySelector('#gate-list')
const milestoneList = document.querySelector('#milestone-list')
const pricingList = document.querySelector('#pricing-list')
const copyButton = document.querySelector('#copy-button')
const downloadButton = document.querySelector('#download-button')
const fallbackButton = document.querySelector('#fallback-button')
const fallbackPanel = document.querySelector('#fallback-panel')
const markdownFallback = document.querySelector('#markdown-fallback')
const selectFallbackButton = document.querySelector('#select-fallback-button')
const closeFallbackButton = document.querySelector('#close-fallback-button')
const resetButton = document.querySelector('#reset-button')

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    fillForm(presets[button.dataset.preset])
    generate()
  })
})

document.querySelectorAll('[name="report-view"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.view = input.value
    render()
  })
})

form.addEventListener('submit', (event) => {
  event.preventDefault()
  generate()
})

resetButton.addEventListener('click', () => {
  form.reset()
  state.plan = null
  clearErrors()
  fallbackPanel.hidden = true
  markdownFallback.value = ''
  emptyState.hidden = false
  reportShell.hidden = true
  if (!storageDisabled) {
    safeStorage(() => localStorage.removeItem(storageKey))
  }
  showNotice('Demo reset. Choose a preset or enter a new CRM pilot scope.')
})

copyButton.addEventListener('click', async () => {
  if (!state.plan) return
  if (forceCopyFallback || !navigator.clipboard) {
    openFallback('Clipboard API unavailable or fallback mode requested.')
    return
  }

  try {
    await navigator.clipboard.writeText(state.plan.markdown)
    showNotice('Pilot brief copied to clipboard.')
  } catch {
    openFallback('Clipboard blocked. Use the manual Markdown buffer.')
  }
})

downloadButton.addEventListener('click', () => {
  if (!state.plan) return
  const slug = state.plan.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([state.plan.markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slug || 'pipeline-agent-pilot'}-brief.md`
  anchor.click()
  URL.revokeObjectURL(url)
  showNotice('Markdown brief downloaded.')
})

fallbackButton.addEventListener('click', () => openFallback('Manual copy buffer opened.'))
selectFallbackButton.addEventListener('click', () => {
  markdownFallback.focus()
  markdownFallback.select()
})
closeFallbackButton.addEventListener('click', () => {
  fallbackPanel.hidden = true
})

restoreButton.addEventListener('click', () => {
  if (storageDisabled) return
  const saved = safeStorage(() => localStorage.getItem(storageKey))
  if (!saved) return
  try {
    const values = JSON.parse(saved)
    fillForm(values)
    generate({ persist: false })
    restoreBanner.hidden = true
  } catch {
    showNotice('Saved report could not be restored.')
  }
})

if (storageDisabled) {
  showNotice('Storage-off mode is active. Reports will not be saved locally.')
} else {
  const saved = safeStorage(() => localStorage.getItem(storageKey))
  restoreBanner.hidden = !saved
}

fillForm(presets['stalled-deals'])

function generate(options = {}) {
  clearErrors()
  const values = readForm()
  const errors = validate(values)
  if (Object.keys(errors).length) {
    renderErrors(errors)
    showNotice('Add the missing pilot details before generating the brief.')
    return
  }

  state.plan = buildPilotPlan(values)
  if (!storageDisabled && options.persist !== false) {
    safeStorage(() => localStorage.setItem(storageKey, JSON.stringify(values)))
  }
  restoreBanner.hidden = true
  render()
  showNotice('Pilot brief generated from deterministic scoring rules.')
}

function render() {
  if (!state.plan) return

  const { input, score, summary, findings, milestones, pricing } = state.plan
  emptyState.hidden = true
  reportShell.hidden = false
  generatedAt.textContent = `Generated ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`

  scoreGrid.innerHTML = [
    scoreCard('Readiness', score.readiness, 'Agent pilot readiness', score.readiness >= 75 ? 'good' : 'watch'),
    scoreCard('ROI index', score.roiIndex, 'Commercial upside', score.roiIndex >= 80 ? 'good' : 'watch'),
    scoreCard('Risk', score.riskLevel, `${score.riskPoints} risk points`, score.riskLevel.toLowerCase()),
  ].join('')

  summaryGrid.innerHTML = [
    summaryCard('Pilot objective', summary.objective),
    summaryCard('Target users', summary.audience),
    summaryCard('Weekly lift proxy', `$${formatNumber(summary.weeklyLift)} qualified-pipeline movement`),
    summaryCard('Scope boundary', viewCopy(input.agentScope)),
  ].join('')

  findingList.innerHTML = findings.map((finding) => `
    <article class="list-card">
      <div>
        <strong>${finding.title}</strong>
        <span>${finding.status}</span>
      </div>
      <p>${finding.detail}</p>
    </article>
  `).join('')

  gateList.innerHTML = score.gates.map((gate, index) => `
    <article class="gate-item">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <p>${gate}</p>
    </article>
  `).join('')

  milestoneList.innerHTML = milestones.map((milestone) => `<div class="timeline-item">${milestone}</div>`).join('')
  pricingList.innerHTML = pricing.map((item) => `<div class="pricing-item">${item}</div>`).join('')
  markdownFallback.value = state.plan.markdown
}

function scoreCard(label, value, caption, tone) {
  return `
    <article class="score-card tone-${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${caption}</p>
    </article>
  `
}

function summaryCard(label, value) {
  return `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `
}

function readForm() {
  const values = Object.fromEntries(new FormData(form).entries())
  values.objective = form.querySelector('[name="objective"]:checked')?.value
  return values
}

function fillForm(values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements[key]
    if (!field) return
    if (field instanceof RadioNodeList) {
      const radio = [...field].find((item) => item.value === value)
      if (radio) radio.checked = true
      return
    }
    field.value = value
  })
}

function validate(values) {
  const errors = {}
  const required = ['orgName', 'crmSystem', 'segment']
  required.forEach((key) => {
    if (!String(values[key] ?? '').trim()) errors[key] = 'Required'
  })

  if (toNumber(values.pipelineValue) <= 0) errors.pipelineValue = 'Use a positive pipeline value'
  if (toNumber(values.winRate) <= 0 || toNumber(values.winRate) > 100) errors.winRate = 'Use 1-100'
  if (toNumber(values.cycleDays) <= 0) errors.cycleDays = 'Use a positive cycle length'
  if (toNumber(values.staleDeals) < 0) errors.staleDeals = 'Use zero or more'
  return errors
}

function renderErrors(errors) {
  const map = {
    orgName: '#org-name-error',
    crmSystem: '#crm-system-error',
    segment: '#segment-error',
    pipelineValue: '#pipeline-value-error',
    winRate: '#win-rate-error',
    cycleDays: '#cycle-days-error',
    staleDeals: '#stale-deals-error',
  }

  Object.entries(errors).forEach(([key, value]) => {
    const target = document.querySelector(map[key])
    if (target) target.textContent = value
  })
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach((item) => {
    item.textContent = ''
  })
}

function openFallback(message) {
  if (state.plan) markdownFallback.value = state.plan.markdown
  fallbackPanel.hidden = false
  showNotice(message)
  fallbackPanel.scrollIntoView({ block: 'nearest' })
}

function showNotice(message) {
  notice.textContent = message
  notice.hidden = false
}

function safeStorage(operation) {
  try {
    return operation()
  } catch {
    return null
  }
}

function viewCopy(scope) {
  if (state.view === 'exec') {
    return `${scope} with manager approval and weekly ROI review`
  }
  return `${scope} in sandbox or shadow mode before any CRM field changes`
}

function toNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}
