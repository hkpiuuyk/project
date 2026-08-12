import type { Dispatch, SetStateAction } from 'react'
import './HomeScreen.css'

import { moods } from '../data'
import { TrackRow } from '../components/TrackRow'
import type { Mood, PlayHistoryEntry, Track } from '../types'

type HomeScreenProps = {
  visible: boolean
  mood: Mood | null
  setMood: Dispatch<SetStateAction<Mood | null>>
  tracks: Track[]
  playQueue: (trackIds: string[], startIndex: number) => void
  likedTrackIds: string[]
  toggleLike: (trackId: string) => void
  playHistory: PlayHistoryEntry[]
}

const formatPlayedAt = (timestamp: number) => {
  const d = new Date(timestamp)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}.${dd} ${hh}:${min}`
}

export function HomeScreen({ visible, mood, setMood, tracks, playQueue, likedTrackIds, toggleLike, playHistory }: HomeScreenProps) {
  const recentlyPlayed = playHistory.reduce<{ track: Track; playedAt: number }[]>((recent, entry) => {
    if (recent.length === 5 || recent.some(item => item.track.id === entry.trackId)) return recent
    const track = tracks.find(item => item.id === entry.trackId)
    return track ? [...recent, { track, playedAt: entry.playedAt }] : recent
  }, [])

  if (!visible) return null
  return <>
    <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
      {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
    </div></section>
    <section className="music-section"><h2>오늘의 추천</h2>{tracks.slice(0, 3).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => playQueue(tracks.map(current => current.id), tracks.findIndex(current => current.id === item.id))} liked={likedTrackIds.includes(item.id)} onToggleLike={() => toggleLike(item.id)} />)}{tracks.length === 0 && <p className="no-results">업로드한 음악이 없어요.</p>}</section>
    <section className="music-section"><h2>최근 재생</h2>{recentlyPlayed.map(({ track, playedAt }) => <TrackRow key={track.id} track={track} light={Boolean(mood)} onPlay={() => playQueue(tracks.map(current => current.id), tracks.findIndex(current => current.id === track.id))} liked={likedTrackIds.includes(track.id)} onToggleLike={() => toggleLike(track.id)} meta={formatPlayedAt(playedAt)} />)}{recentlyPlayed.length === 0 && <p className="no-results">아직 재생한 음악이 없어요.</p>}</section>
  </>
}
