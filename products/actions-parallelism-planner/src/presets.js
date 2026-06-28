export const PRESETS = [
  {
    id: 'matrix-build-parallel',
    label: 'Matrix build',
    profile: {
      appName: 'Monorepo CI',
      provider: 'GitHub Actions parallel steps changelog',
      currentModel: 'Split lint, tests, and docs into safe background lanes while keeping deploy serial',
      reviewModels: [
        'Lint and typecheck | independent from tests | Platform engineer | opportunity',
        'Unit tests | no deploy access | QA owner | opportunity',
        'Docs build | no repo mutation | Docs owner | no-action',
        'Integration smoke | waits on build artifact | Release owner | watch',
        'Preview deploy | after green smoke | Release owner | critical',
        'Cleanup and cancel | run after failure | Infra owner | watch',
      ],
      workload: 'checkout repo',
      region: 'platform team',
      monthlyRequests: '6',
      objective: 'speed-up-ci',
    },
  },
  {
    id: 'release-gate-parallel',
    label: 'Release gate',
    profile: {
      appName: 'Production release',
      provider: 'GitHub Actions workflow and release checklist',
      currentModel: 'Protect production deploy while surfacing owner gaps, wait links, and cancel paths',
      reviewModels: [
        'Build artifact | stable output for all branches | Build owner | opportunity',
        'Security scan | blocks release if it fails | Security owner | critical',
        'Staging smoke | must finish before deploy | QA owner | watch',
        'Production deploy | keep serial and manual | Release owner | critical',
        'Rollback check | needed if deploy fails | SRE owner | watch',
        'Release note publish | can run after deploy | Comms owner | no-action',
      ],
      workload: 'release pipeline',
      region: 'release team',
      monthlyRequests: '6',
      objective: 'safeguard-release',
    },
  },
  {
    id: 'agentic-workflow-parallel',
    label: 'Agentic workflow',
    profile: {
      appName: 'Agent workflow graph',
      provider: 'GitHub Actions parallel background and wait-all preview',
      currentModel: 'Break a longer workflow into independent lanes without losing owner visibility or log clarity',
      reviewModels: [
        'Plan job | no writes, just graph shaping | PM owner | no-action',
        'Tool setup | independent install lane | DevEx owner | opportunity',
        'Policy check | waits on setup logs | Security owner | watch',
        'Main task | depends on policy gate | Agent owner | critical',
        'Audit export | can run in background | QA owner | opportunity',
        'Cancel hook | stops stale lanes | Infra owner | watch',
      ],
      workload: 'agent orchestration repo',
      region: 'workflow engineering',
      monthlyRequests: '6',
      objective: 'reduce-debug-noise',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
