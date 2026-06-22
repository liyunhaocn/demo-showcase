const templates = {
  'route-repeatable-work': [
    {
      id: 'route-repeatable-fit',
      intentGroup: 'agent-fit',
      priority: 'high',
      text: 'Which workflows in {workload} are best routed to an agent surface instead of staying manual?',
    },
    {
      id: 'route-repeatable-order',
      intentGroup: 'workflow-routing',
      priority: 'high',
      text: 'Which task in {appName} should get the first pilot if the team wants quick adoption with low risk?',
    },
    {
      id: 'route-repeatable-access',
      intentGroup: 'access-check',
      priority: 'medium',
      text: 'Which app permissions or connected tools does {appName} need before it can route work safely?',
    },
  ],
  'protect-sensitive-tasks': [
    {
      id: 'sensitive-blockers',
      intentGroup: 'access-check',
      priority: 'high',
      text: 'Which tasks in {workload} must stay manual because they touch private, legal, or finance data?',
    },
    {
      id: 'sensitive-review',
      intentGroup: 'workflow-routing',
      priority: 'high',
      text: 'Where should {appName} add a human review step before a workspace agent can touch the task?',
    },
    {
      id: 'sensitive-access',
      intentGroup: 'access-check',
      priority: 'medium',
      text: 'Which approvals or connected apps are required before {appName} can start the first pilot?',
    },
  ],
  'find-upside': [
    {
      id: 'upside-fit',
      intentGroup: 'agent-fit',
      priority: 'high',
      text: 'Which workflows in {workload} benefit the most from a workspace agent or Copilot app?',
    },
    {
      id: 'upside-pilot',
      intentGroup: 'workflow-routing',
      priority: 'medium',
      text: 'Which workflow should {appName} pilot first to prove the rollout upside quickly?',
    },
    {
      id: 'upside-reporting',
      intentGroup: 'rollout-plan',
      priority: 'medium',
      text: 'What rollout checklist should {appName} show leadership after the first pilot?',
    },
  ],
}

const objectiveOrder = {
  'route-repeatable-work': ['route-repeatable-work', 'find-upside', 'protect-sensitive-tasks'],
  'protect-sensitive-tasks': ['protect-sensitive-tasks', 'route-repeatable-work', 'find-upside'],
  'find-upside': ['find-upside', 'route-repeatable-work', 'protect-sensitive-tasks'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['route-repeatable-work']
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
  const inventoryText = profile.driftModels.length
    ? profile.driftModels.map((model) => model.name).join(', ')
    : 'known workflow rows'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current workflow surface')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{driftModels}', inventoryText)
}
