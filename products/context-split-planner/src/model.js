export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live split monitoring.'

export const OBJECTIVES = [
  {
    id: 'split-large-task',
    label: 'Split large task',
  },
  {
    id: 'reduce-context-risk',
    label: 'Reduce context risk',
  },
  {
    id: 'reduce-handoff-friction',
    label: 'Reduce handoff friction',
  },
]

export const INTENT_GROUPS = {
  'split-source': 'Context source',
  'context-pressure': 'Context pressure',
  'handoff-gap': 'Handoff gap',
  'handoff-plan': 'Handoff plan',
}

export const STATUS_LABELS = {
  critical: 'manual',
  watch: 'review',
  opportunity: 'recommended',
  'no-action': 'ready',
}

export const STATUS_WEIGHTS = {
  critical: 12,
  watch: 58,
  opportunity: 82,
  'no-action': 98,
}

export const SOURCE_GAPS = {
  'split-source': 'context source',
  'split-inventory': 'context inventory',
  'owner-map': 'owner map',
  'handoff-plan': 'handoff plan',
  'threshold-plan': 'threshold plan',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy split plan',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Split planning brief',
    framing: 'Focus on the context boundary, owners, and handoff checklist this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy split plan',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready split report',
    framing: 'Frame the findings as a concise context split audit for a client or leadership team.',
  },
}

export const DEFAULT_PROFILE = {
  appName: '',
  provider: '',
  currentModel: '',
  reviewModels: [],
  workload: '',
  region: '',
  monthlyRequests: '',
  objective: 'split-large-task',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'contextsplitplanner:lastBrief:v1',
  draftProfile: 'contextsplitplanner:draftProfile:v1',
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
  if (score >= 78) return 'Split ready'
  if (score >= 50) return 'Needs review'
  return 'Needs fresh start'
}
