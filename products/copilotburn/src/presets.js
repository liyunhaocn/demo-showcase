export const PRESETS = [
  {
    id: 'startup-team',
    label: 'Startup team',
    profile: {
      orgName: 'Northstar Product Studio',
      githubOrg: 'northstar-product-studio',
      plan: 'business',
      seats: '18',
      activeDevelopers: '12',
      repos: '24',
      prsPerMonth: '420',
      codeReviewShare: '58',
      advancedModelShare: '22',
      monthlyCreditCap: '1600',
      objective: 'forecast',
    },
  },
  {
    id: 'platform-org',
    label: 'Platform org',
    profile: {
      orgName: 'Cloud Harbor Platform',
      githubOrg: 'cloud-harbor',
      plan: 'enterprise',
      seats: '78',
      activeDevelopers: '54',
      repos: '142',
      prsPerMonth: '1860',
      codeReviewShare: '72',
      advancedModelShare: '38',
      monthlyCreditCap: '5200',
      objective: 'budget',
    },
  },
  {
    id: 'consultant-bundle',
    label: 'Consultant / ops',
    profile: {
      orgName: 'Metric Harbor Advisory',
      githubOrg: 'metric-harbor',
      plan: 'business',
      seats: '9',
      activeDevelopers: '6',
      repos: '31',
      prsPerMonth: '210',
      codeReviewShare: '32',
      advancedModelShare: '15',
      monthlyCreditCap: '850',
      objective: 'governance',
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
