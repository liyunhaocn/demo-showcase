export const PRESETS = [
  {
    id: 'frontend-refactor-coverage',
    label: 'Frontend refactor',
    profile: {
      appName: 'Northstar Checkout',
      provider: 'GitHub Code Quality GA + Copilot code review',
      currentModel: 'Checkout UI refactor with auth, copy, and test changes',
      reviewModels: [
        'Checkout summary | payment flow | Frontend lead | critical',
        'Auth guard | protected route | Security owner | critical',
        'Visual regression | component library | Design QA | watch',
        'Test coverage | checkout tests | QA owner | watch',
        'Analytics event | funnel reporting | Growth lead | opportunity',
        'Docs update | release note | PM | no-action',
      ],
      workload: 'customer checkout repository',
      region: 'web app team',
      monthlyRequests: '6',
      objective: 'find-bottlenecks',
    },
  },
  {
    id: 'security-hotfix-coverage',
    label: 'Security hotfix',
    profile: {
      appName: 'Brightline Platform',
      provider: 'GitHub Code Quality + secret scanning + Copilot Autofix',
      currentModel: 'Security hotfix with policy, config, and remediation checks',
      reviewModels: [
        'Secrets exposure | env vars | Security | critical',
        'Policy bypass | auth middleware | Platform lead | critical',
        'Audit trail | sensitive action logs | Compliance | watch',
        'Fallback path | safe rollback | SRE | critical',
        'Customer comms | incident update | Support | opportunity',
        'Postmortem notes | action list | PM | no-action',
      ],
      workload: 'security patch and release workflow',
      region: 'platform team',
      monthlyRequests: '6',
      objective: 'reduce-failures',
    },
  },
  {
    id: 'dependency-upgrade-coverage',
    label: 'Dependency upgrade',
    profile: {
      appName: 'Harbor Analytics',
      provider: 'GitHub Copilot code review + agent apps',
      currentModel: 'Dependency upgrade with build, lint, and migration checks',
      reviewModels: [
        'Package bump | major version | Eng lead | critical',
        'Build cache | CI run | DevOps | watch',
        'Migration script | data update | Backend owner | critical',
        'Rollback plan | release branch | Release manager | watch',
        'Benchmark delta | perf test | Product engineer | opportunity',
        'Docs update | upgrade guide | PM | no-action',
      ],
      workload: 'service dependency upgrade',
      region: 'backend team',
      monthlyRequests: '6',
      objective: 'reduce-cost',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
