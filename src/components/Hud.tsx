import type { CSSProperties } from 'react'
import { GAME } from '../game/config'
import type { GameSnapshot } from '../game/types'
import { formatScore } from '../game/math'
import {
  BoltIcon,
  HeartIcon,
  PauseIcon,
  SoundOffIcon,
  SoundOnIcon,
} from './Icons'

interface HudProps {
  snapshot: GameSnapshot
  onPause: () => void
  onMute: () => void
  onDash: () => void
}

export function Hud({ snapshot, onPause, onMute, onDash }: HudProps) {
  const hpPercent = (snapshot.hp / snapshot.maxHp) * 100
  const healthTone =
    hpPercent <= 30 ? 'is-danger' : hpPercent <= 60 ? 'is-warning' : ''
  const waveProgress =
    snapshot.enemiesTotal > 0
      ? 1 - snapshot.enemiesRemaining / snapshot.enemiesTotal
      : 0
  const cooldownSeconds = Math.ceil(
    (1 - snapshot.dashProgress) * GAME.player.dashCooldown,
  )
  const dashRing = `conic-gradient(${
    snapshot.dashReady ? 'var(--lime)' : 'var(--cyan)'
  } ${snapshot.dashProgress * 360}deg, rgba(221, 255, 244, 0.12) 0deg)`
  const dashStyle: CSSProperties = { background: dashRing }

  return (
    <div className="hud">
      <div className="hud__top">
        <div className={`health ${healthTone}`}>
          <div className="health__meta">
            <HeartIcon size={15} />
            <strong>{snapshot.hp}</strong>
            <span>VITALS</span>
          </div>
          <div className="health__track">
            <div
              className="health__fill"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        <div className="wave-chip">
          <span className="wave-chip__label">WAVE</span>
          <strong>{String(snapshot.wave).padStart(2, '0')}</strong>
          <span className="wave-chip__left">
            {snapshot.enemiesRemaining > 0
              ? `${snapshot.enemiesRemaining} LEFT`
              : 'CLEAR'}
          </span>
          <div className="wave-chip__track">
            <div
              className="wave-chip__fill"
              style={{ width: `${Math.max(0, waveProgress) * 100}%` }}
            />
          </div>
        </div>

        <div className="score-panel">
          <span className="score-panel__label">SCORE</span>
          <strong>{formatScore(snapshot.score)}</strong>
          <span className="score-panel__best">
            BEST {formatScore(snapshot.best)}
          </span>
        </div>
      </div>

      <div className="hud__tools">
        <button
          className="icon-button"
          type="button"
          aria-label="Pause game"
          onClick={onPause}
        >
          <PauseIcon size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={snapshot.muted ? 'Turn sound on' : 'Turn sound off'}
          onClick={onMute}
        >
          {snapshot.muted ? (
            <SoundOffIcon size={18} />
          ) : (
            <SoundOnIcon size={18} />
          )}
        </button>
      </div>

      {snapshot.combo > 1 && (
        <div className="combo" aria-label={`${snapshot.combo} kill streak`}>
          <span key={snapshot.combo} className="combo__value">
            ×{snapshot.multiplier.toFixed(2).replace(/\.?0+$/, '')}
          </span>
          <span className="combo__label">{snapshot.combo} STREAK</span>
        </div>
      )}

      {snapshot.overdrive > 0 && (
        <div
          className="buff-chip"
          aria-label={`Overdrive active, ${snapshot.overdrive.toFixed(1)} seconds`}
        >
          <BoltIcon size={13} />
          <span>OVERDRIVE</span>
          <strong>{snapshot.overdrive.toFixed(1)}s</strong>
        </div>
      )}

      {snapshot.grabbed && (
        <div className="grab-warning" role="alert">
          <BoltIcon size={14} />
          <span>GRABBED</span>
          <small>
            {snapshot.dashReady ? 'DASH TO BREAK FREE' : 'DASH RECHARGING'}
          </small>
          <i
            className="grab-warning__timer"
            style={{
              transform: `scaleX(${Math.max(
                0,
                Math.min(1, snapshot.grabTime / GAME.contact.grabDuration),
              )})`,
            }}
          />
        </div>
      )}

      <div className="hud__bottom">
        <div className="hud__hint">
          <span className="hud__hint-key">A</span>
          <span className="hud__hint-key">D</span>
          <span className="hud__hint-divider">/</span>
          <span>DRAG</span>
          <span className="hud__hint-divider">·</span>
          <span>AUTO-FIRE</span>
        </div>

        <button
          type="button"
          className={`dash-button ${snapshot.dashReady ? 'is-ready' : ''}`}
          style={dashStyle}
          onClick={onDash}
          aria-label={snapshot.dashReady ? 'Dash' : `Dash recharging, ${cooldownSeconds} seconds`}
        >
          <span className="dash-button__inner">
            <BoltIcon size={17} />
            <strong>
              {snapshot.dashReady ? 'DASH' : `${cooldownSeconds}s`}
            </strong>
            <small>BOOST</small>
          </span>
        </button>
      </div>
    </div>
  )
}
