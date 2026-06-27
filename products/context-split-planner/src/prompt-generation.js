const templates = {
  'split-source': [
    {
      id: 'split-source-path',
      intentGroup: 'split-source',
      priority: 'high',
      text: 'Which context source in {appName} adds the most risk to the next session split?',
    },
    {
      id: 'split-source-depth',
      intentGroup: 'split-source',
      priority: 'high',
      text: 'Which context chunks in {workload} need more detail before the next handoff?',
    },
    {
      id: 'split-source-warning',
      intentGroup: 'split-source',
      priority: 'medium',
      text: 'How much signal does {appName} need before a split becomes a handoff blocker?',
    },
  ],
  'context-pressure': [
    {
      id: 'context-loop',
      intentGroup: 'context-pressure',
      priority: 'high',
      text: 'Which step in {workload} is stretching the context window most often?',
    },
    {
      id: 'context-cost',
      intentGroup: 'context-pressure',
      priority: 'high',
      text: 'Which context habit in {appName} is driving the highest delay or rework?',
    },
    {
      id: 'context-handoff',
      intentGroup: 'context-pressure',
      priority: 'medium',
      text: 'Which context chunk should {appName} handoff first to keep the session small?',
    },
  ],
  'handoff-gap': [
    {
      id: 'handoff-owner',
      intentGroup: 'handoff-gap',
      priority: 'high',
      text: 'Which handoff in {workload} needs a human owner before the next session split?',
    },
    {
      id: 'handoff-approval',
      intentGroup: 'handoff-gap',
      priority: 'medium',
      text: 'Where should {appName} add a human checkpoint before a subagent can continue?',
    },
    {
      id: 'handoff-report',
      intentGroup: 'handoff-gap',
      priority: 'medium',
      text: 'How should {appName} report a handoff gap to the team that owns the next fix?',
    },
  ],
  'handoff-plan': [
    {
      id: 'handoff-readiness',
      intentGroup: 'handoff-plan',
      priority: 'high',
      text: 'Should {appName} keep the current path or handoff a safer split first?',
    },
    {
      id: 'handoff-fit',
      intentGroup: 'handoff-plan',
      priority: 'medium',
      text: 'Which owner best understands {workload} if the team cares most about split clarity?',
    },
    {
      id: 'handoff-sequence',
      intentGroup: 'handoff-plan',
      priority: 'medium',
      text: 'What handoff sequence reduces context risk fastest for {appName}?',
    },
  ],
}

const objectiveOrder = {
  'split-large-task': ['split-source', 'context-pressure', 'handoff-gap', 'handoff-plan'],
  'reduce-context-risk': ['context-pressure', 'handoff-gap', 'split-source', 'handoff-plan'],
  'reduce-handoff-friction': ['split-source', 'handoff-plan', 'context-pressure', 'handoff-gap'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['split-large-task']
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
    : 'known context chunks'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current repo surface')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
