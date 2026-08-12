import playIcon from '../assets/figma/play.svg'
import playLightIcon from '../assets/figma/play-light.svg'
import heartAddFillIcon from '../assets/figma/heart-add-fill.svg'
import heartAddLineIcon from '../assets/figma/heart-add-line.svg'

import type { Track } from '../types'

type TrackRowProps = {
  track: Track
  onPlay?: () => void
  light: boolean
  onRowClick?: () => void
  onDelete?: () => void
  liked?: boolean
  onToggleLike?: () => void
  meta?: string
}

export function TrackRow({ track, onPlay, light, onRowClick, onDelete, liked, onToggleLike, meta }: TrackRowProps) {
  return <div className={onRowClick ? 'track-row clickable-row' : 'track-row'} onClick={onRowClick}>
    <div
      className="artwork"
      style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined}
      aria-hidden="true"
    />
    <div className="track-copy">
      <strong>{track.title}</strong>
      <span>{track.artist}</span>
      {meta && <span className="track-meta">{meta}</span>}
    </div>
    {onDelete && <button className="playlist-delete" onClick={event => { event.stopPropagation(); onDelete() }} aria-label={`${track.title} 삭제`}>삭제</button>}
    {onToggleLike && <button className="icon-button like-button" onClick={event => { event.stopPropagation(); onToggleLike() }} aria-label={liked ? '좋아요 취소' : '좋아요'}><img src={liked ? heartAddFillIcon : heartAddLineIcon} alt="" /></button>}
    <button className="icon-button play-button" disabled={!onPlay} onClick={event => { event.stopPropagation(); onPlay?.() }} aria-label={`${track.title} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}
