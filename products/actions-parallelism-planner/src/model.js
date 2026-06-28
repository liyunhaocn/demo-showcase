export const SIMULATION_NOTICE = 'Demo simulation: deterministic GitHub Actions parallelization planning, no live workflow analysis.'

export const INTENT_GROUPS = {
  'parallel-opportunity': 'Parallel opportunity',
  'sequence-gate': 'Sequence gate',
  'owner-checkpoint': 'Owner checkpoint',
  'cancel-plan': 'Cancel / rollback plan',
}

export const STATUS_LABELS = {
  critical: 'Serial gate',
  watch: 'Needs wait / gate',
  opportunity: 'Parallel-safe',
  'no-action': 'Already safe',
}

export const STATUS_WEIGHTS = {
  critical: 5,
  watch: 3,
  opportunity: 1,
  'no-action': 0,
}

export const SOURCE_GAPS = {
  'parallel-lane': 'Can split into a background lane',
  'release-gate': 'Keep this step serial',
  'owner-map': 'Missing owner or approver',
  'log-fanout': 'Split logs or group the output',
  'wait-link': 'Add wait / wait-all link',
  'cancel-path': 'Add a cancel or rollback path',
}

export const VIEW_COPY = {
  founder: {
    reportTitle: 'Release lead brief',
    framing: 'Use the critical rows first and protect release gates before parallelizing further.',
    copyCta: 'Copy parallel plan',
    downloadCta: 'Download client-ready report',
  },
  consultant: {
    reportTitle: 'Workflow engineer brief',
    framing: 'Treat this as a step-graph review: isolate safe background work, then keep the gate serial.',
    copyCta: 'Copy parallel plan',
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
  objective: 'speed-up-ci',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'actionsparallelismplanner:lastBrief:v1',
  draftProfile: 'actionsparallelismplanner:draftProfile:v1',
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
  if (score >= 80) return 'Parallel ready'
  if (score >= 55) return 'Needs gating'
  return 'Needs sequencing'
}
