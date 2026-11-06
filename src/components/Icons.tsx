import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function iconProps({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SoundOnIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

export function SoundOffIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" stroke="none" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  )
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

export function CrosshairIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M13.2 2 5 13.2h5.4L9.8 22 19 10.2h-5.6L13.2 2Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function SkullIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5.5 10a6.5 6.5 0 1 1 13 0c0 2.1-1 3.3-2.2 4.3-.7.6-1 1.2-1 2.2h-6.6c0-1-.3-1.6-1-2.2C6.5 13.3 5.5 12.1 5.5 10Z" />
      <circle cx="9.2" cy="9.6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="9.6" r="1.5" fill="currentColor" stroke="none" />
      <path d="M10.5 20v-3.5M13.5 20v-3.5" />
    </svg>
  )
}
