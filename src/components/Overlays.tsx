import type { Banner, GameSnapshot } from '../game/types'
import { formatScore } from '../game/math'
import {
  ArrowIcon,
  BoltIcon,
  CrosshairIcon,
  HeartIcon,
  PlayIcon,
  SkullIcon,
  SoundOffIcon,
  SoundOnIcon,
} from './Icons'

interface StartScreenProps {
  best: number
  muted: boolean
  onStart: () => void
  onMute: () => void
}

export function StartScreen({
  best,
  muted,
  onStart,
  onMute,
}: StartScreenProps) {
  return (
    <section className="screen screen--start" aria-label="Start screen">
      <div className="start-top">
        <div className="status-chip">
          <span className="status-chip__dot" />
          BRIDGE 07 · CONTAINMENT FAILED
        </div>
        <button
          type="button"
          className="icon-button icon-button--light"
          onClick={onMute}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        >
          {muted ? <SoundOffIcon size={18} /> : <SoundOnIcon size={18} />}
        </button>
      </div>

      <div className="start-hero">
        <div className="start-kicker">THE LAST EXIT IS A KILL ZONE</div>
        <h1 className="game-title">
          <span>DEAD</span>
          <span>LANE</span>
        </h1>
        <p className="game-tagline">Three lanes. Zero mercy.</p>
      </div>

      <div className="start-bottom">
        <p className="start-brief">
          Shoot gates to upgrade your gun.
          <br />
          Red zombies change lanes. Do not let them cross the red HOME LINE.
        </p>

        <button type="button" className="button button--primary" onClick={onStart}>
          <span>DEPLOY</span>
          <ArrowIcon size={20} />
        </button>

        <div className="control-strip">
          <div className="control-strip__item">
            <div className="control-strip__keys">
              <kbd>A</kbd>
              <kbd>D</kbd>
              <span className="control-strip__or">/ DRAG</span>
            </div>
            <small>SWITCH LANE</small>
          </div>
          <div className="control-strip__item">
            <CrosshairIcon size={22} />
            <small>AUTO-FIRE</small>
          </div>
          <div className="control-strip__item">
            <div className="control-strip__keys">
              <kbd className="kbd--wide">SPACE</kbd>
            </div>
            <small>DASH</small>
          </div>
        </div>

        <div className="start-meta">
          <span>
            BEST RUN <strong>{formatScore(best)}</strong>
          </span>
          <span className="start-meta__build">v0.3 · THREE-LANE</span>
        </div>
      </div>
    </section>
  )
}

interface PauseScreenProps {
  snapshot: GameSnapshot
  onResume: () => void
  onRestart: () => void
  onMute: () => void
}

export function PauseScreen({
  snapshot,
  onResume,
  onRestart,
  onMute,
}: PauseScreenProps) {
  return (
    <section className="screen screen--modal" aria-label="Game paused">
      <div className="modal-card">
        <span className="eyebrow">RUN SUSPENDED</span>
        <h2 className="modal-title">PAUSED</h2>
        <p className="modal-copy">
          The horde is still out there. Take a breath.
        </p>

        <div className="modal-stats">
          <div>
            <span>WAVE</span>
            <strong>{String(snapshot.wave).padStart(2, '0')}</strong>
          </div>
          <div>
            <span>SCORE</span>
            <strong>{formatScore(snapshot.score)}</strong>
          </div>
          <div>
            <span>KILLS</span>
            <strong>{snapshot.kills}</strong>
          </div>
        </div>

        <button
          type="button"
          className="button button--primary"
          onClick={onResume}
        >
          <PlayIcon size={17} />
          <span>RESUME</span>
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={onRestart}
        >
          RESTART RUN
        </button>

        <button
          type="button"
          className="sound-toggle"
          onClick={onMute}
        >
          {snapshot.muted ? <SoundOffIcon size={16} /> : <SoundOnIcon size={16} />}
          {snapshot.muted ? 'SOUND OFF' : 'SOUND ON'}
        </button>
      </div>
    </section>
  )
}

interface GameOverScreenProps {
  snapshot: GameSnapshot
  onRestart: () => void
  onMute: () => void
}

export function GameOverScreen({
  snapshot,
  onRestart,
  onMute,
}: GameOverScreenProps) {
  const isBest = snapshot.score > 0 && snapshot.score >= snapshot.best

  return (
    <section className="screen screen--gameover" aria-label="Game over">
      <div className="gameover-card">
        <div className="gameover-icon">
          <SkullIcon size={32} />
        </div>
        <span className="eyebrow eyebrow--danger">RUN TERMINATED</span>
        <h2 className="gameover-title">OVERRUN</h2>
        <p className="gameover-copy">They got through. The bridge is lost.</p>

        {isBest && <div className="record-badge">NEW BEST RUN</div>}

        <div className="result-grid">
          <div className="result-grid__score">
            <span>FINAL SCORE</span>
            <strong>{formatScore(snapshot.score)}</strong>
          </div>
          <div>
            <span>BEST</span>
            <strong>{formatScore(snapshot.best)}</strong>
          </div>
          <div>
            <span>WAVE</span>
            <strong>{String(snapshot.wave).padStart(2, '0')}</strong>
          </div>
          <div>
            <span>KILLS</span>
            <strong>{snapshot.kills}</strong>
          </div>
        </div>

        <button
          type="button"
          className="button button--primary"
          onClick={onRestart}
        >
          <BoltIcon size={17} />
          <span>REDEPLOY</span>
        </button>
        <button type="button" className="sound-toggle" onClick={onMute}>
          {snapshot.muted ? <SoundOffIcon size={16} /> : <SoundOnIcon size={16} />}
          {snapshot.muted ? 'SOUND OFF' : 'SOUND ON'}
        </button>

        <div className="gameover-footer">
          <HeartIcon size={13} />
          <span>THE BRIDGE REMEMBERS</span>
        </div>
      </div>
    </section>
  )
}

export function OverrunFlash() {
  return (
    <div className="overrun-flash" role="alert" aria-live="assertive">
      <SkullIcon size={30} />
      <span>CONTACT LOST</span>
      <strong>SWARMED</strong>
      <small>THEY REACHED YOU</small>
    </div>
  )
}

export function WaveBanner({
  banner,
}: {
  banner: Pick<Banner, 'key' | 'title' | 'subtitle'>
}) {
  return (
    <div className="wave-banner" role="status" aria-live="polite">
      <strong>{banner.title}</strong>
      <span>{banner.subtitle}</span>
    </div>
  )
}
