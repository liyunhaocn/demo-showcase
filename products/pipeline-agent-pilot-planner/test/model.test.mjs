import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPilotPlan,
  normalizePilotInputs,
  scorePipelineAgentPilot,
} from '../src/model.mjs'

const completePilot = {
  orgName: 'Northstar Revenue',
  crmSystem: 'Salesforce Sales Cloud',
  segment: 'Mid-market outbound',
  objective: 'recover-stalled-deals',
  pipelineValue: '4200000',
  winRate: '24',
  cycleDays: '51',
  staleDeals: '31',
  dataQuality: 'good',
  ownerCoverage: 'named',
  compliancePosture: 'approval-needed',
  agentScope: 'next-best-action',
  blockers: 'security review, manager adoption',
}

test('normalizes numeric and categorical pilot inputs', () => {
  const normalized = normalizePilotInputs(completePilot)

  assert.equal(normalized.pipelineValue, 4200000)
  assert.equal(normalized.winRate, 24)
  assert.equal(normalized.staleDeals, 31)
  assert.equal(normalized.dataQuality, 'good')
})

test('scores a complete CRM agent pilot with deployable readiness', () => {
  const score = scorePipelineAgentPilot(normalizePilotInputs(completePilot))

  assert.equal(score.readiness, 83)
  assert.equal(score.roiIndex, 87)
  assert.equal(score.riskLevel, 'Medium')
  assert.deepEqual(score.gates.slice(0, 2), [
    'Run sandbox-only agent suggestions on stalled opportunities for 10 business days.',
    'Require sales-manager approval before any CRM field is changed by an agent.',
  ])
})

test('builds a deterministic pilot brief with weekly milestones', () => {
  const plan = buildPilotPlan(completePilot)

  assert.equal(plan.orgName, 'Northstar Revenue')
  assert.equal(plan.summary.recommendedPilot, 'next-best-action')
  assert.equal(plan.milestones.length, 4)
  assert.match(plan.markdown, /Pipeline Agent Pilot Planner/)
  assert.match(plan.markdown, /Readiness score: 83/)
})
