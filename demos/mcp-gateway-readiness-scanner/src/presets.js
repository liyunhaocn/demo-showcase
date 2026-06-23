export const PRESETS = [
  {
    id: 'copilot-agent-gateway',
    label: 'GitHub Copilot run',
    profile: {
      appName: 'Northstar Engineering',
      provider: 'GitHub Copilot app GA + Agent Finder',
      currentModel: 'Copilot agent run with repo actions and usage metrics',
      driftModels: [
        'PR summary | repo gateway | Eng manager | opportunity',
        'CI flake triage | retry loop | Platform | critical',
        'Code review lane | pull request gateway | Tech lead | watch',
        'Runbook handoff | Slack + docs | Ops | critical',
        'Seat utilization | usage metrics | Finance | no-action',
        'Sensitive incident notes | private docs | Security | critical',
      ],
      workload: 'engineering workflow tracing',
      region: 'repo-connected workspace',
      monthlyRequests: '6',
      objective: 'find-bottlenecks',
    },
  },
  {
    id: 'anthropic-agent-sdk-gateway',
    label: 'Claude Agent SDK',
    profile: {
      appName: 'Brightline Ops',
      provider: 'Anthropic Agent SDK + OpenTelemetry',
      currentModel: 'Agent SDK hooks, OTEL gateways, and tool call checkpoints',
      driftModels: [
        'Document writer | long context gateway | PMM | watch',
        'Research summary | eval output | Analyst | opportunity',
        'Workflow agent | tool retry loop | Eng | critical',
        'Safety review | policy hooks | QA | critical',
        'Client brief | citation replay | CS | watch',
        'Audit log | owner checklist | Ops | no-action',
      ],
      workload: 'multi-step document and workflow agents',
      region: 'global workspace',
      monthlyRequests: '6',
      objective: 'reduce-failures',
    },
  },
  {
    id: 'mcp-observability-flow',
    label: 'MCP workflow gateway',
    profile: {
      appName: 'Harbor Automations',
      provider: 'MCP server gateway feed',
      currentModel: 'Tool call gateways, handoffs, and manual decision points',
      driftModels: [
        'Browser fetch | selector gateway | Ops | watch',
        'Customer support reply | escalation path | Support lead | critical',
        'MCP tool action | retry budget | Eng | opportunity',
        'Approval step | human checkpoint | Founder | critical',
        'Export brief | replay checklist | PM | watch',
        'Session archive | gateway digest | QA | no-action',
      ],
      workload: 'multi-agent MCP workflows',
      region: 'automation workspace',
      monthlyRequests: '6',
      objective: 'reduce-cost',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
