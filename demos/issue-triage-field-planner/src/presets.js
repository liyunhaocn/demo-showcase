export const PRESETS = [
  {
    id: 'bug-burst-dedupe',
    label: 'Bug burst',
    profile: {
      appName: 'Public bug queue',
      provider: 'GitHub Issues fields and duplicate preview',
      currentModel: 'Collapse duplicate bug reports into one canonical issue and assign missing owners',
      reviewModels: [
        'Crash on login | duplicate of issue 1842 | Backend owner | critical',
        'Auth timeout | flaky reproduction | QA owner | watch',
        'Dashboard label mismatch | needs severity field | Product owner | opportunity',
        'Payment redirect loop | duplicate cluster | Release owner | critical',
        'Docs typo | already routed | Docs owner | no-action',
        'Search filter bug | missing area field | Frontend owner | watch',
      ],
      workload: 'customer bug intake',
      region: 'support and product team',
      monthlyRequests: '6',
      objective: 'reduce-duplicate-load',
    },
  },
  {
    id: 'release-triage-queue',
    label: 'Release triage',
    profile: {
      appName: 'Release queue',
      provider: 'Saved issue views and triage fields preview',
      currentModel: 'Separate release blockers, owner gaps, and field drift before the next cut',
      reviewModels: [
        'Security review failed | must block release | Security owner | critical',
        'Staging smoke missing | wait for rerun | QA owner | watch',
        'Deployment note missing | needs release field | Release owner | opportunity',
        'Customer bugbacklog | duplicate of customer intake | Support owner | critical',
        'Runbook update | already routed | Ops owner | no-action',
        'Escalation link | needs area field | PM owner | watch',
      ],
      workload: 'release readiness board',
      region: 'release engineering',
      monthlyRequests: '6',
      objective: 'release-readiness',
    },
  },
  {
    id: 'mcp-issue-fields-sync',
    label: 'MCP sync',
    profile: {
      appName: 'Issue fields sync',
      provider: 'GitHub Issues MCP fields and saved views',
      currentModel: 'Use issue fields to push duplicates, owners, and saved view coverage into one deterministic brief',
      reviewModels: [
        'MCP field map | missing owner field | Platform owner | opportunity',
        'Duplicate intake | duplicate cluster | Triage owner | critical',
        'Saved view filter | needs area + priority | PM owner | watch',
        'Bug repro pack | already routed | QA owner | no-action',
        'Issue age warning | needs due date field | Release owner | watch',
        'Canonical issue note | duplicate link and summary | Maintainer | opportunity',
      ],
      workload: 'issue operations lane',
      region: 'platform and maintainer team',
      monthlyRequests: '6',
      objective: 'field-coverage',
    },
  },
  {
    id: 'saved-view-repair',
    label: 'Saved view repair',
    profile: {
      appName: 'Saved view repair',
      provider: 'GitHub Issues saved views and issue fields',
      currentModel: 'Repair a noisy backlog so blockers, duplicates, and owner gaps show up in one deterministic triage board',
      reviewModels: [
        'Login bug cluster | duplicate of release blocker | Mobile owner | critical',
        'Escalation queue | missing area field | Support owner | watch',
        'Customer ask | needs owner field | Product owner | watch',
        'Refactor note | already routed | Platform owner | no-action',
        'Stale follow-up | saved view drift | QA owner | opportunity',
        'Search bug | duplicate note missing | Frontend owner | critical',
      ],
      workload: 'issue backlog view',
      region: 'support, QA, and product ops',
      monthlyRequests: '6',
      objective: 'reduce-duplicate-load',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
