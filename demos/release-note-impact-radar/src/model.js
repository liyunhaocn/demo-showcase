export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live release-note monitoring.'

export const OBJECTIVES = [
  {
    id: 'prevent-breakage',
    label: 'Protect release gates',
  },
  {
    id: 'spot-opportunities',
    label: 'Spot upgrade opportunities',
  },
  {
    id: 'reduce-noise',
    label: 'Reduce alert noise',
  },
]

export const INTENT_GROUPS = {
  'deprecation-risk': 'Deprecation risk',
  'upgrade-opportunity': 'Upgrade opportunity',
  'inventory-coverage': 'Inventory coverage',
  'owner-checklist': 'Owner checklist',
}

export const STATUS_LABELS = {
  critical: 'critical',
  watch: 'watch',
  opportunity: 'opportunity',
  'no-action': 'no action',
}

export const STATUS_WEIGHTS = {
  critical: 12,
  watch: 58,
  opportunity: 82,
  'no-action': 98,
}

export const SOURCE_GAPS = {
  'release-note-source': 'release note source',
  'feature-inventory': 'feature inventory',
  'owner-map': 'owner map',
  'validation-plan': 'validation plan',
  'rollback-plan': 'rollback plan',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy impact brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Release note impact brief',
    framing: 'Focus on the impacts, owners, and checks this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy impact brief',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready release note impact report',
    framing: 'Frame the findings as a concise impact audit for a client or leadership team.',
  },
}

export const DEFAULT_PROFILE = {
  appName: '',
  provider: '',
  currentModel: '',
  driftModels: [],
  workload: '',
  region: '',
  monthlyRequests: '',
  objective: 'prevent-breakage',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'releasenoteradar:lastBrief:v1',
  draftProfile: 'releasenoteradar:draftProfile:v1',
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
  if (score >= 70) return 'Ready to brief'
  if (score >= 40) return 'Needs review'
  return 'Block release'
}
