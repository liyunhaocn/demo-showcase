export const PRESETS = [
  {
    id: 'b2b-saas',
    label: 'B2B SaaS',
    profile: {
      appName: 'Northstar Support',
      provider: 'Baseline: concise support prompt with policy guardrails',
      currentModel: 'Candidate: shorter prompt with stronger escalation rules',
      fallbackModels: ['Refund exception case', 'Angry customer escalation', 'Policy citation missing'],
      workload: 'customer support copilot and account triage',
      region: 'US and EU',
      monthlyRequests: '24',
      objective: 'migrate-safely',
    },
  },
  {
    id: 'agent-team',
    label: 'Agent team',
    profile: {
      appName: 'Brightline Ops',
      provider: 'Baseline: structured writing prompt with strict tone',
      currentModel: 'Candidate: fewer instructions and looser formatting',
      fallbackModels: ['Tool timeout case', 'Rewrite with exact tone', 'Format-preservation case'],
      workload: 'multi-step document and workflow agents',
      region: 'Global',
      monthlyRequests: '18',
      objective: 'preserve-quality',
    },
  },
  {
    id: 'enterprise',
    label: 'Enterprise internal',
    profile: {
      appName: 'Harbor Analytics',
      provider: 'Baseline: retrieval-heavy prompt with citation rules',
      currentModel: 'Candidate: faster prompt with shorter context window',
      fallbackModels: ['Stale source case', 'Hallucinated citation case', 'Missing answer case'],
      workload: 'analysis assistants and internal reporting workflows',
      region: 'EU',
      monthlyRequests: '95',
      objective: 'reduce-cost',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
