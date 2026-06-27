export const PRESETS = [
  {
    id: 'large-refactor-split',
    label: 'Large refactor',
    profile: {
      appName: 'Payments refactor',
      provider: 'GPT-5.6 Sol ultra mode + GitHub agent finder',
      currentModel: 'Checkout refactor with auth, tests, and docs across two sessions',
      reviewModels: [
        'Checkout flow | 17 touched files | Lead engineer | critical',
        'Auth guard | login edge cases | Security owner | critical',
        'Session summary | open questions list | PM | watch',
        'Test rerun | flaky suite | QA owner | watch',
        'Docs handoff | release brief | Tech lead | opportunity',
        'Rollback note | safe restore path | SRE | no-action',
      ],
      workload: 'customer checkout repo',
      region: 'web platform team',
      monthlyRequests: '74',
      objective: 'split-large-task',
    },
  },
  {
    id: 'incident-rescue-split',
    label: 'Incident rescue',
    profile: {
      appName: 'Status page incident',
      provider: 'OpenAI GPT-5.6 Sol + team Slack handoff',
      currentModel: 'Debug a production incident with partial logs and unclear ownership',
      reviewModels: [
        'Error spike | unknown root cause | Incident commander | critical',
        'Repro steps | missing environment detail | Support | critical',
        'Log bundle | trace ids | SRE | watch',
        'Comms draft | customer update | Ops lead | opportunity',
        'Next-owner note | on-call assignment | PM | critical',
        'Runbook link | recovery checklist | QA | no-action',
      ],
      workload: 'incident response thread',
      region: 'ops team',
      monthlyRequests: '88',
      objective: 'reduce-context-risk',
    },
  },
  {
    id: 'greenfield-kickoff-split',
    label: 'Greenfield kickoff',
    profile: {
      appName: 'Agent onboarding sprint',
      provider: 'Claude Opus 4.8 + GitHub Copilot',
      currentModel: 'Kick off a new agent task with many constraints and competing suggestions',
      reviewModels: [
        'Goal note | single-sentence brief | Founder | critical',
        'Acceptance bar | scope fence | PM | critical',
        'Reference links | sample output | Design | watch',
        'Unknowns list | blockers | Tech lead | critical',
        'Parallel helper | first pass skeleton | Agent | opportunity',
        'Review plan | merge back checklist | Reviewer | no-action',
      ],
      workload: 'new product build thread',
      region: 'founding team',
      monthlyRequests: '62',
      objective: 'reduce-handoff-friction',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
