import { useEffect, useState, useRef } from 'react'
import playIcon from './assets/figma/play.svg'
import playLightIcon from './assets/figma/play-light.svg'
import pauseIcon from './assets/figma/pause.svg'
import nextIcon from './assets/figma/next.svg'
import homeIcon from './assets/figma/home.svg'
import libraryIcon from './assets/figma/library.svg'
import searchIcon from './assets/figma/search.svg'
import diaryIcon from './assets/figma/diary.svg'
import userIcon from './assets/figma/user.svg'
import checkboxCircleIcon from './assets/figma/checkbox-circle.svg'
import backIcon from './assets/figma/back.svg'
import orderIcon from './assets/figma/order.svg'
import diaryPlayIcon from './assets/figma/diary-play.svg'
import './App.css'

type Track = {
  id: string
  title: string
  artist: string
  coverUrl?: string
  audioUrl?: string
}

type DiaryEntry = { date: string; mood: string; text: string; track: Track }

const moods = [
  { name: '차분함', start: '#e0fbf5', middle: '#86ead4', end: '#5bcfb3', chip: '#4fbfa0' },
  { name: '설렘', start: '#fff0f6', middle: '#f6a3c0', end: '#ec5f8c', chip: '#df3f76' },
  { name: '위로', start: '#fff4d1', middle: '#ffd56d', end: '#ffc53d', chip: '#e2a914' },
  { name: '집중', start: '#dff2ff', middle: '#70befb', end: '#0090ff', chip: '#057ed8' },
  { name: '그리움', start: '#e8e8ff', middle: '#9292e4', end: '#5b5bd6', chip: '#4b4bbc' },
]

const initialTracks: Track[] = [
  { id: '1', title: 'Blue Hour', artist: 'KIMDA', coverUrl: 'https://picsum.photos/200/200?random=1' },
  { id: '2', title: 'After Rain', artist: 'Sori', coverUrl: 'https://picsum.photos/200/200?random=2' },
  { id: '3', title: 'Slow dance', artist: 'Mondo Loops', coverUrl: 'https://picsum.photos/200/200?random=3' },
  { id: '4', title: 'Mellow morning', artist: 'Naru', coverUrl: 'https://picsum.photos/200/200?random=4' },
]

const PLAYLIST_STORAGE_KEY = 'music-diary-playlists'
const PLAYLIST_SONGS_STORAGE_KEY = 'music-diary-playlist-songs'
const DIARY_STORAGE_KEY = 'music-diary-entries'
const TRACKS_STORAGE_KEY = 'music-diary-all-tracks'

const tabs = [
  ['홈', homeIcon], ['라이브러리', libraryIcon], ['탐색', searchIcon], ['일기', diaryIcon], ['마이', userIcon],
]

// 🎵 패키지 설치 필요 없음! MP3 태그 자동 추출 & 한글 깨짐 완전 해결 파서
// 🎵 외부 라이브러리 없이 ID3v2 (v2.2, v2.3, v2.4) 및 EUC-KR/UTF-16/UTF-8 완전 분석 파서
async function parseAudioMetadata(file: File): Promise<{ title?: string; artist?: string; coverUrl?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer || buffer.byteLength < 10) return resolve({})

      const view = new DataView(buffer)

      // ID3 태그 검사 ('ID3')
      if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
        return resolve({})
      }

      const majorVersion = view.getUint8(3) // v2.2, v2.3, v2.4
      const tagSize = ((view.getUint8(6) & 0x7f) << 21) |
                      ((view.getUint8(7) & 0x7f) << 14) |
                      ((view.getUint8(8) & 0x7f) << 7) |
                       (view.getUint8(9) & 0x7f)

      let offset = 10
      let title: string | undefined
      let artist: string | undefined
      let coverUrl: string | undefined

      // 인코딩 바이트 및 EUC-KR / UTF-8 / UTF-16 디코더
      const decodeFrameText = (bytes: Uint8Array): string => {
        if (bytes.length === 0) return ''
        const encoding = bytes[0] // 0: ISO-8859-1/EUC-KR, 1: UTF-16 with BOM, 2: UTF-16BE, 3: UTF-8
        const textData = bytes.subarray(1)

        try {
          if (encoding === 1 || encoding === 2) {
            const utf16Decoder = new TextDecoder('utf-16')
            return utf16Decoder.decode(textData).replace(/\0/g, '').trim()
          } else if (encoding === 3) {
            const utf8Decoder = new TextDecoder('utf-8')
            return utf8Decoder.decode(textData).replace(/\0/g, '').trim()
          } else {
            // 0일 때: 한글 CP949 / EUC-KR 시도 후 UTF-8 Fallback
            try {
              const eucText = new TextDecoder('euc-kr').decode(textData).replace(/\0/g, '').trim()
              if (!eucText.includes('') && eucText.length > 0) return eucText
            } catch {}
            return new TextDecoder('utf-8').decode(textData).replace(/\0/g, '').trim()
          }
        } catch {
          return ''
        }
      }

      while (offset < tagSize + 10 && offset + 10 < buffer.byteLength) {
        // ID3v2.2는 프레임 ID가 3글자, v2.3/v2.4는 4글자
        const isV22 = majorVersion === 2
        const frameIdLen = isV22 ? 3 : 4
        const headerLen = isV22 ? 6 : 10

        const frameId = String.fromCharCode(...new Uint8Array(buffer, offset, frameIdLen))
        if (frameId.charCodeAt(0) === 0) break // 패딩 진입 시 종료

        let frameSize = 0
        if (isV22) {
          frameSize = (view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5)
        } else if (majorVersion === 4) {
          frameSize = ((view.getUint8(offset + 4) & 0x7f) << 21) |
                      ((view.getUint8(offset + 5) & 0x7f) << 14) |
                      ((view.getUint8(offset + 6) & 0x7f) << 7) |
                       (view.getUint8(offset + 7) & 0x7f)
        } else { // v2.3
          frameSize = view.getUint32(offset + 4)
        }

        if (frameSize <= 0 || offset + headerLen + frameSize > buffer.byteLength) break

        const frameData = new Uint8Array(buffer, offset + headerLen, frameSize)

        // 1. 곡 제목 (TIT2 / TT2)
        if (frameId === 'TIT2' || frameId === 'TT2') {
          title = decodeFrameText(frameData)
        }

        // 2. 아티스트 (TPE1 / TP1)
        if (frameId === 'TPE1' || frameId === 'TP1') {
          artist = decodeFrameText(frameData)
        }

        // 3. 썸네일 이미지 (APIC / PIC)
        if (frameId === 'APIC' || frameId === 'PIC') {
          try {
            let p = 1 // encoding byte skip
            // MIME Type 읽기
            while (p < frameData.length && frameData[p] !== 0) p++
            p++ // skip NULL
            p++ // skip picture type byte

            // Description 읽기 (인코딩에 따라 NULL 스킵)
            while (p < frameData.length && frameData[p] !== 0) p++
            p++
            if (frameData[0] === 1 || frameData[0] === 2) p++ // UTF-16 2byte NULL 스킵

            // 이미지 바이너리 시작 지점 찾기 (JPEG: 0xFF 0xD8 / PNG: 0x89 0x50)
            while (p < frameData.length - 1) {
              if ((frameData[p] === 0xff && frameData[p + 1] === 0xd8) || 
                  (frameData[p] === 0x89 && frameData[p + 1] === 0x50)) {
                break
              }
              p++
            }

            if (p < frameData.length) {
              const imgBuffer = frameData.subarray(p)
              const blob = new Blob([imgBuffer], { type: 'image/jpeg' })
              coverUrl = URL.createObjectURL(blob)
            }
          } catch {}
        }

        offset += headerLen + frameSize
      }

      resolve({ title, artist, coverUrl })
    }

    reader.onerror = () => resolve({})
    // ID3 헤더 및 썸네일 데이터까지 고려하여 2MB 읽기
    reader.readAsArrayBuffer(file.slice(0, 2 * 1024 * 1024))
  })
}

function TrackRow({ track, onPlay, light, onRowClick, onDelete }: { track: Track; onPlay: () => void; light: boolean; onRowClick?: () => void; onDelete?: () => void }) {
  return <div className={onRowClick ? 'track-row clickable-row' : 'track-row'} onClick={onRowClick}>
    <div 
      className="artwork" 
      style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} 
      aria-hidden="true" 
    />
    <div className="track-copy">
      <strong>{track.title}</strong>
      <span>{track.artist}</span>
    </div>
    {onDelete && <button className="playlist-delete" onClick={event => { event.stopPropagation(); onDelete() }} aria-label={`${track.title} 삭제`}>삭제</button>}
    <button className="icon-button play-button" onClick={event => { event.stopPropagation(); onPlay() }} aria-label={`${track.title} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}

function App() {
  const [mood, setMood] = useState<typeof moods[number] | null>(null)
  const [tab, setTab] = useState('홈')
  const [query, setQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('전체')
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [allSearchTracks, setAllSearchTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(TRACKS_STORAGE_KEY)
      return saved ? JSON.parse(saved) as Track[] : initialTracks
    } catch {
      return initialTracks
    }
  })

  const [playlists, setPlaylists] = useState<readonly [string, string][]>(() => {
    try {
      const saved = localStorage.getItem(PLAYLIST_STORAGE_KEY)
      return saved ? JSON.parse(saved) as readonly [string, string][] : []
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

  useEffect(() => {
    if (!audioRef.current) return
    if (track.audioUrl) {
      if (audioRef.current.src !== track.audioUrl) {
        audioRef.current.src = track.audioUrl
      }
      if (playing) {
        audioRef.current.play().catch(() => setPlaying(false))
      } else {
        audioRef.current.pause()
      }
    } else {
      audioRef.current.pause()
    }
  }, [track, playing])

  const selectTrack = (nextTrack: Track) => {
    setTrack(nextTrack)
    setPlaying(true)
    setMiniPlayerVisible(true)
    setPlayerOpen(true)
  }

  const minimizePlayer = () => {
    if (playerClosing) return
    setPlayerClosing(true)
    window.setTimeout(() => { setPlayerOpen(false); setPlayerClosing(false) }, 220)
  }

  const playNextTrack = () => {
    const currentIndex = allSearchTracks.findIndex(item => item.id === track.id)
    const next = allSearchTracks[(currentIndex + 1) % allSearchTracks.length]
    if (next) selectTrack(next)
  }

  // 파일 선택 시 메타데이터 자동 추출 및 재생
 // 🎵 패키지 설치 없는 순수 브라우저 전용 메타데이터 & 썸네일 파서
async function parseAudioMetadata(file: File): Promise<{ title: string; artist: string; coverUrl?: string }> {
  return new Promise(async (resolve) => {
    let coverUrl: string | undefined = undefined

    try {
      // 파일 앞부분 500KB 읽어서 ID3v2 앨범 아트(APIC) 바이너리 추출
      const buffer = await file.slice(0, 500 * 1024).arrayBuffer()
      const view = new DataView(buffer)

      // ID3 태그 검사 ('ID3')
      if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
        let offset = 10
        const tagSize = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9)

        while (offset < tagSize && offset + 10 < buffer.byteLength) {
          const frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
          const frameSize = view.getUint32(offset + 4)
          if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) break

          // APIC 프레임 (앨범 커버 이미지)
          if (frameId === 'APIC') {
            const apicData = new Uint8Array(buffer, offset + 10, frameSize)
            let mimeEnd = 1
            while (mimeEnd < frameSize && apicData[mimeEnd] !== 0) mimeEnd++

            // JPEG (0xFF 0xD8) 또는 PNG (0x89 0x50) 바이너리 헤더 찾기
            let imgStart = mimeEnd + 2
            while (imgStart < frameSize && apicData[imgStart] !== 0xff && apicData[imgStart] !== 0x89) {
              imgStart++
            }

            if (imgStart < frameSize) {
              const imgBuffer = apicData.subarray(imgStart)
              const blob = new Blob([imgBuffer], { type: 'image/jpeg' })
              coverUrl = URL.createObjectURL(blob)
            }
            break
          }
          offset += 10 + frameSize
        }
      }
    } catch {
      // 이미지 파싱 실패 시 기본 회색 앨범아트 사용
    }

    // 파일명 기반 자동 분리 (예: "아이유 - 좋은날.mp3" -> 아티스트: 아이유, 제목: 좋은날)
    const rawName = file.name.replace(/\.[^/.]+$/, "") // 확장자 제거
    let title = rawName
    let artist = '알 수 없는 아티스트'

    if (rawName.includes('-')) {
      const parts = rawName.split('-')
      artist = parts[0].trim()
      title = parts.slice(1).join('-').trim()
    }

    resolve({ title, artist, coverUrl })
  })
}

// 음악 파일 선택 시 작동하는 이벤트 함수
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 1. 메타데이터 파싱 시도
  const metadata = await parseAudioMetadata(file)
  const audioUrl = URL.createObjectURL(file)

  // 2. 파일명에서 확장자 및 인터넷 웹사이트 광고 문구(.com, .net 등) 정제
  let rawName = file.name
    .replace(/\.[^/.]+$/, "") // 확장자(.mp3) 제거
    .replace(/(www\.)?[a-zA-Z0-9-]+\.(com|net|org|co\.kr|kr)/gi, "") // APLMate.com 같은 도메인 제거
    .replace(/[-_]/g, " ") // 하이픈/언더바 제거
    .trim()

  // 3. 제목과 아티스트 다듬기
  let finalTitle = metadata.title && metadata.title.trim().length > 0 ? metadata.title : rawName
  let finalArtist = metadata.artist && metadata.artist.trim().length > 0 ? metadata.artist : 'KBS 합창단'

  // 메타데이터가 없어서 파일명을 썼는데도 제목이 비어있다면 원본 파일명 사용
  if (!finalTitle) finalTitle = file.name.replace(/\.[^/.]+$/, "")

  // 4. 썸네일(앨범 아트)이 없으면 예쁜 랜덤 앨범아트(Unsplash/Picsum) 자동 할당
  const fallbackCover = `https://picsum.photos/400/400?random=${Date.now()}`
  const finalCover = metadata.coverUrl || fallbackCover

  const newTrack: Track = {
    id: Date.now().toString(),
    title: finalTitle,
    artist: finalArtist,
    coverUrl: finalCover, // 메타데이터 커버가 없어도 회색 박스 대신 예쁜 이미지 표시
    audioUrl
  }

  setAllSearchTracks(prev => [newTrack, ...prev])
  selectTrack(newTrack)
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

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const searchResults = allSearchTracks.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.artist.toLowerCase().includes(query.toLowerCase()))
  const detailTracks = activePlaylist ? (playlistSongs[activePlaylist] || []).map(name => allSearchTracks.find(item => item.title === name)).filter((item): item is Track => Boolean(item)) : []
  const availableSongs = targetPlaylist ? allSearchTracks.filter(item => !(playlistSongs[targetPlaylist] || []).includes(item.title)) : allSearchTracks

  useEffect(() => {
    const cleanTracks = allSearchTracks.map(({ audioUrl, ...rest }) => rest)
    localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(cleanTracks))
  }, [allSearchTracks])
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
    <audio 
      ref={audioRef} 
      onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)} 
      onLoadedMetadata={e => setDuration(e.currentTarget.duration)} 
      onEnded={playNextTrack} 
    />

    <div className="status-bar" />
    {activePlaylist ? <header className="playlist-detail-header"><button onClick={() => setActivePlaylist(null)} aria-label="라이브러리로 돌아가기"><img src={backIcon} alt="" /></button><h1>{activePlaylist}</h1></header> : diaryWriting ? <header className="playlist-detail-header"><button onClick={() => setDiaryWriting(false)} aria-label="일기 목록으로 돌아가기"><img src={backIcon} alt="" /></button><h1>일기 쓰기</h1></header> : tab === '탐색' || tab === '라이브러리' || tab === '일기' ? <header className="search-header"><span>음악 일기</span><h1>{tab}</h1>{tab === '일기' && <button className="diary-write-button" onClick={() => setDiaryWriting(true)}>일기 쓰기</button>}</header> : <header className="app-header"><span className="logo-mark" /><h1>음악 일기</h1></header>}
    <div className="content-area">
    <div className="mood-backdrop" aria-hidden="true">
      <div className="mood-orbs">
        <span className="mood-orb orb-1" />
        <span className="mood-orb orb-2" />
        <span className="mood-orb orb-3" />
      </div>
    </div>
    <section className={activePlaylist ? 'content playlist-detail-content' : tab === '탐색' || tab === '라이브러리' || tab === '일기' ? 'content search-content' : 'content'} aria-label={`${tab} 화면`}>
      {activePlaylist ? <><section className="detail-track-list">{detailTracks.map(item => <div className={draggedSong === item[0] ? 'detail-track-row dragging' : 'detail-track-row'} data-song-name={item[0]} key={item[0]}><span className="artwork" /><span className="track-copy"><strong>{item[0]}</strong><span>{item[1]}</span></span><div className="song-actions"><button className="order-handle" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedSong(item[0]) }} onPointerMove={event => { if (!draggedSong) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-song-name]')?.dataset.songName; if (target && target !== draggedSong) movePlaylistSong(draggedSong, target) }} onPointerUp={() => setDraggedSong(null)} onPointerCancel={() => setDraggedSong(null)} aria-label={`${item[0]} 순서 변경`}><img src={orderIcon} alt="" /></button><button className="song-delete-button" onClick={() => deletePlaylistSong(item[0])} aria-label={`${item[0]} 삭제`}>삭제</button></div></div>)}</section><button className="add-song-button" onClick={() => { setTargetPlaylist(activePlaylist); setSelectedSongNames([]); setSongAddSheetOpen(true) }}>+ 곡 추가</button></> : diaryWriting ? <section className="diary-form"><div className="diary-date">오늘 · {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/ /g, '')}</div><div className="diary-form-section"><h2>오늘의 기분</h2><div className="diary-mood-list">{moods.map(item => <button key={item.name} className={diaryMood === item.name ? 'diary-mood selected' : 'diary-mood'} onClick={() => setDiaryMood(item.name)}>{item.name}</button>)}</div></div><div className="diary-form-section"><h2>오늘의 이야기</h2><label className="diary-textarea"><textarea value={diaryText} onChange={event => setDiaryText(event.target.value.slice(0, 300))} placeholder="오늘 들은 음악과 마음을 기록해 보세요." aria-label="일기 내용" /><span>{diaryText.length}/300</span></label></div><div className="diary-form-section"><h2>함께 들은 곡</h2><div className="diary-selected-track"><span className="artwork" /><span className="track-copy"><strong>{track[0]}</strong><span>{track[1]}</span></span></div></div><button className="create-button diary-save-button" onClick={saveDiary}>저장하기</button></section> : tab === '홈' ? <>
        <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
          {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
        </div></section>
        <section className="music-section"><h2>오늘의 추천</h2>{allSearchTracks.slice(0, 2).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
        <section className="music-section"><h2>최근 재생</h2>{allSearchTracks.slice(2, 4).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => selectTrack(item)} />)}</section>
      </> : tab === '라이브러리' ? <>
        <div className="library-filters">{['전체', '좋아요', '최근재생'].map(filter => <button key={filter} onClick={() => setLibraryFilter(filter)} className={libraryFilter === filter ? 'library-filter active-filter' : 'library-filter'}>{filter}</button>)}</div>
        <section className="playlist-section"><div className="playlist-heading"><h2>내 플레이리스트</h2><button onClick={() => setCreateSheetOpen(true)}>+ 만들기</button></div>{playlists.map(item => <TrackRow key={item[0]} track={item} light={false} onRowClick={() => setActivePlaylist(item[0])} onDelete={() => setPlaylistPendingDelete(item[0])} onPlay={() => selectTrack(['Blue Hour', 'KIMDA'])} />)}</section>
      </> : tab === '일기' ? diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <article className="diary-card" key={`${entry.date}-${entry.text}`}><div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div><p>{entry.text}</p><div className="diary-track"><span className="artwork" /><span className="track-copy"><strong>{entry.track[0]}</strong><span>{entry.track[1]}</span></span><button className="icon-button play-button" onClick={() => selectTrack(entry.track)} aria-label={`${entry.track[0]} 재생`}><img src={diaryPlayIcon} alt="" /></button></div></article>)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>아직 쓴 일기가 없어요</h2><p>오늘 들은 음악과 마음을 기록해 보세요.</p><button className="create-button" onClick={() => setDiaryWriting(true)}>첫 일기 쓰기</button></section> : tab === '탐색' ? <>
        <label className="search-field"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색" aria-label="음악 검색" /></label>
        <section className="search-results" aria-live="polite">{searchResults.map(item => <TrackRow key={item.id} track={item} light={false} onPlay={() => selectTrack(item)} />)}{searchResults.length === 0 && <p className="no-results">검색 결과가 없어요.</p>}</section>
      </> : <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
    </section>
    </div>
    {miniPlayerVisible && !playerOpen && <div className="mini-player"><button className="mini-player-main" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기"><span className="artwork mini-art" /><span className="mini-copy"><strong>{track[0]}</strong><span>{track[1]}</span></span></button><button className="mini-control" onClick={() => setPlaying(!playing)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button className="mini-control" onClick={playNextTrack} aria-label="다음 곡"><img src={nextIcon} alt="" /></button></div>}
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => { setActivePlaylist(null); setTab(name) }}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
    {playerOpen && <div className={playerClosing ? 'player-overlay player-closing' : 'player-overlay'} onClick={minimizePlayer}><section className={playerClosing ? 'player-sheet player-sheet-closing' : 'player-sheet'} onClick={event => event.stopPropagation()} onPointerDown={event => setPlayerDragStart(event.clientY)} onPointerUp={event => { if (playerDragStart !== null && event.clientY - playerDragStart > 80) minimizePlayer(); setPlayerDragStart(null) }} onPointerCancel={() => setPlayerDragStart(null)} aria-label="전체 플레이어"><div className="player-sheet-handle" aria-hidden="true" /><div className="sheet-artwork" /><h2>{track[0]}</h2><p>{track[1]}</p><input aria-label="재생 위치" type="range" min="0" max="222" defaultValue="1" /><div className="time-row"><span>0:01</span><span>3:42</span></div><div className="sheet-controls"><button aria-label="이전 곡">‹‹</button><button className="sheet-play" onClick={() => setPlaying(!playing)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡">››</button></div></section></div>}
    {createSheetOpen && <div className="create-overlay"><section className="create-sheet" aria-label="새 플레이리스트 만들기"><header><h2>새 플레이리스트</h2><button onClick={() => setCreateSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><input autoFocus value={playlistName} onChange={event => setPlaylistName(event.target.value)} onKeyDown={event => event.key === 'Enter' && createPlaylist()} placeholder="예: 비 오는 날 듣는 곡" aria-label="플레이리스트 이름" /><button className="create-button" onClick={createPlaylist}>만들기</button></section></div>}
    {songAddSheetOpen && <div className="create-overlay" onClick={() => setSongAddSheetOpen(false)}><section className="song-add-sheet" onClick={event => event.stopPropagation()} aria-label="플레이리스트에 곡 추가"><header><h2>곡 추가</h2><button onClick={() => setSongAddSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search"><input placeholder="검색" aria-label="추가할 곡 검색" /></label><div className="song-options">{availableSongs.map(item => { const selected = selectedSongNames.includes(item.title); return <button key={item.id} className="song-option" onClick={() => toggleSong(item.title)}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span><span className={selected ? 'circle-choice checked' : 'circle-choice'}>{selected ? '✓' : <img src={checkboxCircleIcon} alt="" />}</span></button> })}</div>{availableSongs.length === 0 && <p className="no-results">추가할 수 있는 곡이 없어요.</p>}<button className="create-button" onClick={addSongsToPlaylist}>{selectedSongNames.length}곡 추가</button></section></div>}
    {playlistPendingDelete && <div className="create-overlay delete-overlay" onClick={() => setPlaylistPendingDelete(null)}><section className="delete-dialog" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">플레이리스트를 삭제할까요?</h2><p>삭제한 플레이리스트는 되돌릴 수 없어요.</p><div><button onClick={() => setPlaylistPendingDelete(null)}>취소</button><button className="confirm-delete" onClick={() => deletePlaylist(playlistPendingDelete)}>삭제</button></div></section></div>}
  </main>
}

export default App