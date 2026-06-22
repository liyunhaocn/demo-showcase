export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live agent discovery.'

export const OBJECTIVES = [
  {
    id: 'route-repeatable-work',
    label: 'Route repeatable work',
  },
  {
    id: 'protect-sensitive-tasks',
    label: 'Protect sensitive tasks',
  },
  {
    id: 'find-upside',
    label: 'Find rollout upside',
  },
]

export const INTENT_GROUPS = {
  'agent-fit': 'Agent fit',
  'workflow-routing': 'Workflow routing',
  'access-check': 'Access check',
  'rollout-plan': 'Rollout plan',
}

export const STATUS_LABELS = {
  critical: 'manual',
  watch: 'review',
  opportunity: 'recommended',
  'no-action': 'auto-route',
}

export const STATUS_WEIGHTS = {
  critical: 14,
  watch: 60,
  opportunity: 84,
  'no-action': 98,
}

export const SOURCE_GAPS = {
  'signal-source': 'signal source',
  'task-inventory': 'task inventory',
  'owner-map': 'owner map',
  'access-plan': 'access plan',
  'rollout-plan': 'rollout plan',
}

export const VIEW_COPY = {
  operator: {
    label: 'Operator',
    copyCta: 'Copy route plan',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Workspace agent route plan',
    framing: 'Use the matrix to route work to the right agent surface before the team rolls out.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy route plan',
    downloadCta: 'Download rollout brief',
    reportTitle: 'Client-ready workspace agent route report',
    framing: 'Frame the findings as a concise rollout plan for leadership or a client team.',
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
  objective: 'route-repeatable-work',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'workspaceagentroute:lastBrief:v1',
  draftProfile: 'workspaceagentroute:draftProfile:v1',
}

export const EVENT_NAMES = {
  presetSelected: 'preset_selected',
  manualGenerateClicked: 'manual_generate_clicked',
  briefGenerated: 'brief_generated',
  founderViewSelected: 'operator_view_selected',
  consultantViewSelected: 'consultant_view_selected',
  briefCopied: 'brief_copied',
  markdownDownloaded: 'markdown_downloaded',
  restoreLastBriefClicked: 'restore_last_brief_clicked',
  resetDemoClicked: 'reset_demo_clicked',
}

export function scoreBand(score) {
  if (score >= 78) return 'Route ready'
  if (score >= 50) return 'Needs review'
  return 'Hold rollout'
}
