export const SIMULATION_NOTICE = 'Demo simulation: deterministic results, no live AI/search monitoring.'

export const STORAGE_KEYS = {
  lastBrief: 'answerrank:lastBrief:v1',
  draftProfile: 'answerrank:draftProfile:v1',
}

export const OBJECTIVES = [
  {
    id: 'comparison',
    label: 'Win comparison answers',
  },
  {
    id: 'category',
    label: 'Appear in category recommendations',
  },
  {
    id: 'brand-defense',
    label: 'Defend brand questions',
  },
]

export const INTENT_GROUPS = {
  'category-recommendation': 'Category recommendation',
  comparison: 'Comparison',
  'problem-solution': 'Problem / solution',
  'brand-defense': 'Brand defense',
}

export const STATUS_LABELS = {
  cited: 'cited',
  mentioned: 'mentioned',
  mispositioned: 'mispositioned',
  missing: 'missing',
}

export const STATUS_WEIGHTS = {
  cited: 100,
  mentioned: 72,
  mispositioned: 38,
  missing: 12,
}

export const SOURCE_GAPS = {
  'comparison-page': 'comparison page',
  proof: 'proof',
  'structured-facts': 'structured facts',
  'technical-access': 'technical access',
  positioning: 'positioning',
}

export const VIEW_COPY = {
  founder: {
    label: 'Founder',
    copyCta: 'Copy weekly action brief',
    downloadCta: 'Download Markdown brief',
    reportTitle: 'Weekly AI answer action brief',
    framing: 'Focus on the pages and proof updates this team can ship this week.',
  },
  consultant: {
    label: 'Consultant',
    copyCta: 'Copy weekly action brief',
    downloadCta: 'Download client-ready report',
    reportTitle: 'Client-ready AI visibility diagnostic',
    framing: 'Frame the findings as a concise audit for a client, founder, or leadership team.',
  },
}

export const DEFAULT_PROFILE = {
  brandName: '',
  website: '',
  normalizedDomain: '',
  category: '',
  targetBuyer: '',
  objective: 'comparison',
  competitors: [],
  createdAt: '',
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
  if (score >= 70) return 'Strong foundation'
  if (score >= 40) return 'At risk'
  return 'Low visibility'
}
