import { useEffect, useState, type CSSProperties } from 'react'

import backIcon from './assets/figma/back.svg'
import './App.css'
import './styles/shared.css'
import { tabs } from './data'
import { usePersistentState } from './hooks/usePersistentState'
import { usePlayer } from './hooks/usePlayer'
import { loadDiaryEntries, loadPlaylists, loadTrackAudio, loadTracks, saveDiaryEntries, savePlaylists, saveTracks } from './lib/storage'
import { Player } from './components/Player'
import { DiaryScreen } from './screens/DiaryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { MyScreen } from './screens/MyScreen'
import { SearchScreen } from './screens/SearchScreen'
import type { Mood } from './types'

function App() {
  const [mood, setMood] = useState<Mood | null>(null)
  const [tab, setTab] = useState('홈')
  const [allSearchTracks, setAllSearchTracks] = usePersistentState(loadTracks, saveTracks)
  const [playlists, setPlaylists] = usePersistentState(loadPlaylists, savePlaylists)
  const [diaryEntries, setDiaryEntries] = usePersistentState(loadDiaryEntries, saveDiaryEntries)
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [diaryWriting, setDiaryWriting] = useState(false)
  const [myScreen, setMyScreen] = useState<'main' | 'diaries' | 'settings' | 'terms'>('main')
  const player = usePlayer(allSearchTracks)

  useEffect(() => {
    let active = true
    Promise.all(allSearchTracks.map(async track => {
      const audio = await loadTrackAudio(track.id)
      return audio ? { ...track, audioUrl: URL.createObjectURL(audio) } : null
    })).then(tracks => {
      if (active) setAllSearchTracks(tracks.filter(Boolean) as typeof allSearchTracks)
    })
    return () => { active = false }
  }, [])

  const openPlaylist = activePlaylistId ? playlists.find(playlist => playlist.id === activePlaylistId) : undefined
  const moodStyle = mood ? {
    '--mood-start': mood.start, '--mood-middle': mood.middle, '--mood-end': mood.end, '--mood-chip': mood.chip,
  } as CSSProperties : undefined
  const baseScreenVisible = !activePlaylistId && !diaryWriting && myScreen === 'main'

  return <main className={mood ? 'phone-shell mood-active' : 'phone-shell'} style={moodStyle}>
    <div className="status-bar" />
    {activePlaylistId ? <header className="playlist-detail-header"><button onClick={() => setActivePlaylistId(null)} aria-label="라이브러리로 돌아가기"><img src={backIcon} alt="" /></button><h1>{openPlaylist?.name ?? ''}</h1></header> : diaryWriting ? <header className="playlist-detail-header"><button onClick={() => setDiaryWriting(false)} aria-label="일기 목록으로 돌아가기"><img src={backIcon} alt="" /></button><h1>일기 쓰기</h1></header> : myScreen !== 'main' ? <header className="playlist-detail-header"><button onClick={() => setMyScreen('main')} aria-label="마이로 돌아가기"><img src={backIcon} alt="" /></button><h1>{myScreen === 'diaries' ? '작성한 일기' : myScreen === 'settings' ? '재생 설정' : '이용약관'}</h1></header> : tab === '탐색' || tab === '라이브러리' || tab === '일기' || tab === '마이' ? <header className="search-header"><span>음악 일기</span><h1>{tab}</h1>{tab === '일기' && <button className="diary-write-button" onClick={() => setDiaryWriting(true)}>일기 쓰기</button>}</header> : <header className="app-header"><span className="logo-mark" /><h1>음악 일기</h1></header>}
    <div className="content-area">
      <div className="mood-backdrop" aria-hidden="true">
        <div className="mood-orbs">
          <span className="mood-orb orb-1" />
          <span className="mood-orb orb-2" />
          <span className="mood-orb orb-3" />
        </div>
      </div>
      <section className={activePlaylistId ? 'content playlist-detail-content' : tab === '탐색' || tab === '라이브러리' || tab === '일기' || tab === '마이' ? 'content search-content' : 'content'} aria-label={`${tab} 화면`}>
        <LibraryScreen visible={Boolean(activePlaylistId) || (baseScreenVisible && tab === '라이브러리')} allSearchTracks={allSearchTracks} setAllSearchTracks={setAllSearchTracks} playlists={playlists} setPlaylists={setPlaylists} activePlaylistId={activePlaylistId} setActivePlaylistId={setActivePlaylistId} setQueue={player.setQueue} selectTrack={player.selectTrack} playQueue={player.playQueue} />
        <DiaryScreen visible={!activePlaylistId && (diaryWriting || (baseScreenVisible && tab === '일기'))} diaryWriting={diaryWriting} setDiaryWriting={setDiaryWriting} diaryEntries={diaryEntries} setDiaryEntries={setDiaryEntries} track={player.track} setQueue={player.setQueue} selectTrack={player.selectTrack} />
        <MyScreen visible={!activePlaylistId && !diaryWriting && (myScreen !== 'main' || (baseScreenVisible && tab === '마이'))} myScreen={myScreen} setMyScreen={setMyScreen} autoplay={player.autoplay} setAutoplay={player.setAutoplay} playlists={playlists} diaryEntries={diaryEntries} setQueue={player.setQueue} selectTrack={player.selectTrack} />
        <HomeScreen visible={baseScreenVisible && tab === '홈'} mood={mood} setMood={setMood} tracks={allSearchTracks} playQueue={player.playQueue} />
        <SearchScreen visible={baseScreenVisible && tab === '탐색'} tracks={allSearchTracks} playQueue={player.playQueue} />
        {!activePlaylistId && !diaryWriting && myScreen === 'main' && !tabs.some(([name]) => name === tab) && <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
      </section>
    </div>
    <Player {...player} />
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => { setActivePlaylistId(null); setDiaryWriting(false); setMyScreen('main'); setTab(name) }}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
  </main>
}

export default App
