import { useEffect, useState } from 'react'
import playIcon from './assets/figma/play.svg'
import playLightIcon from './assets/figma/play-light.svg'
import pauseIcon from './assets/figma/pause.svg'
import nextIcon from './assets/figma/next.svg'
import homeIcon from './assets/figma/home.svg'
import libraryIcon from './assets/figma/library.svg'
import searchIcon from './assets/figma/search.svg'
import diaryIcon from './assets/figma/diary.svg'
import userIcon from './assets/figma/user.svg'
import closeIcon from './assets/figma/close.svg'
import checkboxCircleIcon from './assets/figma/checkbox-circle.svg'
import backIcon from './assets/figma/back.svg'
import orderIcon from './assets/figma/order.svg'
import diaryPlayIcon from './assets/figma/diary-play.svg'
import './App.css'

type Track = readonly [string, string]
type DiaryEntry = { date: string; mood: string; text: string; track: Track }

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
const PLAYLIST_STORAGE_KEY = 'music-diary-playlists'
const PLAYLIST_SONGS_STORAGE_KEY = 'music-diary-playlist-songs'
const DIARY_STORAGE_KEY = 'music-diary-entries'
const tabs = [
  ['홈', homeIcon], ['라이브러리', libraryIcon], ['탐색', searchIcon], ['일기', diaryIcon], ['마이', userIcon],
]

function TrackRow({ track, onPlay, light, onRowClick, onDelete }: { track: Track; onPlay: () => void; light: boolean; onRowClick?: () => void; onDelete?: () => void }) {
  return <div className={onRowClick ? 'track-row clickable-row' : 'track-row'} onClick={onRowClick}>
    <div className="artwork" aria-hidden="true" />
    <div className="track-copy"><strong>{track[0]}</strong><span>{track[1]}</span></div>
    {onDelete && <button className="playlist-delete" onClick={event => { event.stopPropagation(); onDelete() }} aria-label={`${track[0]} 삭제`}>삭제</button>}
    <button className="icon-button play-button" onClick={event => { event.stopPropagation(); onPlay() }} aria-label={`${track[0]} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}

function App() {
  const [mood, setMood] = useState<typeof moods[number] | null>(null)
  const [tab, setTab] = useState('홈')
  const [query, setQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('전체')
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlists, setPlaylists] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(PLAYLIST_STORAGE_KEY)
      return saved ? JSON.parse(saved) as Track[] : []
    } catch {
      return []
    }
  })
  const [playlistSongs, setPlaylistSongs] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(PLAYLIST_SONGS_STORAGE_KEY)
      return saved ? JSON.parse(saved) as Record<string, string[]> : {}
    } catch {
      return {}
    }
  })
  const [songAddSheetOpen, setSongAddSheetOpen] = useState(false)
  const [targetPlaylist, setTargetPlaylist] = useState<string | null>(null)
  const [playlistPendingDelete, setPlaylistPendingDelete] = useState<string | null>(null)
  const [selectedSongNames, setSelectedSongNames] = useState<string[]>([])
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null)
  const [draggedSong, setDraggedSong] = useState<string | null>(null)
  const [diaryWriting, setDiaryWriting] = useState(false)
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(DIARY_STORAGE_KEY)
      return saved ? JSON.parse(saved) as DiaryEntry[] : []
    } catch {
      return []
    }
  })
  const [diaryMood, setDiaryMood] = useState('차분함')
  const [diaryText, setDiaryText] = useState('')
  const [track, setTrack] = useState<Track>(recommendations[0])
  const [playing, setPlaying] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerClosing, setPlayerClosing] = useState(false)
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false)
  const [playerDragStart, setPlayerDragStart] = useState<number | null>(null)
  const selectTrack = (nextTrack: Track) => { setTrack(nextTrack); setPlaying(true); setMiniPlayerVisible(true); setPlayerOpen(true) }
  const minimizePlayer = () => {
    if (playerClosing) return
    setPlayerClosing(true)
    window.setTimeout(() => { setPlayerOpen(false); setPlayerClosing(false) }, 220)
  }
  const playNextTrack = () => {
    const currentIndex = allSearchTracks.findIndex(item => item[0] === track[0])
    setTrack(allSearchTracks[(currentIndex + 1) % allSearchTracks.length])
    setPlaying(true)
  }
  const createPlaylist = () => {
    const name = playlistName.trim()
    if (!name) return
    setPlaylists(current => [...current, [name, '곡 0개']])
    setPlaylistSongs(current => ({ ...current, [name]: [] }))
    setPlaylistName('')
    setCreateSheetOpen(false)
    setTargetPlaylist(name)
    setSelectedSongNames([])
    setSongAddSheetOpen(true)
  }
  const toggleSong = (songName: string) => setSelectedSongNames(current => current.includes(songName) ? current.filter(name => name !== songName) : [...current, songName])
  const addSongsToPlaylist = () => {
    if (!targetPlaylist || selectedSongNames.length === 0) return
    const existingSongs = playlistSongs[targetPlaylist] || []
    const updatedSongs = [...existingSongs, ...selectedSongNames.filter(name => !existingSongs.includes(name))]
    setPlaylistSongs(current => ({ ...current, [targetPlaylist]: updatedSongs }))
    setPlaylists(current => current.map(item => item[0] === targetPlaylist ? [item[0], `곡 ${updatedSongs.length}개`] : item))
    setSongAddSheetOpen(false)
    setActivePlaylist(targetPlaylist)
  }
  const deletePlaylist = (name: string) => {
    setPlaylists(current => current.filter(item => item[0] !== name))
    setPlaylistSongs(current => {
      const { [name]: _removed, ...remaining } = current
      return remaining
    })
    if (activePlaylist === name) setActivePlaylist(null)
    setPlaylistPendingDelete(null)
  }
  const movePlaylistSong = (songName: string, targetSongName: string) => {
    if (!activePlaylist) return
    setPlaylistSongs(current => {
      const songs = [...(current[activePlaylist] || [])]
      const index = songs.indexOf(songName)
      const targetIndex = songs.indexOf(targetSongName)
      if (index < 0 || targetIndex < 0 || index === targetIndex) return current
      songs.splice(index, 1)
      songs.splice(targetIndex, 0, songName)
      return { ...current, [activePlaylist]: songs }
    })
  }
  const deletePlaylistSong = (songName: string) => {
    if (!activePlaylist) return
    setPlaylistSongs(current => {
      const songs = (current[activePlaylist] || []).filter(name => name !== songName)
      return { ...current, [activePlaylist]: songs }
    })
    setPlaylists(current => current.map(item => item[0] === activePlaylist ? [item[0], `곡 ${(playlistSongs[activePlaylist] || []).length - 1}개`] : item))
  }
  const saveDiary = () => {
    const text = diaryText.trim()
    if (!text) return
    const now = new Date()
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    setDiaryEntries(current => [{ date, mood: diaryMood, text, track }, ...current])
    setDiaryText('')
    setDiaryWriting(false)
  }
  const searchResults = allSearchTracks.filter(item => item[0].toLowerCase().includes(query.toLowerCase()) || item[1].toLowerCase().includes(query.toLowerCase()))
  const detailTracks = activePlaylist ? (playlistSongs[activePlaylist] || []).map(name => allSearchTracks.find(item => item[0] === name)).filter((item): item is Track => Boolean(item)) : []
  const availableSongs = targetPlaylist ? allSearchTracks.filter(item => !(playlistSongs[targetPlaylist] || []).includes(item[0])) : allSearchTracks

  useEffect(() => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlists))
  }, [playlists])
  useEffect(() => {
    localStorage.setItem(PLAYLIST_SONGS_STORAGE_KEY, JSON.stringify(playlistSongs))
  }, [playlistSongs])
  useEffect(() => {
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(diaryEntries))
  }, [diaryEntries])

  const moodStyle = mood ? {
    '--mood-start': mood.start, '--mood-middle': mood.middle, '--mood-end': mood.end, '--mood-chip': mood.chip,
  } as React.CSSProperties : undefined
  return <main className={mood ? 'phone-shell mood-active' : 'phone-shell'} style={moodStyle}>
    <div className="status-bar" />
    {activePlaylist ? <header className="playlist-detail-header"><button onClick={() => setActivePlaylist(null)} aria-label="라이브러리로 돌아가기"><img src={backIcon} alt="" /></button><h1>{activePlaylist}</h1></header> : diaryWriting ? <header className="playlist-detail-header"><button onClick={() => setDiaryWriting(false)} aria-label="일기 목록으로 돌아가기"><img src={backIcon} alt="" /></button><h1>일기 쓰기</h1></header> : tab === '탐색' || tab === '라이브러리' || tab === '일기' ? <header className="search-header"><span>음악 일기</span><h1>{tab}</h1>{tab === '일기' && <button className="diary-write-button" onClick={() => setDiaryWriting(true)}>일기 쓰기</button>}</header> : <header className="app-header"><span className="logo-mark" /><h1>음악 일기</h1></header>}
    <section className={activePlaylist ? 'content playlist-detail-content' : tab === '탐색' || tab === '라이브러리' || tab === '일기' ? 'content search-content' : 'content'} aria-label={`${tab} 화면`}>
      {activePlaylist ? <><section className="detail-track-list">{detailTracks.map(item => <div className={draggedSong === item[0] ? 'detail-track-row dragging' : 'detail-track-row'} data-song-name={item[0]} key={item[0]}><span className="artwork" /><span className="track-copy"><strong>{item[0]}</strong><span>{item[1]}</span></span><div className="song-actions"><button className="order-handle" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedSong(item[0]) }} onPointerMove={event => { if (!draggedSong) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-song-name]')?.dataset.songName; if (target && target !== draggedSong) movePlaylistSong(draggedSong, target) }} onPointerUp={() => setDraggedSong(null)} onPointerCancel={() => setDraggedSong(null)} aria-label={`${item[0]} 순서 변경`}><img src={orderIcon} alt="" /></button><button className="song-delete-button" onClick={() => deletePlaylistSong(item[0])} aria-label={`${item[0]} 삭제`}>삭제</button></div></div>)}</section><button className="add-song-button" onClick={() => { setTargetPlaylist(activePlaylist); setSelectedSongNames([]); setSongAddSheetOpen(true) }}>+ 곡 추가</button></> : diaryWriting ? <section className="diary-form"><div className="diary-date">오늘 · {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/ /g, '')}</div><div className="diary-form-section"><h2>오늘의 기분</h2><div className="diary-mood-list">{moods.map(item => <button key={item.name} className={diaryMood === item.name ? 'diary-mood selected' : 'diary-mood'} onClick={() => setDiaryMood(item.name)}>{item.name}</button>)}</div></div><div className="diary-form-section"><h2>오늘의 이야기</h2><label className="diary-textarea"><textarea value={diaryText} onChange={event => setDiaryText(event.target.value.slice(0, 300))} placeholder="오늘 들은 음악과 마음을 기록해 보세요." aria-label="일기 내용" /><span>{diaryText.length}/300</span></label></div><div className="diary-form-section"><h2>함께 들은 곡</h2><div className="diary-selected-track"><span className="artwork" /><span className="track-copy"><strong>{track[0]}</strong><span>{track[1]}</span></span></div></div><button className="create-button diary-save-button" onClick={saveDiary}>저장하기</button></section> : tab === '홈' ? <>
        <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
          {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
        </div></section>
        <section className="music-section"><h2>오늘의 추천</h2>{recommendations.map(item => <TrackRow key={item[0]} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
        <section className="music-section"><h2>최근 재생</h2>{recents.map(item => <TrackRow key={item[0]} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
      </> : tab === '라이브러리' ? <>
        <div className="library-filters">{['전체', '좋아요', '최근재생'].map(filter => <button key={filter} onClick={() => setLibraryFilter(filter)} className={libraryFilter === filter ? 'library-filter active-filter' : 'library-filter'}>{filter}</button>)}</div>
        <section className="playlist-section"><div className="playlist-heading"><h2>내 플레이리스트</h2><button onClick={() => setCreateSheetOpen(true)}>+ 만들기</button></div>{playlists.map(item => <TrackRow key={item[0]} track={item} light={false} onRowClick={() => setActivePlaylist(item[0])} onDelete={() => setPlaylistPendingDelete(item[0])} onPlay={() => selectTrack(['Blue Hour', 'KIMDA'])} />)}</section>
      </> : tab === '일기' ? diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <article className="diary-card" key={`${entry.date}-${entry.text}`}><div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div><p>{entry.text}</p><div className="diary-track"><span className="artwork" /><span className="track-copy"><strong>{entry.track[0]}</strong><span>{entry.track[1]}</span></span><button className="icon-button play-button" onClick={() => selectTrack(entry.track)} aria-label={`${entry.track[0]} 재생`}><img src={diaryPlayIcon} alt="" /></button></div></article>)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>아직 쓴 일기가 없어요</h2><p>오늘 들은 음악과 마음을 기록해 보세요.</p><button className="create-button" onClick={() => setDiaryWriting(true)}>첫 일기 쓰기</button></section> : tab === '탐색' ? <>
        <label className="search-field"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색" aria-label="음악 검색" /></label>
        <section className="search-results" aria-live="polite">{searchResults.slice(0, 2).map(item => <TrackRow key={item[0]} track={item} light={false} onPlay={() => selectTrack(item)} />)}{searchResults.length === 0 && <p className="no-results">검색 결과가 없어요.</p>}</section>
      </> : <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
    </section>
    {miniPlayerVisible && !playerOpen && <div className="mini-player"><button className="mini-player-main" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기"><span className="artwork mini-art" /><span className="mini-copy"><strong>{track[0]}</strong><span>{track[1]}</span></span></button><button className="mini-control" onClick={() => setPlaying(!playing)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button className="mini-control" onClick={playNextTrack} aria-label="다음 곡"><img src={nextIcon} alt="" /></button></div>}
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => { setActivePlaylist(null); setTab(name) }}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
    {playerOpen && <div className={playerClosing ? 'player-overlay player-closing' : 'player-overlay'} onClick={minimizePlayer}><section className={playerClosing ? 'player-sheet player-sheet-closing' : 'player-sheet'} onClick={event => event.stopPropagation()} onPointerDown={event => setPlayerDragStart(event.clientY)} onPointerUp={event => { if (playerDragStart !== null && event.clientY - playerDragStart > 80) minimizePlayer(); setPlayerDragStart(null) }} onPointerCancel={() => setPlayerDragStart(null)} aria-label="전체 플레이어"><div className="player-sheet-handle" aria-hidden="true" /><div className="sheet-artwork" /><h2>{track[0]}</h2><p>{track[1]}</p><input aria-label="재생 위치" type="range" defaultValue="28" /><div className="time-row"><span>1:04</span><span>3:42</span></div><div className="sheet-controls"><button aria-label="이전 곡">‹‹</button><button className="sheet-play" onClick={() => setPlaying(!playing)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡">››</button></div></section></div>}
    {createSheetOpen && <div className="create-overlay"><section className="create-sheet" aria-label="새 플레이리스트 만들기"><header><h2>새 플레이리스트</h2><button onClick={() => setCreateSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><input autoFocus value={playlistName} onChange={event => setPlaylistName(event.target.value)} onKeyDown={event => event.key === 'Enter' && createPlaylist()} placeholder="예: 비 오는 날 듣는 곡" aria-label="플레이리스트 이름" /><button className="create-button" onClick={createPlaylist}>만들기</button></section></div>}
    {songAddSheetOpen && <div className="create-overlay" onClick={() => setSongAddSheetOpen(false)}><section className="song-add-sheet" onClick={event => event.stopPropagation()} aria-label="플레이리스트에 곡 추가"><header><h2>곡 추가</h2><button onClick={() => setSongAddSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search"><input placeholder="검색" aria-label="추가할 곡 검색" /></label><div className="song-options">{availableSongs.map(item => { const selected = selectedSongNames.includes(item[0]); return <button key={item[0]} className="song-option" onClick={() => toggleSong(item[0])}><span className="artwork" /><span className="track-copy"><strong>{item[0]}</strong><span>{item[1]}</span></span><span className={selected ? 'circle-choice checked' : 'circle-choice'}>{selected ? '✓' : <img src={checkboxCircleIcon} alt="" />}</span></button> })}</div>{availableSongs.length === 0 && <p className="no-results">추가할 수 있는 곡이 없어요.</p>}<button className="create-button" onClick={addSongsToPlaylist}>{selectedSongNames.length}곡 추가</button></section></div>}
    {playlistPendingDelete && <div className="create-overlay delete-overlay" onClick={() => setPlaylistPendingDelete(null)}><section className="delete-dialog" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">플레이리스트를 삭제할까요?</h2><p>삭제한 플레이리스트는 되돌릴 수 없어요.</p><div><button onClick={() => setPlaylistPendingDelete(null)}>취소</button><button className="confirm-delete" onClick={() => deletePlaylist(playlistPendingDelete)}>삭제</button></div></section></div>}
  </main>
}

export default App
