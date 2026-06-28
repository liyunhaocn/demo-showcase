const templates = {
  'parallel-opportunity': [
    {
      id: 'parallel-lane',
      intentGroup: 'parallel-opportunity',
      priority: 'high',
      text: 'Which step in {workload} can move to a background lane without risking the release?',
    },
    {
      id: 'parallel-logs',
      intentGroup: 'parallel-opportunity',
      priority: 'high',
      text: 'Which lane in {appName} needs separate logs so the team can read failures quickly?',
    },
    {
      id: 'parallel-split',
      intentGroup: 'parallel-opportunity',
      priority: 'medium',
      text: 'Where can {appName} split work into independent branches without adding more manual review?',
    },
  ],
  'sequence-gate': [
    {
      id: 'sequence-gate',
      intentGroup: 'sequence-gate',
      priority: 'high',
      text: 'Which step in {workload} must stay serial because it gates a deploy or a secret?',
    },
    {
      id: 'sequence-wait',
      intentGroup: 'sequence-gate',
      priority: 'high',
      text: 'Where should {appName} add a wait or wait-all step before the next lane starts?',
    },
    {
      id: 'sequence-risk',
      intentGroup: 'sequence-gate',
      priority: 'medium',
      text: 'Which branch in {appName} becomes unsafe if it is allowed to run in parallel?',
    },
  ],
  'owner-checkpoint': [
    {
      id: 'owner-gap',
      intentGroup: 'owner-checkpoint',
      priority: 'high',
      text: 'Which step in {workload} needs an owner before the next run can be considered ready?',
    },
    {
      id: 'owner-handoff',
      intentGroup: 'owner-checkpoint',
      priority: 'medium',
      text: 'Who should own the manual checkpoint for {appName} if the parallel branch blocks?',
    },
    {
      id: 'owner-summary',
      intentGroup: 'owner-checkpoint',
      priority: 'medium',
      text: 'How should {appName} summarize the owner map so a lead can assign the next action fast?',
    },
  ],
  'cancel-plan': [
    {
      id: 'cancel-path',
      intentGroup: 'cancel-plan',
      priority: 'high',
      text: 'Which lane in {workload} needs an explicit cancel or rollback path?',
    },
    {
      id: 'cancel-stale',
      intentGroup: 'cancel-plan',
      priority: 'medium',
      text: 'What should {appName} do with stale background lanes when the main gate changes?',
    },
    {
      id: 'cancel-brief',
      intentGroup: 'cancel-plan',
      priority: 'medium',
      text: 'How should {appName} brief the team on a failed lane so the next rerun is shorter?',
    },
  ],
}

const objectiveOrder = {
  'speed-up-ci': ['parallel-opportunity', 'sequence-gate', 'owner-checkpoint', 'cancel-plan'],
  'safeguard-release': ['sequence-gate', 'cancel-plan', 'owner-checkpoint', 'parallel-opportunity'],
  'reduce-debug-noise': ['owner-checkpoint', 'cancel-plan', 'parallel-opportunity', 'sequence-gate'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['speed-up-ci']
  const selected = []

  for (const group of order) {
    selected.push(...templates[group])
  }

  return selected.slice(0, 9).map((template, index) => ({
    id: `${template.id}-${index + 1}`,
    intentGroup: template.intentGroup,
    priority: template.priority,
    prompt: hydrate(template.text, profile),
  }))
}

function hydrate(template, profile) {
  const inventoryText = profile.reviewModels.length
    ? profile.reviewModels.map((model) => model.name).join(', ')
    : 'known workflow steps'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current repo surface')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
