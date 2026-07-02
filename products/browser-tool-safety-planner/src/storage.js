import { STORAGE_KEYS } from './model.js'

export function storageAvailable() {
  try {
    const testKey = 'browser-tool-safety-planner:storage-test'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export function loadLastBrief() {
  return loadJson(STORAGE_KEYS.lastBrief)
}

export function saveLastBrief(brief) {
  return saveJson(STORAGE_KEYS.lastBrief, brief)
}

export function clearSavedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.lastBrief)
    window.localStorage.removeItem(STORAGE_KEYS.draftProfile)
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

export function loadDraftProfile() {
  return loadJson(STORAGE_KEYS.draftProfile)
}

export function saveDraftProfile(profile) {
  return saveJson(STORAGE_KEYS.draftProfile, profile)
}

function loadJson(key) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { ok: true, value: null }
    return { ok: true, value: JSON.parse(raw) }
  } catch (error) {
    return { ok: false, error, value: null }
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}
