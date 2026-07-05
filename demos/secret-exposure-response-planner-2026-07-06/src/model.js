export const SIMULATION_NOTICE = 'Demo simulation: deterministic secret exposure response planning, no live API calls.'

export const INTENT_GROUPS = {
  containment: 'Containment',
  rotation: 'Rotation',
  comms: 'Comms',
  evidence: 'Evidence',
}

export const STATUS_LABELS = {
  critical: 'Contain now',
  watch: 'Needs owner',
  contained: 'Contained',
  clean: 'Already covered',
}

export const STATUS_WEIGHTS = {
  critical: 5,
  watch: 3,
  contained: 1,
  clean: 0,
}

export const SOURCE_GAPS = {
  'owner-map': 'Assign an incident owner before the next review',
  rotation: 'Rotate and revoke the exposed secret first',
  comms: 'Prepare the internal and external notification path',
  containment: 'Confirm blast-radius containment before widening access',
  evidence: 'Attach evidence for the alert and scope',
  logging: 'Keep logs and traceability on the incident record',
}

export const VIEW_COPY = {
  'security-lead': {
    reportTitle: 'Security lead brief',
    framing: 'Contain the secret first, then rotate it, then publish the owner checklist.',
    copyCta: 'Copy incident brief',
    downloadCta: 'Download client-ready report',
  },
  'incident-commander': {
    reportTitle: 'Incident commander brief',
    framing: 'Treat the alert as an operating problem: contain the blast radius, map owners, and keep comms explicit.',
    copyCta: 'Copy incident brief',
    downloadCta: 'Download client-ready report',
  },
}

export const DEFAULT_PROFILE = {
  incidentName: '',
  alertSource: '',
  secretType: '',
  exposureSurface: '',
  owningTeam: '',
  alertAgeHours: '',
  objective: 'contain-fast',
  createdAt: '',
}

export const STORAGE_KEYS = {
  lastBrief: 'secret-exposure-response-planner:lastBrief:v1',
  draftProfile: 'secret-exposure-response-planner:draftProfile:v1',
}

export const EVENT_NAMES = {
  presetSelected: 'preset_selected',
  manualGenerateClicked: 'manual_generate_clicked',
  briefGenerated: 'brief_generated',
  securityLeadViewSelected: 'security_lead_view_selected',
  incidentCommanderViewSelected: 'incident_commander_view_selected',
  briefCopied: 'brief_copied',
  markdownDownloaded: 'markdown_downloaded',
  restoreLastBriefClicked: 'restore_last_brief_clicked',
  resetDemoClicked: 'reset_demo_clicked',
}

export function scoreBand(score) {
  if (score >= 80) return 'Contained'
  if (score >= 55) return 'Needs action'
  return 'At risk'
}
