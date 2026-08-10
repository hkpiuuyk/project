import diaryPlayIcon from '../assets/figma/diary-play.svg'

import type { DiaryEntry } from '../types'

type DiaryCardProps = {
  entry: DiaryEntry
  onPlay: (entry: DiaryEntry) => void
}

export function DiaryCard({ entry, onPlay }: DiaryCardProps) {
  return <article className="diary-card" key={entry.id}>
    <div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div>
    <p>{entry.text}</p>
    <div className="diary-track">
      <span className="artwork" style={entry.track.coverUrl ? { backgroundImage: `url(${entry.track.coverUrl})`, backgroundSize: 'cover' } : undefined} />
      <span className="track-copy"><strong>{entry.track.title}</strong><span>{entry.track.artist}</span></span>
      <button className="icon-button play-button" onClick={() => onPlay(entry)} aria-label={`${entry.track.title} 재생`}><img src={diaryPlayIcon} alt="" /></button>
    </div>
  </article>
}
