import { useState } from 'react'
import playIcon from './assets/figma/play.svg'
import playLightIcon from './assets/figma/play-light.svg'
import pauseIcon from './assets/figma/pause.svg'
import nextIcon from './assets/figma/next.svg'
import homeIcon from './assets/figma/home.svg'
import libraryIcon from './assets/figma/library.svg'
import searchIcon from './assets/figma/search.svg'
import diaryIcon from './assets/figma/diary.svg'
import userIcon from './assets/figma/user.svg'
import './App.css'

type Track = readonly [string, string]

const moods = [
  { name: '차분함', start: '#e0fbf5', middle: '#86ead4', end: '#5bcfb3', chip: '#4fbfa0' },
  { name: '설렘', start: '#fff0f6', middle: '#f6a3c0', end: '#ec5f8c', chip: '#df3f76' },
  { name: '위로', start: '#fff4d1', middle: '#ffd56d', end: '#ffc53d', chip: '#e2a914' },
  { name: '집중', start: '#dff2ff', middle: '#70befb', end: '#0090ff', chip: '#057ed8' },
  { name: '그리움', start: '#e8e8ff', middle: '#9292e4', end: '#5b5bd6', chip: '#4b4bbc' },
]
const recommendations: Track[] = [
  ['Blue Hour', 'KIMDA'],
  ['After Rain', 'Sori'],
]
const recents: Track[] = [
  ['Slow dance', 'Mondo Loops'],
  ['Mellow morning', 'Naru'],
]
const allSearchTracks: Track[] = [
  ['Blue Hour', 'KIMDA'], ['After Rain', 'Sori'], ['Slow dance', 'Mondo Loops'],
]
const tabs = [
  ['홈', homeIcon], ['라이브러리', libraryIcon], ['탐색', searchIcon], ['일기', diaryIcon], ['마이', userIcon],
]

function TrackRow({ track, onPlay, light }: { track: Track; onPlay: () => void; light: boolean }) {
  return <div className="track-row">
    <div className="artwork" aria-hidden="true" />
    <div className="track-copy"><strong>{track[0]}</strong><span>{track[1]}</span></div>
    <button className="icon-button play-button" onClick={onPlay} aria-label={`${track[0]} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}

function App() {
  const [mood, setMood] = useState<typeof moods[number] | null>(null)
  const [tab, setTab] = useState('홈')
  const [query, setQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('전체')
  const [playing, setPlaying] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [track, setTrack] = useState<Track>(recommendations[0])
  const selectTrack = (nextTrack: Track) => { setTrack(nextTrack); setPlaying(true) }
  const searchResults = allSearchTracks.filter(item => item[0].toLowerCase().includes(query.toLowerCase()) || item[1].toLowerCase().includes(query.toLowerCase()))

  const moodStyle = mood ? {
    '--mood-start': mood.start, '--mood-middle': mood.middle, '--mood-end': mood.end, '--mood-chip': mood.chip,
  } as React.CSSProperties : undefined
  return <main className={mood ? 'phone-shell mood-active' : 'phone-shell'} style={moodStyle}>
    <div className="status-bar" />
    {tab === '탐색' || tab === '라이브러리' ? <header className="search-header"><span>음악 일기</span><h1>{tab}</h1></header> : <header className="app-header"><span className="logo-mark" /><h1>음악 일기</h1></header>}
    <section className={tab === '탐색' || tab === '라이브러리' ? 'content search-content' : 'content'} aria-label={`${tab} 화면`}>
      {tab === '홈' ? <>
        <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
          {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
        </div></section>
        <section className="music-section"><h2>오늘의 추천</h2>{recommendations.map(item => <TrackRow key={item[0]} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
        <section className="music-section"><h2>최근 재생</h2>{recents.map(item => <TrackRow key={item[0]} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
      </> : tab === '라이브러리' ? <>
        <div className="library-filters">{['전체', '좋아요', '최근재생'].map(filter => <button key={filter} onClick={() => setLibraryFilter(filter)} className={libraryFilter === filter ? 'library-filter active-filter' : 'library-filter'}>{filter}</button>)}</div>
        <section className="library-tracks">{recommendations.map(item => <TrackRow key={item[0]} track={item} light={false} onPlay={() => selectTrack(item)} />)}</section>
        <section className="playlist-section"><div className="playlist-heading"><h2>내 플레이리스트</h2><button onClick={() => undefined}>+ 만들기</button></div><TrackRow track={['아침의 공기', '곡 12개']} light={false} onPlay={() => selectTrack(['Blue Hour', 'KIMDA'])} /><TrackRow track={['비 오는 날', '곡 8개']} light={false} onPlay={() => selectTrack(['After Rain', 'Sori'])} /></section>
      </> : tab === '탐색' ? <>
        <label className="search-field"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색" aria-label="음악 검색" /></label>
        <section className="search-results" aria-live="polite">{searchResults.slice(0, 2).map(item => <TrackRow key={item[0]} track={item} light={false} onPlay={() => selectTrack(item)} />)}{searchResults.length === 0 && <p className="no-results">검색 결과가 없어요.</p>}</section>
      </> : <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
    </section>
    <button className="mini-player" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기">
      <span className="artwork mini-art" /><span className="mini-copy"><strong>{track[0]}</strong><span>{track[1]}</span></span>
      <span className="mini-control"><img src={playing ? pauseIcon : playIcon} alt="" /></span><img className="next-icon" src={nextIcon} alt="" />
    </button>
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => setTab(name)}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
    {playerOpen && <div className="player-overlay" onClick={() => setPlayerOpen(false)}><section className="player-sheet" onClick={event => event.stopPropagation()} aria-label="전체 플레이어">
      <button className="sheet-close" onClick={() => setPlayerOpen(false)} aria-label="플레이어 닫기">×</button><div className="sheet-artwork" /><h2>{track[0]}</h2><p>{track[1]}</p><input aria-label="재생 위치" type="range" defaultValue="28" /><div className="time-row"><span>1:04</span><span>3:42</span></div><div className="sheet-controls"><button aria-label="이전 곡">‹‹</button><button className="sheet-play" onClick={() => setPlaying(!playing)}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡">››</button></div></section></div>}
  </main>
}

export default App
