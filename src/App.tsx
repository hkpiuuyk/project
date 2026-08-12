import { useEffect, useRef, useState, type CSSProperties } from 'react'

import backIcon from './assets/figma/back.svg'
import './App.css'
import './styles/shared.css'
import { tabs } from './data'
import { usePersistentState } from './hooks/usePersistentState'
import { usePlayer } from './hooks/usePlayer'
import { loadDiaryEntries, loadMood, loadPlayHistory, loadPlaylists, loadTrackAudio, loadTrackCover, loadTracks, saveDiaryEntries, saveMood, savePlayHistory, savePlaylists, saveTracks } from './lib/storage'
import { Player } from './components/Player'
import { DiaryScreen } from './screens/DiaryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { MyScreen } from './screens/MyScreen'
import { SearchScreen } from './screens/SearchScreen'
function App() {
  const [mood, setMood] = usePersistentState(loadMood, saveMood)
  const [tab, setTab] = useState('홈')
  const [allSearchTracks, setAllSearchTracks] = usePersistentState(loadTracks, saveTracks)
  const [playlists, setPlaylists] = usePersistentState(loadPlaylists, savePlaylists)
  const [diaryEntries, setDiaryEntries] = usePersistentState(loadDiaryEntries, saveDiaryEntries)
  const [playHistory, setPlayHistory] = usePersistentState(loadPlayHistory, savePlayHistory)
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [diaryWriting, setDiaryWriting] = useState(false)
  const [myScreen, setMyScreen] = useState<'main' | 'diaries' | 'settings' | 'terms' | 'credits'>('main')
  const initialSearchTracks = useRef(allSearchTracks)
  const recordPlay = (trackId: string) => {
    setPlayHistory(current => [{ trackId, playedAt: Date.now() }, ...current].slice(0, 100))
  }
  const player = usePlayer(allSearchTracks, recordPlay)
  const likedPlaylist = playlists.find(playlist => playlist.isLiked)
  const likedTrackIds = likedPlaylist?.trackIds ?? []

  const toggleLike = (trackId: string) => {
    setPlaylists(current => {
      const existing = current.find(playlist => playlist.isLiked)
      if (!existing) return [...current, { id: crypto.randomUUID(), name: '좋아요', trackIds: [trackId], isLiked: true }]
      return current.map(playlist => playlist.isLiked
        ? { ...playlist, trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds.filter(id => id !== trackId) : [...playlist.trackIds, trackId] }
        : playlist)
    })
  }

  useEffect(() => {
    let active = true
    const createdObjectUrls: string[] = []

    const revokeCreatedObjectUrls = () => {
      createdObjectUrls.forEach(url => URL.revokeObjectURL(url))
      createdObjectUrls.length = 0
    }

    void Promise.all(initialSearchTracks.current.map(async track => {
      try {
        const [audio, cover] = await Promise.all([loadTrackAudio(track.id), loadTrackCover(track.id)])
        if (!active) return null
        const patch: { id: string; audioUrl?: string; coverUrl?: string } = { id: track.id }
        if (audio) {
          const audioUrl = URL.createObjectURL(audio)
          createdObjectUrls.push(audioUrl)
          patch.audioUrl = audioUrl
        }
        if (cover) {
          const coverUrl = URL.createObjectURL(cover)
          createdObjectUrls.push(coverUrl)
          patch.coverUrl = coverUrl
        }
        return patch
      } catch (error) {
        console.error(`Failed to load media for track ${track.id}`, error)
        return null
      }
    })).then(hydratedTracks => {
      if (!active) return
      const patchesByTrackId = new Map(hydratedTracks.filter((t): t is NonNullable<typeof t> => t !== null).map(t => [t.id, t]))
      setAllSearchTracks(current => current.map(track => {
        const patch = patchesByTrackId.get(track.id)
        if (!patch) return track
        return { ...track, ...(patch.audioUrl ? { audioUrl: patch.audioUrl } : {}), ...(patch.coverUrl ? { coverUrl: patch.coverUrl } : {}) }
      }))
    }).catch(error => {
      if (active) console.error('Failed to hydrate track media', error)
    })

    return () => {
      active = false
      revokeCreatedObjectUrls()
    }
  }, [setAllSearchTracks])

  const openPlaylist = activePlaylistId ? playlists.find(playlist => playlist.id === activePlaylistId) : undefined
  const moodStyle = mood ? {
    '--mood-start': mood.start, '--mood-middle': mood.middle, '--mood-end': mood.end, '--mood-chip': mood.chip,
  } as CSSProperties : undefined
  const baseScreenVisible = !activePlaylistId && !diaryWriting && myScreen === 'main'

  return <main className={mood ? 'phone-shell mood-active' : 'phone-shell'} style={moodStyle}>
    <p className="large-screen-warning">이 앱은 모바일·태블릿 화면에 맞춰 만들어졌어요. 더 큰 화면에서는 레이아웃이 깨질 수 있어요.</p>
    {activePlaylistId ? <header className="playlist-detail-header"><button onClick={() => setActivePlaylistId(null)} aria-label="라이브러리로 돌아가기"><img src={backIcon} alt="" /></button><h1>{openPlaylist?.name ?? ''}</h1></header> : diaryWriting ? <header className="playlist-detail-header"><button onClick={() => setDiaryWriting(false)} aria-label="일기 목록으로 돌아가기"><img src={backIcon} alt="" /></button><h1>일기 쓰기</h1></header> : myScreen !== 'main' ? <header className="playlist-detail-header"><button onClick={() => setMyScreen('main')} aria-label="마이로 돌아가기"><img src={backIcon} alt="" /></button><h1>{myScreen === 'diaries' ? '작성한 일기' : myScreen === 'settings' ? '재생 설정' : myScreen === 'credits' ? '크레딧' : '이용약관'}</h1></header> : tab === '탐색' || tab === '라이브러리' || tab === '일기' || tab === '마이' ? <header className="search-header"><span>음악 일기</span><h1>{tab}</h1>{tab === '일기' && <button className="diary-write-button" onClick={() => setDiaryWriting(true)}>일기 쓰기</button>}</header> : <header className="app-header"><span className="logo-mark" /><h1>음악 일기</h1></header>}
    <div className="content-area">
      <div className="mood-backdrop" aria-hidden="true">
        <div className="mood-orbs">
          <span className="mood-orb orb-1" />
          <span className="mood-orb orb-2" />
          <span className="mood-orb orb-3" />
        </div>
      </div>
      <section key={`${activePlaylistId ?? myScreen}:${diaryWriting}:${tab}`} className={activePlaylistId ? 'content playlist-detail-content screen-transition' : tab === '탐색' || tab === '라이브러리' || tab === '일기' || tab === '마이' ? 'content search-content screen-transition' : 'content screen-transition'} aria-label={`${tab} 화면`}>
        <LibraryScreen visible={Boolean(activePlaylistId) || (baseScreenVisible && tab === '라이브러리')} allSearchTracks={allSearchTracks} setAllSearchTracks={setAllSearchTracks} playlists={playlists} setPlaylists={setPlaylists} activePlaylistId={activePlaylistId} setActivePlaylistId={setActivePlaylistId} playQueue={player.playQueue} likedTrackIds={likedTrackIds} toggleLike={toggleLike} playHistory={playHistory} />
        <DiaryScreen visible={!activePlaylistId && (diaryWriting || (baseScreenVisible && tab === '일기'))} diaryWriting={diaryWriting} setDiaryWriting={setDiaryWriting} diaryEntries={diaryEntries} setDiaryEntries={setDiaryEntries} track={player.track} allSearchTracks={allSearchTracks} playQueue={player.playQueue} />
        <MyScreen visible={!activePlaylistId && !diaryWriting && (myScreen !== 'main' || (baseScreenVisible && tab === '마이'))} myScreen={myScreen} setMyScreen={setMyScreen} autoplay={player.autoplay} setAutoplay={player.setAutoplay} playlists={playlists} diaryEntries={diaryEntries} allSearchTracks={allSearchTracks} playQueue={player.playQueue} setTab={setTab} />
        <HomeScreen visible={baseScreenVisible && tab === '홈'} mood={mood} setMood={setMood} tracks={allSearchTracks} playQueue={player.playQueue} likedTrackIds={likedTrackIds} toggleLike={toggleLike} playHistory={playHistory} />
        <SearchScreen visible={baseScreenVisible && tab === '탐색'} tracks={allSearchTracks} playQueue={player.playQueue} likedTrackIds={likedTrackIds} toggleLike={toggleLike} />
        {!activePlaylistId && !diaryWriting && myScreen === 'main' && !tabs.some(([name]) => name === tab) && <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
      </section>
    </div>
    <Player {...player} allSearchTracks={allSearchTracks} />
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => { setActivePlaylistId(null); setDiaryWriting(false); setMyScreen('main'); setTab(name) }}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
  </main>
}

export default App
