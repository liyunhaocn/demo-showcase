const templates = {
  containment: [
    {
      id: 'containment-first',
      intentGroup: 'containment',
      priority: 'high',
      text: 'Which part of {exposureSurface} needs to be contained first for {incidentName}?',
    },
    {
      id: 'blast-radius',
      intentGroup: 'containment',
      priority: 'high',
      text: 'What blast radius still needs to be confirmed before {incidentName} can move out of critical status?',
    },
    {
      id: 'containment-note',
      intentGroup: 'containment',
      priority: 'medium',
      text: 'What containment note should {owningTeam} attach so the next reviewer sees the same incident scope?',
    },
  ],
  rotation: [
    {
      id: 'rotate-now',
      intentGroup: 'rotation',
      priority: 'high',
      text: 'Which secret in {secretType} should be rotated or revoked first?',
    },
    {
      id: 'rotation-owner',
      intentGroup: 'rotation',
      priority: 'high',
      text: 'Which owner should take the rotation step if the exposed secret lives in {exposureSurface}?',
    },
    {
      id: 'rotation-runbook',
      intentGroup: 'rotation',
      priority: 'medium',
      text: 'What runbook step should {owningTeam} pin next to make rotation repeatable?',
    },
  ],
  comms: [
    {
      id: 'notify-first',
      intentGroup: 'comms',
      priority: 'high',
      text: 'Who needs the first notification once {incidentName} is contained?',
    },
    {
      id: 'customer-note',
      intentGroup: 'comms',
      priority: 'medium',
      text: 'What customer or internal note should stay attached while {incidentName} is still active?',
    },
    {
      id: 'postmortem-hook',
      intentGroup: 'comms',
      priority: 'medium',
      text: 'Which follow-up item should feed the incident postmortem after rotation finishes?',
    },
  ],
  evidence: [
    {
      id: 'evidence-pack',
      intentGroup: 'evidence',
      priority: 'high',
      text: 'What evidence from the alert should {owningTeam} preserve before the audit trail changes?',
    },
    {
      id: 'scope-proof',
      intentGroup: 'evidence',
      priority: 'high',
      text: 'Where is the proof that {incidentName} only touched the reported exposure surface?',
    },
    {
      id: 'logging-hook',
      intentGroup: 'evidence',
      priority: 'medium',
      text: 'What logging hook should stay on so the next secret alert is easier to verify?',
    },
  ],
}

const objectiveOrder = {
  'contain-fast': ['containment', 'rotation', 'evidence', 'comms'],
  'rotate-first': ['rotation', 'containment', 'evidence', 'comms'],
  'notify-comms': ['comms', 'containment', 'rotation', 'evidence'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder['contain-fast']
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
    : 'known secret alerts'

  return template
    .replaceAll('{incidentName}', profile.incidentName)
    .replaceAll('{alertSource}', profile.alertSource)
    .replaceAll('{secretType}', profile.secretType)
    .replaceAll('{exposureSurface}', profile.exposureSurface || 'the reported exposure surface')
    .replaceAll('{owningTeam}', profile.owningTeam || 'the current owner group')
    .replaceAll('{reviewModels}', inventoryText)
}
