export const SIMULATION_NOTICE = 'Demo simulation: deterministic browser tool safety planning, no live API calls.'

export const INTENT_GROUPS = {
  'safe-coverage': 'Safe coverage',
  'budget-gate': 'Budget gate',
  'policy-gate': 'Policy gate',
  'browser-execution': 'Browser execution fit',
}

export const STATUS_LABELS = {
  critical: 'Hold browser access',
  watch: 'Needs owner',
  opportunity: 'Ready to enable',
  'no-action': 'Already covered',
}

export const STATUS_WEIGHTS = {
  critical: 5,
  watch: 3,
  opportunity: 1,
  'no-action': 0,
}

export const SOURCE_GAPS = {
  'owner-map': 'Assign a browser task owner before the safety review',
  'budget-cap': 'Set an active session budget',
  'policy-review': 'Confirm browser policy and extension policy',
  'browser-execution': 'Align the browser board',
  'security-gate': 'Add a security review gate',
  'enablement-note': 'Add a safety note before enabling',
  'coverage-gap': 'Add a safety coverage note',
}

export const VIEW_COPY = {
  founder: {
    reportTitle: 'Browser safety lead brief',
    framing: 'Enable browser tools first on tasks that already have owners, budgets, and review gates.',
    copyCta: 'Copy safety scan',
    downloadCta: 'Download client-ready report',
  },
  consultant: {
    reportTitle: 'Browser engineer brief',
    framing: 'Treat this as a safety and budget problem: safe the ready tasks, gate the risky ones, and delay the noisy ones.',
    copyCta: 'Copy safety scan',
    downloadCta: 'Download client-ready report',
  },
}

export const DEFAULT_PROFILE = {
  appName: '',
  provider: '',
  currentModel: '',
  workload: '',
  region: '',
  monthlyRequests: '',
  objective: 'reduce-browser-risk',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'browser-tool-safety-planner:lastBrief:v1',
  draftProfile: 'browser-tool-safety-planner:draftProfile:v1',
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
  if (score >= 80) return 'Safe ready'
  if (score >= 55) return 'Needs routing'
  return 'Needs cleanup'
}
