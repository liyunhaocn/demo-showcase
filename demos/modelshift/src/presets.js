export const PRESETS = [
  {
    id: 'b2b-saas',
    label: 'B2B SaaS',
    profile: {
      appName: 'Northstar Support',
      provider: 'OpenAI',
      currentModel: 'GPT-4.5',
      fallbackModels: ['GPT-5.5', 'Claude Opus 4.8', 'Claude Sonnet 4.5'],
      workload: 'customer support copilot and account triage',
      region: 'US and EU',
      monthlyRequests: '240000',
      objective: 'migrate-safely',
    },
  },
  {
    id: 'agent-team',
    label: 'Agent team',
    profile: {
      appName: 'Brightline Ops',
      provider: 'Anthropic',
      currentModel: 'Claude Opus 4.1',
      fallbackModels: ['Claude Opus 4.8', 'GPT-5.5', 'Gemini 2.5 Pro'],
      workload: 'multi-step document and workflow agents',
      region: 'Global',
      monthlyRequests: '180000',
      objective: 'preserve-quality',
    },
  },
  {
    id: 'enterprise',
    label: 'Enterprise internal',
    profile: {
      appName: 'Harbor Analytics',
      provider: 'OpenAI',
      currentModel: 'o3',
      fallbackModels: ['GPT-5.5', 'Claude Opus 4.8', 'Gemini 2.5 Pro'],
      workload: 'analysis assistants and internal reporting workflows',
      region: 'EU',
      monthlyRequests: '950000',
      objective: 'reduce-cost',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
