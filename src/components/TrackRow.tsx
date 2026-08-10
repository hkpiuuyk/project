import playIcon from '../assets/figma/play.svg'
import playLightIcon from '../assets/figma/play-light.svg'

import type { Track } from '../types'

type TrackRowProps = {
  track: Track
  onPlay?: () => void
  light: boolean
  onRowClick?: () => void
  onDelete?: () => void
}

export function TrackRow({ track, onPlay, light, onRowClick, onDelete }: TrackRowProps) {
  return <div className={onRowClick ? 'track-row clickable-row' : 'track-row'} onClick={onRowClick}>
    <div
      className="artwork"
      style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined}
      aria-hidden="true"
    />
    <div className="track-copy">
      <strong>{track.title}</strong>
      <span>{track.artist}</span>
    </div>
    {onDelete && <button className="playlist-delete" onClick={event => { event.stopPropagation(); onDelete() }} aria-label={`${track.title} 삭제`}>삭제</button>}
    <button className="icon-button play-button" disabled={!onPlay} onClick={event => { event.stopPropagation(); onPlay?.() }} aria-label={`${track.title} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}
