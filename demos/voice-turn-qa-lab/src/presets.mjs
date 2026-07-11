export const PRESETS = [
  {
    id: 'appointment-change',
    label: 'Appointment change',
    status: 'pass',
    title: 'Clean scheduling handoff',
    description: 'Disclosure, no timing issues, and a confirmed schedule outcome.',
    form: {
      projectName: 'Northstar Scheduling Voice Pilot',
      useCase: 'appointment-change',
      profile: 'production',
      expectedOutcome: 'scheduled',
      disclosureRequired: true,
      transcript: [
        '00:00.000-00:01.200 | AGENT | Hi, I am the automated support assistant. How can I help with your appointment?',
        '00:01.300-00:03.100 | CALLER | Please move my appointment to Friday morning.',
        '00:03.250-00:04.200 | AGENT | Got it, I will move it to Friday morning.',
        '00:04.350-00:05.200 | CALLER | Ten-thirty works.',
        '00:05.450-00:06.700 | AGENT | Your appointment is scheduled for Friday at 10:30 AM.',
        '00:06.900-00:07.500 | CALLER | Thanks, that works.',
        '00:07.700-00:08.900 | AGENT | Confirmed. Your appointment is scheduled for Friday at 10:30 AM.',
      ].join('\n'),
    },
  },
  {
    id: 'billing-support',
    label: 'Billing support',
    status: 'needs-review',
    title: 'Correction acknowledged too late',
    description: 'A duplicate-charge call with a medium dead-air gap and a missed repair.',
    form: {
      projectName: 'Northstar Billing Voice Pilot',
      useCase: 'billing-support',
      profile: 'production',
      expectedOutcome: 'resolved',
      disclosureRequired: true,
      transcript: [
        '00:00.000-00:01.100 | AGENT | Hi, I am the automated billing assistant. How can I help?',
        '00:01.400-00:03.000 | CALLER | I have a duplicate charge on invoice 204.',
        '00:04.300-00:05.300 | AGENT | I can explain your latest invoice and payment status.',
        '00:05.450-00:06.900 | CALLER | No, it is invoice 204, not the latest invoice.',
        '00:07.150-00:08.600 | AGENT | I will review invoice 204 and follow up with the billing team.',
        '00:08.850-00:09.900 | CALLER | Please fix the duplicate charge.',
        '00:10.000-00:11.400 | AGENT | The duplicate charge on invoice 204 is resolved and a refund is confirmed.',
      ].join('\n'),
    },
  },
  {
    id: 'service-outage',
    label: 'Service outage',
    status: 'fail',
    title: 'Escalation never completes',
    description: 'A slow yield, dead air, and no human handoff despite repeated escalation requests.',
    form: {
      projectName: 'Northstar Outage Voice Pilot',
      useCase: 'service-outage',
      profile: 'strict',
      expectedOutcome: 'human-handoff',
      disclosureRequired: true,
      transcript: [
        '00:00.000-00:01.200 | AGENT | Welcome to outage support.',
        '00:01.300-00:03.400 | CALLER | My service has been offline for six hours.',
        '00:03.100-00:06.000 | AGENT | I can read the public status message and troubleshooting steps.',
        '00:04.800-00:06.100 | CALLER | Stop, I already tried those. I need a person.',
        '00:08.800-00:10.200 | AGENT | Please restart your router and wait ten minutes.',
        '00:10.300-00:11.200 | CALLER | Transfer me to a specialist.',
        '00:12.500-00:13.000 | AGENT | Please check the status page later.',
      ].join('\n'),
    },
  },
]

export const DEFAULT_PRESET_ID = 'appointment-change'

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID)
}
