export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live trace monitoring.'

export const OBJECTIVES = [
  {
    id: 'find-bottlenecks',
    label: 'Find bottlenecks',
  },
  {
    id: 'reduce-failures',
    label: 'Reduce failures',
  },
  {
    id: 'reduce-cost',
    label: 'Reduce cost',
  },
]

export const INTENT_GROUPS = {
  'trace-source': 'Trace source',
  'failure-mode': 'Failure mode',
  'handoff-gap': 'Handoff gap',
  'replay-plan': 'Replay plan',
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
  'trace-source': 'trace source',
  'span-inventory': 'trace inventory',
  'owner-map': 'owner map',
  'replay-plan': 'replay plan',
  'threshold-plan': 'threshold plan',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy trace brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Agent trace brief',
    framing: 'Focus on the bottlenecks, owners, and replay checks this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy trace brief',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready agent trace report',
    framing: 'Frame the findings as a concise observability audit for a client or leadership team.',
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
  objective: 'find-bottlenecks',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'agenttraceconsole:lastBrief:v1',
  draftProfile: 'agenttraceconsole:draftProfile:v1',
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
  if (score >= 78) return 'Trace ready'
  if (score >= 50) return 'Needs review'
  return 'Needs replay'
}
