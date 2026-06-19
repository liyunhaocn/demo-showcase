export const PRESETS = [
  {
    id: 'b2b-saas',
    label: 'B2B SaaS',
    profile: {
      brandName: 'Northstar Support',
      website: 'northstarsupport.io',
      category: 'AI customer support automation platform',
      targetBuyer: 'VP Support at B2B SaaS companies',
      objective: 'comparison',
      competitors: [
        { id: 'intercom', name: 'Intercom Fin', website: 'intercom.com' },
        { id: 'zendesk', name: 'Zendesk AI', website: 'zendesk.com' },
        { id: 'ada', name: 'Ada', website: 'ada.cx' },
      ],
    },
  },
  {
    id: 'agency',
    label: 'Agency / consultant',
    profile: {
      brandName: 'Brightline GEO Studio',
      website: 'brightlinegeo.com',
      category: 'GEO and AI search consulting agency',
      targetBuyer: 'founder-led B2B software teams',
      objective: 'category',
      competitors: [
        { id: 'omni-growth', name: 'Omni Growth Labs', website: 'omnigrowth.example' },
        { id: 'searchcraft', name: 'SearchCraft Advisory', website: 'searchcraft.example' },
      ],
    },
  },
  {
    id: 'local-service',
    label: 'Local service',
    profile: {
      brandName: 'Harbor Street Dental',
      website: 'harborstreetdental.com',
      category: 'local dental clinic for family and cosmetic care',
      targetBuyer: 'families comparing dentists in Seattle',
      objective: 'brand-defense',
      competitors: [
        { id: 'lakeview', name: 'Lakeview Family Dental', website: 'lakeviewdental.example' },
        { id: 'northgate', name: 'Northgate Smile Center', website: 'northgatesmile.example' },
        { id: 'evergreen', name: 'Evergreen Dental Studio', website: 'evergreendental.example' },
      ],
    },
  },
]

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id)
}
