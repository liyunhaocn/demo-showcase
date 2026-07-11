export function createStorage({ enabled = true, key = 'voice-turn-qa-lab:last-analysis:v1' } = {}) {
  if (!enabled || typeof window === 'undefined' || !window.localStorage) {
    return {
      available: false,
      load() {
        return { ok: false, reason: 'storage-disabled' }
      },
      save() {
        return { ok: false, reason: 'storage-disabled' }
      },
      clear() {
        return { ok: true }
      },
    }
  }

  return {
    available: true,
    load() {
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return { ok: false, reason: 'empty' }
        return { ok: true, value: JSON.parse(raw) }
      } catch (error) {
        return { ok: false, reason: error?.message || 'load-failed' }
      }
    },
    save(value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
        return { ok: true }
      } catch (error) {
        return { ok: false, reason: error?.message || 'save-failed' }
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(key)
        return { ok: true }
      } catch (error) {
        return { ok: false, reason: error?.message || 'clear-failed' }
      }
    },
  }
}
