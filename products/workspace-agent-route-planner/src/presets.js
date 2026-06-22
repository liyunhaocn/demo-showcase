export const PRESETS = [
  {
    id: 'github-copilot-route',
    label: 'GitHub Copilot app',
    profile: {
      appName: 'Northstar Engineering',
      provider: 'GitHub Copilot app GA + Agent Finder',
      currentModel: 'Copilot app general availability and per-user usage metrics',
      driftModels: [
        'PR summary | GitHub repo | Eng manager | opportunity',
        'CI flake triage | CI logs | Platform | critical',
        'Code review queue | pull requests | Tech lead | watch',
        'Release prep notes | Slack + docs | PM | opportunity',
        'Seat utilization | usage metrics | Ops | no-action',
        'Sensitive incident writeups | private docs | Security | critical',
      ],
      workload: 'engineering workflow routing',
      region: 'repo-connected workspace',
      monthlyRequests: '6',
      objective: 'route-repeatable-work',
    },
  },
  {
    id: 'chatgpt-workspace-agents',
    label: 'ChatGPT workspace agents',
    profile: {
      appName: 'Harbor Support',
      provider: 'ChatGPT Business workspace agents',
      currentModel: 'Workspace agents with app safeguards and shared publishing',
      driftModels: [
        'Ticket triage | Slack + CRM | Support lead | opportunity',
        'Customer recap | docs + email | CSM | watch',
        'Escalation handoff | private notes | Ops | critical',
        'Onboarding checklist | docs + calendar | PM | opportunity',
        'Billing follow-up | sheets + email | Finance | critical',
        'Weekly status note | docs + slack | Founder | no-action',
      ],
      workload: 'multi-step support and ops workflows',
      region: 'workspace automation',
      monthlyRequests: '6',
      objective: 'protect-sensitive-tasks',
    },
  },
  {
    id: 'claude-ops-route',
    label: 'Claude app + deprecations',
    profile: {
      appName: 'Brightline Ops',
      provider: 'Claude app release notes + model deprecations',
      currentModel: 'Opus 4.1 retirement, Fable 5 GA, and pricing changes',
      driftModels: [
        'Long memo draft | research + docs | Analyst | opportunity',
        'Policy summary | source docs | PM | watch',
        'Incident recap | logs + timeline | QA | critical',
        'Customer response | docs + email | Support | opportunity',
        'Migration note | release notes + checklist | Eng | watch',
        'Finance brief | tokens + pricing | Ops | critical',
      ],
      workload: 'analysis, writing, and migration work',
      region: 'global workspace',
      monthlyRequests: '6',
      objective: 'find-upside',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
