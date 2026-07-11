import assert from 'node:assert/strict'

import {
  SIMULATION_DISCLAIMER,
  analyzeTranscript,
  parseTranscript,
  toMarkdown,
  validateAnalysisInput,
} from '../src/model.mjs'

const passTranscript = `
00:00.000-00:01.200 | AGENT | Hi, I am the automated support assistant. How can I help with your appointment?
00:01.300-00:03.100 | CALLER | Please move my appointment to Friday morning.
00:03.250-00:04.200 | AGENT | Got it, I will move it to Friday morning.
00:04.350-00:05.200 | CALLER | Ten-thirty works.
00:05.450-00:06.700 | AGENT | Your appointment is scheduled for Friday at 10:30 AM.
00:06.900-00:07.500 | CALLER | Thanks, that works.
00:07.700-00:08.900 | AGENT | Confirmed. Your appointment is scheduled for Friday at 10:30 AM.
`.trim()

const reviewTranscript = `
00:00.000-00:01.100 | AGENT | Hi, I am the automated billing assistant. How can I help?
00:01.400-00:03.000 | CALLER | I have a duplicate charge on invoice 204.
00:04.300-00:05.300 | AGENT | I can explain your latest invoice and payment status.
00:05.450-00:06.900 | CALLER | No, it is invoice 204, not the latest invoice.
00:07.150-00:08.600 | AGENT | I will review invoice 204 and follow up with the billing team.
00:08.850-00:09.900 | CALLER | Please fix the duplicate charge.
00:10.000-00:11.400 | AGENT | The duplicate charge on invoice 204 is resolved and a refund is confirmed.
`.trim()

const failTranscript = `
00:00.000-00:01.200 | AGENT | Welcome to outage support.
00:01.300-00:03.400 | CALLER | My service has been offline for six hours.
00:03.100-00:06.000 | AGENT | I can read the public status message and troubleshooting steps.
00:04.800-00:06.100 | CALLER | Stop, I already tried those. I need a person.
00:08.800-00:10.200 | AGENT | Please restart your router and wait ten minutes.
00:10.300-00:11.200 | CALLER | Transfer me to a specialist.
00:12.500-00:13.000 | AGENT | Please check the status page later.
`.trim()

const passInput = {
  projectName: 'Northstar Scheduling Voice Pilot',
  useCase: 'appointment-change',
  profile: 'production',
  expectedOutcome: 'scheduled',
  disclosureRequired: true,
  transcript: passTranscript,
}

const parsed = parseTranscript(passTranscript)
assert.equal(parsed.ok, true)
assert.equal(parsed.turns.length, 7)
assert.deepEqual(parsed.turns[0], {
  id: 'turn-1',
  lineNo: 1,
  speaker: 'agent',
  startMs: 0,
  endMs: 1200,
  durationMs: 1200,
  text: 'Hi, I am the automated support assistant. How can I help with your appointment?',
})
assert.equal(parseTranscript('00:02.000-00:01.000 | ROBOT | nope').ok, false)
assert.equal(parseTranscript('00:00.000-00:01.000 | CALLER | text | with | pipes').turns[0].text, 'text | with | pipes')

const invalid = validateAnalysisInput({ ...passInput, projectName: '', transcript: 'one line' })
assert.equal(invalid.ok, false)
assert.equal(invalid.errors.projectName.length > 0, true)
assert.equal(invalid.errors.transcript.length > 0, true)

const pass = analyzeTranscript(passInput)
assert.equal(pass.verdict, 'pass')
assert.equal(pass.issues.length, 0)
assert.deepEqual(pass, analyzeTranscript(passInput))
assert.equal(pass.analysisId.startsWith('vtqa-'), true)

const review = analyzeTranscript({
  ...passInput,
  projectName: 'Northstar Billing Voice Pilot',
  useCase: 'billing-support',
  expectedOutcome: 'resolved',
  transcript: reviewTranscript,
})
assert.equal(review.verdict, 'needs-review')
assert.equal(review.issues.some((item) => item.type === 'dead-air'), true)
assert.equal(review.issues.some((item) => item.type === 'missed-repair'), true)

const fail = analyzeTranscript({
  ...passInput,
  projectName: 'Northstar Outage Voice Pilot',
  useCase: 'service-outage',
  profile: 'strict',
  expectedOutcome: 'human-handoff',
  transcript: failTranscript,
})
assert.equal(fail.verdict, 'fail')
assert.equal(fail.issues.some((item) => item.type === 'slow-yield'), true)
assert.equal(fail.issues.some((item) => item.type === 'dead-air'), true)
assert.equal(fail.issues.some((item) => item.type === 'missing-handoff'), true)
assert.equal(fail.issues.some((item) => item.type === 'missing-disclosure'), true)

const markdown = toMarkdown(review)
assert.equal(markdown.includes('# Voice Turn QA Lab'), true)
assert.equal(markdown.includes('## Retest checklist'), true)
assert.equal(markdown.includes(SIMULATION_DISCLAIMER), true)

console.log('voice turn model tests passed')
