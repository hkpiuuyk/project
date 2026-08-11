import { useState } from 'react'
import './SearchScreen.css'

import { TrackRow } from '../components/TrackRow'
import type { Track } from '../types'

type SearchScreenProps = {
  visible: boolean
  tracks: Track[]
  playQueue: (trackIds: string[], startIndex: number) => void
}

export function SearchScreen({ visible, tracks, playQueue }: SearchScreenProps) {
  const [query, setQuery] = useState('')
  const searchResults = tracks.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.artist.toLowerCase().includes(query.toLowerCase()))

  if (!visible) return null
  return <>
    <label className="search-field"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색" aria-label="음악 검색" /></label>
    <section className="search-results" aria-live="polite">{searchResults.map(item => <TrackRow key={item.id} track={item} light={false} onPlay={() => playQueue(searchResults.map(current => current.id), searchResults.findIndex(current => current.id === item.id))} />)}{searchResults.length === 0 && <p className="no-results">검색 결과가 없어요.</p>}</section>
  </>
}
