export const SIMULATION_NOTICE = 'Demo simulation: deterministic GitHub Code Quality rollout planning, no live API calls.'

export const INTENT_GROUPS = {
  'pilot-coverage': 'Pilot coverage',
  'budget-gate': 'Budget gate',
  'policy-gate': 'Policy gate',
  'rollout-view': 'Rollout view fit',
}

export const STATUS_LABELS = {
  critical: 'Hold rollout',
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
  'owner-map': 'Assign a repo owner before rollout',
  'budget-cap': 'Set an active committer budget',
  'policy-review': 'Confirm code review and Autofix policy',
  'rollout-view': 'Align the rollout view',
  'security-gate': 'Add a security review gate',
  'enablement-note': 'Add a rollout note before enabling',
  'coverage-gap': 'Add a pilot coverage note',
}

export const VIEW_COPY = {
  founder: {
    reportTitle: 'Rollout lead brief',
    framing: 'Enable Code Quality first on repos that already have owners, budgets, and review gates.',
    copyCta: 'Copy rollout plan',
    downloadCta: 'Download client-ready report',
  },
  consultant: {
    reportTitle: 'Rollout engineer brief',
    framing: 'Treat this as a rollout and budget problem: pilot the ready repos, gate the risky ones, and delay the noisy ones.',
    copyCta: 'Copy rollout plan',
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
  objective: 'reduce-rollout-risk',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'codequalityrolloutplanner:lastBrief:v1',
  draftProfile: 'codequalityrolloutplanner:draftProfile:v1',
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
  if (score >= 80) return 'Rollout ready'
  if (score >= 55) return 'Needs routing'
  return 'Needs cleanup'
}
