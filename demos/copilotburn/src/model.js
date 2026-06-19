export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live Copilot billing or usage data.'

export const STORAGE_KEYS = {
  lastBrief: 'copilotburn:lastBrief:v1',
  draftProfile: 'copilotburn:draftProfile:v1',
}

export const PLAN_LABELS = {
  individual: 'Individual',
  business: 'Business',
  enterprise: 'Enterprise',
}

export const OBJECTIVES = [
  {
    id: 'forecast',
    label: 'Forecast burn',
  },
  {
    id: 'budget',
    label: 'Stay under budget',
  },
  {
    id: 'governance',
    label: 'Prepare finance review',
  },
]

export const INTENT_GROUPS = {
  'usage-driver': 'Usage driver',
  'billing-control': 'Billing control',
  governance: 'Governance',
  'plan-fit': 'Plan fit',
}

export const STATUS_LABELS = {
  safe: 'safe',
  watch: 'watch',
  hot: 'hot',
  over: 'over',
}

export const STATUS_WEIGHTS = {
  safe: 100,
  watch: 72,
  hot: 42,
  over: 12,
}

export const COST_DRIVERS = {
  'seat-usage': 'seat usage',
  'review-scope': 'review scope',
  'model-mix': 'model mix',
  'budget-policy': 'budget policy',
  visibility: 'usage visibility',
  'repo-sprawl': 'repo sprawl',
  'pr-churn': 'PR churn',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy weekly burn brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Weekly Copilot burn brief',
    framing: 'Focus on the controls this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy weekly burn brief',
    downloadCta: 'Download client-ready cost report',
    reportTitle: 'Client-ready Copilot cost brief',
    framing: 'Frame the findings as a concise cost review for a client or leadership team.',
  },
}

export const DEFAULT_PROFILE = {
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
  createdAt: '',
}

export const EVENT_NAMES = {
  presetSelected: 'preset_selected',
  manualGenerateClicked: 'manual_generate_clicked',
  briefGenerated: 'brief_generated',
  founderViewSelected: 'founder_view_selected',
  consultantViewSelected: 'consultant_view_selected',
  briefCopied: 'brief_copied',
  markdownDownloaded: 'markdown_downloaded',
  restoreLastBriefClicked: 'restore_last_brief_clicked',
  resetDemoClicked: 'reset_demo_clicked',
}

export function scoreBand(score) {
  if (score >= 75) return 'Under control'
  if (score >= 45) return 'Watch closely'
  return 'At risk'
}
