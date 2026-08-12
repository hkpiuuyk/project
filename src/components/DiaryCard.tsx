import diaryPlayIcon from '../assets/figma/diary-play.svg'
import './DiaryCard.css'

import type { DiaryEntry, Track } from '../types'

type DiaryCardProps = {
  entry: DiaryEntry
  allSearchTracks: Track[]
  onPlay: (entry: DiaryEntry) => void
}

export function DiaryCard({ entry, allSearchTracks, onPlay }: DiaryCardProps) {
  const displayTrack = allSearchTracks.find(item => item.id === entry.track.id) ?? entry.track
  return <article className="diary-card" key={entry.id}>
    <div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div>
    <p>{entry.text}</p>
    <div className="diary-track">
      <span className="artwork" style={displayTrack.coverUrl ? { backgroundImage: `url(${displayTrack.coverUrl})`, backgroundSize: 'cover' } : undefined} />
      <span className="track-copy"><strong>{displayTrack.title}</strong><span>{displayTrack.artist}</span></span>
      <button className="icon-button play-button" onClick={() => onPlay(entry)} aria-label={`${displayTrack.title} 재생`}><img src={diaryPlayIcon} alt="" /></button>
    </div>
  </article>
}
