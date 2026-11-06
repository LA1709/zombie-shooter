const BEST_SCORE_KEY = 'deadlane.best-score'
const MUTED_KEY = 'deadlane.muted'

export function loadBestScore(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.round(score)))
  } catch {
    // Storage is optional. The run still works without it.
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    // Storage is optional.
  }
}
