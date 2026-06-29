export const SIMULATION_NOTICE = 'Demo simulation: deterministic GitHub issue triage planning, no live GitHub API calls.'

export const INTENT_GROUPS = {
  'dedupe-cluster': 'Duplicate cluster',
  'field-gap': 'Field gap',
  'owner-gate': 'Owner gate',
  'saved-view': 'Saved view fit',
}

export const STATUS_LABELS = {
  critical: 'Duplicate cluster',
  watch: 'Needs owner',
  opportunity: 'Ready to route',
  'no-action': 'Already covered',
}

export const STATUS_WEIGHTS = {
  critical: 5,
  watch: 3,
  opportunity: 1,
  'no-action': 0,
}

export const SOURCE_GAPS = {
  'duplicate-link': 'Link the duplicate to the canonical issue',
  'field-gap': 'Normalize missing issue fields',
  'owner-map': 'Missing owner or triage assignee',
  'saved-view': 'Saved view not aligned to the queue',
  'mcp-fields': 'Push issue fields through MCP',
  'dedupe-note': 'Add a dedupe note before the next sweep',
}

export const VIEW_COPY = {
  founder: {
    reportTitle: 'Triage lead brief',
    framing: 'Collapse duplicate clusters first, then normalize fields and owner coverage before the next sweep.',
    copyCta: 'Copy triage plan',
    downloadCta: 'Download client-ready report',
  },
  consultant: {
    reportTitle: 'Triage engineer brief',
    framing: 'Treat this as a field-routing problem: collapse duplicates, then lock owner and view coverage.',
    copyCta: 'Copy triage plan',
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
  objective: 'reduce-duplicate-load',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'issuetriagefieldplanner:lastBrief:v2',
  draftProfile: 'issuetriagefieldplanner:draftProfile:v2',
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
  if (score >= 80) return 'Triage ready'
  if (score >= 55) return 'Needs routing'
  return 'Needs cleanup'
}
