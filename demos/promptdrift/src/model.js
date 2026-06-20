export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live prompt/model regression monitoring.'

export const OBJECTIVES = [
  {
    id: 'migrate-safely',
    label: 'Catch prompt drift early',
  },
  {
    id: 'preserve-quality',
    label: 'Preserve tone and format',
  },
  {
    id: 'reduce-cost',
    label: 'Block risky releases',
  },
]

export const INTENT_GROUPS = {
  'sunset-risk': 'Prompt drift',
  'drift-routing': 'Prompt contrast',
  'regression-coverage': 'Eval coverage',
  'vendor-choice': 'Release gate',
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
  'drift-policy': 'prompt contract',
  'eval-suite': 'eval suite',
  'prompt-contracts': 'prompt contracts',
  'region-policy': 'region policy',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy drift brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Prompt regression brief',
    framing: 'Focus on the drift, eval, and rollout work this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy drift brief',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready prompt regression report',
    framing: 'Frame the findings as a concise drift audit for a client or leadership team.',
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
  objective: 'migrate-safely',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'promptdrift:lastBrief:v1',
  draftProfile: 'promptdrift:draftProfile:v1',
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
  if (score >= 70) return 'Release safe'
  if (score >= 40) return 'Needs review'
  return 'Block release'
}
