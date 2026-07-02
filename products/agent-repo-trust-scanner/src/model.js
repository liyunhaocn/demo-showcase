export const SIMULATION_NOTICE = 'Demo simulation: deterministic Agent repo trust scanning, no live API calls.'

export const INTENT_GROUPS = {
  'pilot-coverage': 'Pilot coverage',
  'budget-gate': 'Budget gate',
  'policy-gate': 'Policy gate',
  'rollout-view': 'Trust board fit',
}

export const STATUS_LABELS = {
  critical: 'Hold trust lane',
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
  'owner-map': 'Assign a repo owner before the trust review',
  'budget-cap': 'Set an active committer budget',
  'policy-review': 'Confirm code review and Autofix policy',
  'rollout-view': 'Align the trust board',
  'security-gate': 'Add a security review gate',
  'enablement-note': 'Add a trust note before enabling',
  'coverage-gap': 'Add a trust coverage note',
}

export const VIEW_COPY = {
  founder: {
    reportTitle: 'Trust lead brief',
    framing: 'Enable Code Quality first on repos that already have owners, budgets, and review gates.',
    copyCta: 'Copy trust scan',
    downloadCta: 'Download client-ready report',
  },
  consultant: {
    reportTitle: 'Platform engineer brief',
    framing: 'Treat this as a trust and budget problem: pilot the ready repos, gate the risky ones, and delay the noisy ones.',
    copyCta: 'Copy trust scan',
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
  objective: 'reduce-trust-risk',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'agentrepotrustscanner:lastBrief:v1',
  draftProfile: 'agentrepotrustscanner:draftProfile:v1',
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
  if (score >= 80) return 'Trust ready'
  if (score >= 55) return 'Needs routing'
  return 'Needs cleanup'
}
