const templates = {
  'dedupe-cluster': [
    {
      id: 'duplicate-link',
      intentGroup: 'dedupe-cluster',
      priority: 'high',
      text: 'Which issue in {workload} should become the canonical record for the current duplicate cluster?',
    },
    {
      id: 'duplicate-drift',
      intentGroup: 'dedupe-cluster',
      priority: 'high',
      text: 'Where is {appName} likely to create a second copy of the same bug if the team does not dedupe now?',
    },
    {
      id: 'duplicate-note',
      intentGroup: 'dedupe-cluster',
      priority: 'medium',
      text: 'What note should {appName} attach so the next duplicate links back to the original issue?',
    },
  ],
  'field-gap': [
    {
      id: 'field-missing',
      intentGroup: 'field-gap',
      priority: 'high',
      text: 'Which issue in {workload} is missing the fields needed for a clean triage queue?',
    },
    {
      id: 'field-normalize',
      intentGroup: 'field-gap',
      priority: 'high',
      text: 'Which field set should {appName} normalize before the next sweep so saved views stay consistent?',
    },
    {
      id: 'field-routing',
      intentGroup: 'field-gap',
      priority: 'medium',
      text: 'How should {appName} route issues that are missing priority, area, or due date fields?',
    },
  ],
  'owner-gate': [
    {
      id: 'owner-gate',
      intentGroup: 'owner-gate',
      priority: 'high',
      text: 'Which issue in {workload} needs a named owner before the team can treat it as ready?',
    },
    {
      id: 'owner-assign',
      intentGroup: 'owner-gate',
      priority: 'medium',
      text: 'Who should own the triage gate for {appName} when the next duplicate cluster is opened?',
    },
    {
      id: 'owner-brief',
      intentGroup: 'owner-gate',
      priority: 'medium',
      text: 'How should {appName} brief the owner so they can unblock the next issue quickly?',
    },
  ],
  'saved-view': [
    {
      id: 'saved-view-fit',
      intentGroup: 'saved-view',
      priority: 'high',
      text: 'Which saved view in {appName} needs to be updated so the team can see blockers first?',
    },
    {
      id: 'saved-view-gap',
      intentGroup: 'saved-view',
      priority: 'medium',
      text: 'What filter in {workload} should change first to keep duplicates and blockers in the same queue?',
    },
    {
      id: 'saved-view-share',
      intentGroup: 'saved-view',
      priority: 'medium',
      text: 'How should {appName} share a saved view so release and support owners see the same issues?',
    },
  ],
}

const objectiveOrder = {
  'reduce-duplicate-load': ['dedupe-cluster', 'owner-gate', 'field-gap', 'saved-view'],
  'release-readiness': ['owner-gate', 'saved-view', 'dedupe-cluster', 'field-gap'],
  'field-coverage': ['field-gap', 'saved-view', 'owner-gate', 'dedupe-cluster'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['reduce-duplicate-load']
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
    : 'known issue clusters'

  return template
    .replaceAll('{appName}', profile.appName)
    .replaceAll('{provider}', profile.provider)
    .replaceAll('{currentModel}', profile.currentModel)
    .replaceAll('{workload}', profile.workload || 'the current issue queue')
    .replaceAll('{region}', profile.region || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
