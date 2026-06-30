export const PRESETS = [
  {
    id: 'pilot-rollout',
    label: 'Pilot rollout',
    profile: {
      appName: 'Pilot repos',
      provider: 'GitHub Code Quality GA and Copilot code review controls',
      currentModel: 'Enable code quality on repos with owner and review coverage before the pricing change lands',
      reviewModels: [
        'checkout-service | ready for pilot | Platform owner | opportunity',
        'payments-api | missing owner gate | Backend lead | watch',
        'docs-site | already covered | Docs owner | no-action',
        'mobile-app | security review pending | Mobile owner | critical',
        'design-system | autofix off by policy | Frontend owner | watch',
        'search-service | pilot-ready | Search owner | opportunity',
      ],
      workload: 'repository fleet',
      region: 'platform and engineering',
      monthlyRequests: '6',
      objective: 'reduce-rollout-risk',
    },
  },
  {
    id: 'budget-guard',
    label: 'Budget guard',
    profile: {
      appName: 'Budget guard',
      provider: 'AI usage metrics, cost centers, and code quality pricing',
      currentModel: 'Keep code quality adoption inside a predictable budget for active committers and review minutes',
      reviewModels: [
        'monorepo-core | active committer spike | Platform owner | critical',
        'billing-service | budget cap needed | FinOps owner | watch',
        'customer-support | low-risk pilot | Support owner | opportunity',
        'release-branch | already routed | Release owner | no-action',
        'ops-tooling | review minutes unclear | DevEx owner | watch',
        'analytics-pipeline | high-change repo | Data owner | critical',
      ],
      workload: 'billing and rollout queue',
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
      provider: 'strictKnownMarketplaces, Copilot code review, and security validation',
      currentModel: 'Enable Code Quality only where policy, owner, and security gates are already in place',
      reviewModels: [
        'security-agent | marketplace policy unclear | Security owner | critical',
        'infra-adapter | review gate present | Infra owner | opportunity',
        'admin-console | owner missing | Platform owner | watch',
        'customer-portal | already covered | Product owner | no-action',
        'sdk-client | security review required | SDK owner | critical',
        'ops-dashboard | rollout view needs cleanup | Ops owner | watch',
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
