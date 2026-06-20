export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live model/provider monitoring.'

export const OBJECTIVES = [
  {
    id: 'migrate-safely',
    label: 'Handle deprecation safely',
  },
  {
    id: 'preserve-quality',
    label: 'Preserve output quality',
  },
  {
    id: 'reduce-cost',
    label: 'Reduce cost and complexity',
  },
]

export const INTENT_GROUPS = {
  'sunset-risk': 'Sunset risk',
  'fallback-routing': 'Fallback routing',
  'regression-coverage': 'Regression coverage',
  'vendor-choice': 'Vendor choice',
}

export const STATUS_LABELS = {
  ready: 'ready',
  watch: 'watch',
  risk: 'risk',
  urgent: 'urgent',
}

export const STATUS_WEIGHTS = {
  ready: 100,
  watch: 74,
  risk: 42,
  urgent: 12,
}

export const SOURCE_GAPS = {
  'release-notes': 'release notes',
  'fallback-policy': 'fallback policy',
  'eval-suite': 'eval suite',
  'prompt-contracts': 'prompt contracts',
  'region-policy': 'region policy',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy migration brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Model migration brief',
    framing: 'Focus on the fallback, eval, and rollout work this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy migration brief',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready model migration report',
    framing: 'Frame the findings as a concise migration audit for a client or leadership team.',
  },
}

export const DEFAULT_PROFILE = {
  appName: '',
  provider: '',
  currentModel: '',
  fallbackModels: [],
  workload: '',
  region: '',
  monthlyRequests: '',
  objective: 'migrate-safely',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'modelshift:lastBrief:v1',
  draftProfile: 'modelshift:draftProfile:v1',
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
  if (score >= 70) return 'Migration ready'
  if (score >= 40) return 'Needs guardrails'
  return 'High risk'
}
