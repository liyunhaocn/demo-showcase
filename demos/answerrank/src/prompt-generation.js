const templates = {
  comparison: [
    {
      id: 'comparison-best-alt',
      intentGroup: 'comparison',
      priority: 'high',
      text: 'What is the best {category} for {buyer} compared with {competitors}?',
    },
    {
      id: 'comparison-brand-vs-market',
      intentGroup: 'comparison',
      priority: 'high',
      text: 'How does {brand} compare with the leading {category} alternatives?',
    },
    {
      id: 'comparison-switching',
      intentGroup: 'comparison',
      priority: 'medium',
      text: 'When should {buyer} switch from {competitors} to a newer {category}?',
    },
  ],
  category: [
    {
      id: 'category-shortlist',
      intentGroup: 'category-recommendation',
      priority: 'high',
      text: 'Which {category} vendors should {buyer} put on a shortlist?',
    },
    {
      id: 'category-budget',
      intentGroup: 'category-recommendation',
      priority: 'medium',
      text: 'What affordable {category} options work for {buyer}?',
    },
    {
      id: 'category-selection',
      intentGroup: 'category-recommendation',
      priority: 'medium',
      text: 'What should {buyer} evaluate before choosing a {category}?',
    },
  ],
  'problem-solution': [
    {
      id: 'problem-pain',
      intentGroup: 'problem-solution',
      priority: 'high',
      text: 'How can {buyer} solve the main workflow pain that {category} products claim to fix?',
    },
    {
      id: 'problem-proof',
      intentGroup: 'problem-solution',
      priority: 'medium',
      text: 'What proof should {buyer} ask for before trusting a {category} vendor?',
    },
    {
      id: 'problem-implementation',
      intentGroup: 'problem-solution',
      priority: 'low',
      text: 'What implementation risks should {buyer} expect with a {category}?',
    },
  ],
  'brand-defense': [
    {
      id: 'brand-is-legit',
      intentGroup: 'brand-defense',
      priority: 'high',
      text: 'Is {brand} a credible {category} for {buyer}?',
    },
    {
      id: 'brand-pricing',
      intentGroup: 'brand-defense',
      priority: 'medium',
      text: 'What does {brand} do, who is it best for, and how is it priced?',
    },
    {
      id: 'brand-objections',
      intentGroup: 'brand-defense',
      priority: 'medium',
      text: 'What concerns should {buyer} consider before choosing {brand}?',
    },
  ],
}

const objectiveOrder = {
  comparison: ['comparison', 'category', 'problem-solution', 'brand-defense'],
  category: ['category', 'problem-solution', 'comparison', 'brand-defense'],
  'brand-defense': ['brand-defense', 'comparison', 'problem-solution', 'category'],
}

export function generatePrompts(profile) {
  const order = objectiveOrder[profile.objective] || objectiveOrder.comparison
  const selected = []

  for (const group of order) {
    selected.push(...templates[group])
  }

  return selected.slice(0, 10).map((template, index) => ({
    id: `${template.id}-${index + 1}`,
    intentGroup: template.intentGroup,
    priority: template.priority,
    prompt: hydrate(template.text, profile),
  }))
}

function hydrate(template, profile) {
  const competitorText = profile.competitors.length
    ? profile.competitors.map((competitor) => competitor.name).join(', ')
    : 'known alternatives'

  return template
    .replaceAll('{brand}', profile.brandName)
    .replaceAll('{category}', profile.category)
    .replaceAll('{buyer}', profile.targetBuyer || 'target buyers')
    .replaceAll('{competitors}', competitorText)
}
