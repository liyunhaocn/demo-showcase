export const PRESETS = [
  {
    id: 'public-pat',
    label: 'Public PAT',
    profile: {
      incidentName: 'Public PAT in docs repo',
      alertSource: 'GitHub secret scanning public monitoring for enterprises',
      secretType: 'Personal access token',
      exposureSurface: 'public repo, README snippet, and issue comment',
      owningTeam: 'security and platform engineering',
      alertAgeHours: '15',
      objective: 'contain-fast',
      reviewModels: [
        'docs-repo | public README snippet | Security owner | critical',
        'release-notes | token echoed in issue body | Platform on-call | critical',
        'customer-portal | no exposure found yet | App owner | watch',
        'build-scripts | dependency pinning updated | DevSecOps lead | contained',
        'support-playbook | comms draft missing | Incident commander | watch',
        'infra-secrets | rotation queued | Security owner | contained',
      ],
    },
  },
  {
    id: 'cloud-key',
    label: 'Cloud key',
    profile: {
      incidentName: 'Cloud access key leaked',
      alertSource: 'GitHub public monitoring and internal rotation trigger',
      secretType: 'Cloud API key',
      exposureSurface: 'artifact, build log, and CI output',
      owningTeam: 'DevSecOps and platform engineering',
      alertAgeHours: '8',
      objective: 'rotate-first',
      reviewModels: [
        'infra-pipeline | build log fingerprint matched | DevSecOps lead | critical',
        'billing-service | secret scope limited | Platform owner | watch',
        'ops-dashboard | key already revoked | Incident commander | contained',
        'analytics-export | blast radius still unknown | Data owner | critical',
        'customer-notify | public statement not drafted | Communications owner | watch',
        'rotation-runbook | first pass complete | Security owner | contained',
      ],
    },
  },
  {
    id: 'webhook-secret',
    label: 'Webhook secret',
    profile: {
      incidentName: 'Webhook secret exposed in logs',
      alertSource: 'GitHub secret scanning alert plus log inspection',
      secretType: 'Webhook signing secret',
      exposureSurface: 'service logs, CI job, and support export',
      owningTeam: 'application security',
      alertAgeHours: '28',
      objective: 'notify-comms',
      reviewModels: [
        'webhook-worker | logs still retain payloads | AppSec owner | critical',
        'integration-tests | test fixture needs cleanup | QA owner | watch',
        'partner-api | no external calls observed | Integration owner | contained',
        'notification-service | comms template approved | Support lead | contained',
        'observability-sink | evidence capture needed | Platform owner | watch',
        'runtime-policy | rotation finished | Security owner | contained',
      ],
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
