const templates = {
  'gateway-source': [
    {
      id: 'gateway-source-path',
      intentGroup: 'gateway-source',
      priority: 'high',
      text: 'Which gateway source in {appName} shows the slowest or noisiest run first?',
    },
    {
      id: 'gateway-source-depth',
      intentGroup: 'gateway-source',
      priority: 'high',
      text: 'Which tool calls in {workload} need more detail before the next incident review?',
    },
    {
      id: 'gateway-source-warning',
      intentGroup: 'gateway-source',
      priority: 'medium',
      text: 'How much signal does {appName} need before a gateway becomes a gateway blocker?',
    },
  ],
  'failure-mode': [
    {
      id: 'failure-loop',
      intentGroup: 'failure-mode',
      priority: 'high',
      text: 'Which step in {workload} is retrying or failing most often?',
    },
    {
      id: 'failure-cost',
      intentGroup: 'failure-mode',
      priority: 'high',
      text: 'Which failure mode in {appName} is driving the highest cost or delay?',
    },
    {
      id: 'failure-replay',
      intentGroup: 'failure-mode',
      priority: 'medium',
      text: 'Which gateway step should {appName} replay first to reproduce the problem?',
    },
  ],
  'handoff-gap': [
    {
      id: 'handoff-owner',
      intentGroup: 'handoff-gap',
      priority: 'high',
      text: 'Which handoff in {workload} needs a human owner before the next run?',
    },
    {
      id: 'handoff-approval',
      intentGroup: 'handoff-gap',
      priority: 'medium',
      text: 'Where should {appName} add a human checkpoint before an agent can continue?',
    },
    {
      id: 'handoff-report',
      intentGroup: 'handoff-gap',
      priority: 'medium',
      text: 'How should {appName} report a handoff gap to the team that owns the fix?',
    },
  ],
  'replay-plan': [
    {
      id: 'replay-readiness',
      intentGroup: 'replay-plan',
      priority: 'high',
      text: 'Should {appName} keep the current gateway path or replay a safer path first?',
    },
    {
      id: 'replay-fit',
      intentGroup: 'replay-plan',
      priority: 'medium',
      text: 'Which owner best understands {workload} if the team cares most about gateway clarity?',
    },
    {
      id: 'replay-sequence',
      intentGroup: 'replay-plan',
      priority: 'medium',
      text: 'What replay sequence reduces gateway risk fastest for {appName}?',
    },
  ],
}

const objectiveOrder = {
  'find-bottlenecks': ['gateway-source', 'failure-mode', 'handoff-gap', 'replay-plan'],
  'reduce-failures': ['failure-mode', 'handoff-gap', 'gateway-source', 'replay-plan'],
  'reduce-cost': ['gateway-source', 'replay-plan', 'failure-mode', 'handoff-gap'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['find-bottlenecks']
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
    : 'known gateway rows'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current tool surface')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{driftModels}', inventoryText)
}
