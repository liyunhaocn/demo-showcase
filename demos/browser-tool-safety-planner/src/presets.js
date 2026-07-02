export const PRESETS = [
  {
    id: 'browser-task-lane',
    label: 'Browser task lane',
    profile: {
      appName: 'Browser task lane',
      provider: 'GitHub Copilot browser tools GA and browser-task safety checks',
      currentModel: 'Enable browser tools only on tasks with owner coverage, policy gates, and review baselines before the browser lane widens',
      reviewModels: [
        'checkout-service | ready for safe pilot | Platform owner | opportunity',
        'payments-api | missing execution gate | Backend lead | watch',
        'docs-site | already covered | Docs owner | no-action',
        'mobile-app | security review pending | Mobile owner | critical',
        'design-system | autofix off by policy | Frontend owner | watch',
        'search-service | safe-ready | Search owner | opportunity',
      ],
      workload: 'browser task fleet',
      region: 'platform and engineering',
      monthlyRequests: '6',
      objective: 'reduce-browser-risk',
    },
  },
  {
    id: 'budget-guard',
    label: 'Budget guard',
    profile: {
      appName: 'Budget guard',
      provider: 'AI usage metrics, cost centers, and browser tools pricing',
      currentModel: 'Keep browser tools adoption inside a predictable budget for active sessions and review minutes',
      reviewModels: [
        'monorepo-core | active committer spike | Platform owner | critical',
        'billing-service | budget cap needed | FinOps owner | watch',
        'customer-support | low-risk safe | Support owner | opportunity',
        'release-branch | already routed | Release owner | no-action',
        'ops-tooling | review minutes unclear | DevEx owner | watch',
        'analytics-pipeline | high-change repo | Data owner | critical',
      ],
      workload: 'billing and safety queue',
      region: 'engineering finance and platform',
      monthlyRequests: '6',
      objective: 'control-budget',
    },
  },
  {
    id: 'policy-ready',
    label: 'Policy ready',
    profile: {
      appName: 'Policy ready',
      provider: 'Strict marketplaces, browser tools, and security validation',
      currentModel: 'Enable browser tools only where policy, owner, and security gates are already in place',
      reviewModels: [
        'security-agent | marketplace policy unclear | Security owner | critical',
        'infra-adapter | review gate present | Infra owner | opportunity',
        'admin-console | owner missing | Platform owner | watch',
        'customer-portal | already covered | Product owner | no-action',
        'sdk-client | security review required | SDK owner | critical',
        'ops-dashboard | safety board needs cleanup | Ops owner | watch',
      ],
      workload: 'policy and enablement board',
      region: 'security and platform engineering',
      monthlyRequests: '6',
      objective: 'policy-ready',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
