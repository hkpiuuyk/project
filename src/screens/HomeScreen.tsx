import type { Dispatch, SetStateAction } from 'react'
import './HomeScreen.css'

import { moods } from '../data'
import { TrackRow } from '../components/TrackRow'
import type { Mood, Track } from '../types'

type HomeScreenProps = {
  visible: boolean
  mood: Mood | null
  setMood: Dispatch<SetStateAction<Mood | null>>
  tracks: Track[]
  playQueue: (trackIds: string[], startIndex: number) => void
}

export function HomeScreen({ visible, mood, setMood, tracks, playQueue }: HomeScreenProps) {
  if (!visible) return null
  return <>
    <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
      {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
    </div></section>
    <section className="music-section"><h2>오늘의 추천</h2>{tracks.slice(0, 2).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => playQueue(tracks.map(current => current.id), tracks.findIndex(current => current.id === item.id))} />)}{tracks.length === 0 && <p className="no-results">업로드한 음악이 없어요.</p>}</section>
    <section className="music-section"><h2>최근 재생</h2>{tracks.slice(2, 4).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => playQueue(tracks.map(current => current.id), tracks.findIndex(current => current.id === item.id))} />)}</section>
  </>
}
