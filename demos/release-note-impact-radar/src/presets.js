export const PRESETS = [
  {
    id: 'openai-business-updates',
    label: 'OpenAI notes',
    profile: {
      appName: 'Northstar Support',
      provider: 'OpenAI release notes',
      currentModel: 'GPT-4.5 retirement + ChatGPT Sites preview',
      driftModels: [
        'Support replies | structured output | Support lead | critical',
        'Knowledge search | citations | Platform | watch',
        'Escalation handoff | tool calling | Ops | critical',
        'Weekly summary | release notes feed | PM | opportunity',
        'Response export | clipboard + markdown | QA | watch',
        'Prompt audit trail | versioned prompt | Eng | no-action',
      ],
      workload: 'customer support copilot',
      region: 'workspace release gate',
      monthlyRequests: '6',
      objective: 'prevent-breakage',
    },
  },
  {
    id: 'anthropic-deprecations',
    label: 'Anthropic notes',
    profile: {
      appName: 'Brightline Ops',
      provider: 'Anthropic release notes',
      currentModel: 'Claude Fable 5 launch + Sonnet 4 deprecation',
      driftModels: [
        'Doc writer | tone consistency | PMM | watch',
        'Research summary | long context | Analyst | opportunity',
        'Workflow agent | tool calling | Eng | critical',
        'Safety review | policy notes | QA | critical',
        'Client brief | citation rule | CS | watch',
        'Audit log | owner checklist | Ops | no-action',
      ],
      workload: 'multi-step document and workflow agents',
      region: 'global workspace',
      monthlyRequests: '6',
      objective: 'prevent-breakage',
    },
  },
  {
    id: 'copilot-agent-surface',
    label: 'GitHub Copilot notes',
    profile: {
      appName: 'Harbor Analytics',
      provider: 'GitHub Copilot changelog',
      currentModel: 'Agent Finder, usage metrics API, and billing updates',
      driftModels: [
        'Agent catalog | ARD registry | Platform | opportunity',
        'Usage forecast | credit metrics | Finance | critical',
        'Code review lane | AGENTS.md support | Eng | watch',
        'Workspace guide | billing guardrails | Ops | critical',
        'Release digest | change summary | PM | watch',
        'Adoption note | team rollout checklist | CS | no-action',
      ],
      workload: 'Copilot and agent workflows',
      region: 'organization release gate',
      monthlyRequests: '6',
      objective: 'spot-opportunities',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
