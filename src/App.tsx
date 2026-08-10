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
import closeIcon from './assets/figma/close.svg'
import './App.css'

type Track = {
  id: string
  title: string
  artist: string
  coverUrl?: string
  audioUrl?: string
}

type Playlist = { id: string; name: string; trackIds: string[] }
type DiaryEntry = { id: string; date: string; mood: string; text: string; track: Track }

const moods = [
  { name: '차분함', start: '#e0fbf5', middle: '#86ead4', end: '#5bcfb3', chip: '#4fbfa0' },
  { name: '설렘', start: '#fff0f6', middle: '#f6a3c0', end: '#ec5f8c', chip: '#df3f76' },
  { name: '위로', start: '#fff4d1', middle: '#ffd56d', end: '#ffc53d', chip: '#e2a914' },
  { name: '집중', start: '#dff2ff', middle: '#70befb', end: '#0090ff', chip: '#057ed8' },
  { name: '그리움', start: '#e8e8ff', middle: '#9292e4', end: '#5b5bd6', chip: '#4b4bbc' },
]

const initialTracks: Track[] = []

const PLAYLIST_STORAGE_KEY = 'music-diary-playlists'
const PLAYLIST_SONGS_STORAGE_KEY = 'music-diary-playlist-songs'
const DIARY_STORAGE_KEY = 'music-diary-entries'
const PLAYLIST_STORAGE_KEY_V2 = 'music-diary-playlists-v2'
const DIARY_STORAGE_KEY_V2 = 'music-diary-entries-v2'
const TRACKS_STORAGE_KEY = 'music-diary-all-tracks'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const isPlaylist = (value: unknown): value is Playlist => isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.trackIds) && value.trackIds.every(item => typeof item === 'string')

const isTrack = (value: unknown): value is Track => isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.artist === 'string' && (value.coverUrl === undefined || typeof value.coverUrl === 'string') && (value.audioUrl === undefined || typeof value.audioUrl === 'string')

const isDiaryEntry = (value: unknown): value is DiaryEntry => isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string' && typeof value.mood === 'string' && typeof value.text === 'string' && isTrack(value.track)

function loadPlaylists(): Playlist[] {
  try {
    try {
      const savedV2 = localStorage.getItem(PLAYLIST_STORAGE_KEY_V2)
      if (savedV2) {
        const parsedV2: unknown = JSON.parse(savedV2)
        if (Array.isArray(parsedV2) && parsedV2.every(isPlaylist)) return parsedV2
      }
    } catch {
      // Invalid v2 data falls through to the v1 migration path.
    }

    const savedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY)
    const savedPlaylistSongs = localStorage.getItem(PLAYLIST_SONGS_STORAGE_KEY)
    if (!savedPlaylists || !savedPlaylistSongs) return []

    const parsedPlaylists: unknown = JSON.parse(savedPlaylists)
    const parsedPlaylistSongs: unknown = JSON.parse(savedPlaylistSongs)
    if (!Array.isArray(parsedPlaylists) || !isRecord(parsedPlaylistSongs)) return []

    const titleToId = new Map<string, string>()
    try {
      const savedTracks = localStorage.getItem(TRACKS_STORAGE_KEY)
      const parsedTracks: unknown = savedTracks ? JSON.parse(savedTracks) : []
      if (Array.isArray(parsedTracks)) {
        parsedTracks.filter(isTrack).forEach(item => {
          if (!titleToId.has(item.title)) titleToId.set(item.title, item.id)
        })
      }
    } catch {
      // Track lookup is best effort; unresolved legacy song titles are dropped below.
    }

    // Duplicate v1 playlist names were already conflated in playlistSongs before this migration, so that loss is pre-existing.
    const migrated = parsedPlaylists.flatMap(item => {
      if (!Array.isArray(item) || typeof item[0] !== 'string') return []
      const songTitles = parsedPlaylistSongs[item[0]]
      const trackIds = Array.isArray(songTitles) ? songTitles.filter((title): title is string => typeof title === 'string').map(title => titleToId.get(title)).filter((id): id is string => Boolean(id)) : []
      return [{ id: crypto.randomUUID(), name: item[0], trackIds }]
    })
    const result = migrated.filter(isPlaylist)
    try {
      localStorage.setItem(PLAYLIST_STORAGE_KEY_V2, JSON.stringify(result))
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
    return result
  } catch {
    return []
  }
}

function loadDiaryEntries(): DiaryEntry[] {
  const normalizeTrack = (value: unknown): Track | null => {
    if (Array.isArray(value) && typeof value[0] === 'string' && typeof value[1] === 'string') {
      return { id: crypto.randomUUID(), title: value[0], artist: value[1] }
    }
    if (!isRecord(value) || typeof value.title !== 'string' || typeof value.artist !== 'string') return null
    const normalized: Track = {
      id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
      title: value.title,
      artist: value.artist,
    }
    if (typeof value.coverUrl === 'string') normalized.coverUrl = value.coverUrl
    return normalized
  }

  try {
    try {
      const savedV2 = localStorage.getItem(DIARY_STORAGE_KEY_V2)
      if (savedV2) {
        const parsedV2: unknown = JSON.parse(savedV2)
        if (Array.isArray(parsedV2) && parsedV2.every(isDiaryEntry)) return parsedV2
      }
    } catch {
      // Invalid v2 data falls through to the v1 migration path.
    }

    const savedV1 = localStorage.getItem(DIARY_STORAGE_KEY)
    if (!savedV1) return []
    const parsedV1: unknown = JSON.parse(savedV1)
    if (!Array.isArray(parsedV1)) return []
    const result = parsedV1.flatMap(item => {
      if (!isRecord(item) || typeof item.date !== 'string' || typeof item.mood !== 'string' || typeof item.text !== 'string') return []
      const normalizedTrack = normalizeTrack(item.track)
      return normalizedTrack ? [{ id: crypto.randomUUID(), date: item.date, mood: item.mood, text: item.text, track: normalizedTrack }] : []
    }).filter(isDiaryEntry)
    try {
      localStorage.setItem(DIARY_STORAGE_KEY_V2, JSON.stringify(result))
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
    return result
  } catch {
    return []
  }
}

const tabs = [
  ['홈', homeIcon], ['라이브러리', libraryIcon], ['탐색', searchIcon], ['일기', diaryIcon], ['마이', userIcon],
]

// 🎵 패키지 설치 필요 없음! MP3 태그 자동 추출 & 한글 깨짐 완전 해결 파서
// 🎵 외부 라이브러리 없이 ID3v2 (v2.2, v2.3, v2.4) 및 EUC-KR/UTF-16/UTF-8 완전 분석 파서
async function parseAudioMetadata(file: File): Promise<{ title?: string; artist?: string; coverUrl?: string }> {
  return new Promise((resolve) => {
    const rawName = file.name.replace(/\.[^/.]+$/, '')
    let fallbackTitle = rawName
    let fallbackArtist = '알 수 없는 아티스트'

    if (rawName.includes('-')) {
      const parts = rawName.split('-')
      fallbackArtist = parts[0].trim()
      fallbackTitle = parts.slice(1).join('-').trim()
    }

    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer || buffer.byteLength < 10) return resolve({ title: fallbackTitle, artist: fallbackArtist })

      const view = new DataView(buffer)

      // ID3 태그 검사 ('ID3')
      if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
        return resolve({ title: fallbackTitle, artist: fallbackArtist })
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
          if (encoding === 1) {
            const isBigEndian = textData[0] === 0xfe && textData[1] === 0xff
            const utf16Decoder = new TextDecoder(isBigEndian ? 'utf-16be' : 'utf-16le')
            return utf16Decoder.decode(textData).replace(/\0/g, '').trim()
          } else if (encoding === 2) {
            const utf16BeDecoder = new TextDecoder('utf-16be')
            return utf16BeDecoder.decode(textData).replace(/\0/g, '').trim()
          } else if (encoding === 3) {
            const utf8Decoder = new TextDecoder('utf-8')
            return utf8Decoder.decode(textData).replace(/\0/g, '').trim()
          } else {
            // 0일 때: 한글 CP949 / EUC-KR 시도 후 UTF-8 Fallback
            try {
              const eucText = new TextDecoder('euc-kr').decode(textData).replace(/\0/g, '').trim()
              if (eucText.length > 0 && !eucText.includes('\uFFFD')) return eucText
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
            let imageMimeType: 'image/jpeg' | 'image/png' | undefined
            if (frameId === 'PIC') {
              const imageFormat = String.fromCharCode(...frameData.subarray(p, p + 3))
              if (imageFormat === 'PNG') imageMimeType = 'image/png'
              if (imageFormat === 'JPG') imageMimeType = 'image/jpeg'
              p += 3 // skip fixed image format
            } else {
              // MIME Type 읽기
              while (p < frameData.length && frameData[p] !== 0) p++
              p++ // skip NULL
            }
            p++ // skip picture type byte

            // Description 읽기 (인코딩에 따라 NULL 스킵)
            while (p < frameData.length && frameData[p] !== 0) p++
            p++
            if (frameData[0] === 1 || frameData[0] === 2) p++ // UTF-16 2byte NULL 스킵

            // 이미지 바이너리 시작 지점 찾기 (JPEG: 0xFF 0xD8 / PNG: 0x89 0x50)
            while (p < frameData.length - 1) {
              if (frameData[p] === 0xff && frameData[p + 1] === 0xd8) {
                imageMimeType = 'image/jpeg'
                break
              }
              if (frameData[p] === 0x89 && frameData[p + 1] === 0x50) {
                imageMimeType = 'image/png'
                break
              }
              p++
            }

            if (p < frameData.length && imageMimeType) {
              const imgBuffer = frameData.subarray(p)
              const blob = new Blob([imgBuffer], { type: imageMimeType })
              coverUrl = URL.createObjectURL(blob)
            }
          } catch {}
        }

        offset += headerLen + frameSize
      }

      resolve({ title: title || fallbackTitle, artist: artist || fallbackArtist, coverUrl })
    }

    reader.onerror = () => resolve({ title: fallbackTitle, artist: fallbackArtist })
    // ID3 헤더 및 썸네일 데이터까지 고려하여 2MB 읽기
    reader.readAsArrayBuffer(file.slice(0, 2 * 1024 * 1024))
  })
}

function TrackRow({ track, onPlay, light, onRowClick, onDelete }: { track: Track; onPlay?: () => void; light: boolean; onRowClick?: () => void; onDelete?: () => void }) {
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
    <button className="icon-button play-button" disabled={!onPlay} onClick={event => { event.stopPropagation(); onPlay?.() }} aria-label={`${track.title} 재생`}><img src={light ? playLightIcon : playIcon} alt="" /></button>
  </div>
}

function App() {
  const [mood, setMood] = useState<typeof moods[number] | null>(null)
  const [tab, setTab] = useState('홈')
  const [query, setQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('전체')
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<{ file: File; title: string; artist: string; coverUrl?: string } | null>(null)
  const [playlistName, setPlaylistName] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTokenRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [allSearchTracks, setAllSearchTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(TRACKS_STORAGE_KEY)
      return saved ? (JSON.parse(saved) as Track[]).filter(item => Boolean(item.audioUrl)) : initialTracks
    } catch {
      return initialTracks
    }
  })

  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists())
  const [songAddSheetOpen, setSongAddSheetOpen] = useState(false)
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | null>(null)
  const [playlistPendingDeleteId, setPlaylistPendingDeleteId] = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null)
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null)
  const [diaryWriting, setDiaryWriting] = useState(false)
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => loadDiaryEntries())
  const [diaryMood, setDiaryMood] = useState('차분함')
  const [diaryText, setDiaryText] = useState('')
  const [myScreen, setMyScreen] = useState<'main' | 'diaries' | 'settings' | 'terms'>('main')
  const [autoplay, setAutoplay] = useState(true)
  const [track, setTrack] = useState<Track>({ id: '', title: '', artist: '' })
  const [queue, setQueue] = useState<string[]>([])
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
    setPlaying(Boolean(nextTrack.audioUrl))
    setMiniPlayerVisible(true)
    setPlayerOpen(true)
  }

  const minimizePlayer = () => {
    if (playerClosing) return
    setPlayerClosing(true)
    window.setTimeout(() => { setPlayerOpen(false); setPlayerClosing(false) }, 220)
  }

  const playQueue = (trackIds: string[], startIndex: number) => {
    const startTrack = allSearchTracks.find(item => item.id === trackIds[startIndex])
    if (!startTrack) return
    setQueue(trackIds)
    selectTrack(startTrack)
  }

  const playNextTrack = () => {
    if (queue.length === 0) return
    const currentIndex = Math.max(queue.indexOf(track.id), 0)
    const nextIndex = (currentIndex + 1) % queue.length
    const next = allSearchTracks.find(item => item.id === queue[nextIndex])
    if (next) selectTrack(next)
  }

  const playPrevTrack = () => {
    if (queue.length === 0) return
    const currentIndex = Math.max(queue.indexOf(track.id), 0)
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length
    const previous = allSearchTracks.find(item => item.id === queue[prevIndex])
    if (previous) selectTrack(previous)
  }

// 음악 파일 선택 시 작동하는 이벤트 함수
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploadTokenRef.current += 1
  const uploadToken = uploadTokenRef.current

  // 1. 메타데이터 파싱 시도
  const metadata = await parseAudioMetadata(file)
  if (uploadToken !== uploadTokenRef.current) return

  // 2. 파일명에서 확장자 및 인터넷 웹사이트 광고 문구(.com, .net 등) 정제
  let rawName = file.name
    .replace(/\.[^/.]+$/, "") // 확장자(.mp3) 제거
    .replace(/(www\.)?[a-zA-Z0-9-]+\.(com|net|org|co\.kr|kr)/gi, "") // APLMate.com 같은 도메인 제거
    .replace(/[-_]/g, " ") // 하이픈/언더바 제거
    .trim()

  // 3. 제목과 아티스트 다듬기
  let finalTitle = metadata.title && metadata.title.trim().length > 0 ? metadata.title : rawName
  let finalArtist = metadata.artist && metadata.artist.trim().length > 0 ? metadata.artist : '알 수 없는 아티스트'

  // 메타데이터가 없어서 파일명을 썼는데도 제목이 비어있다면 원본 파일명 사용
  if (!finalTitle) finalTitle = file.name.replace(/\.[^/.]+$/, "")

  // 4. 썸네일(앨범 아트)이 없으면 예쁜 랜덤 앨범아트(Unsplash/Picsum) 자동 할당
  const fallbackCover = `https://picsum.photos/400/400?random=${Date.now()}`
  const finalCover = metadata.coverUrl || fallbackCover

  setUploadPreview({ file, title: finalTitle, artist: finalArtist, coverUrl: finalCover })
}

  const confirmUpload = () => {
    if (!uploadPreview) return
    const newTrack: Track = {
      id: crypto.randomUUID(),
      title: uploadPreview.title,
      artist: uploadPreview.artist,
      coverUrl: uploadPreview.coverUrl,
      audioUrl: URL.createObjectURL(uploadPreview.file)
    }
    setAllSearchTracks(prev => [newTrack, ...prev])
    setQueue([newTrack.id])
    selectTrack(newTrack)
    uploadTokenRef.current += 1
    setUploadSheetOpen(false)
    setUploadPreview(null)
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = ''
  }

  const createPlaylist = () => {
    const name = playlistName.trim()
    if (!name) return
    const newPlaylist: Playlist = { id: crypto.randomUUID(), name, trackIds: [] }
    setPlaylists(current => [...current, newPlaylist])
    setPlaylistName('')
    setCreateSheetOpen(false)
    setTargetPlaylistId(newPlaylist.id)
    setSelectedTrackIds([])
    setSongAddSheetOpen(true)
  }
  const toggleSong = (trackId: string) => setSelectedTrackIds(current => current.includes(trackId) ? current.filter(id => id !== trackId) : [...current, trackId])
  const addSongsToPlaylist = () => {
    if (!targetPlaylistId || selectedTrackIds.length === 0) return
    setPlaylists(current => current.map(playlist => playlist.id === targetPlaylistId ? { ...playlist, trackIds: [...playlist.trackIds, ...selectedTrackIds.filter(id => !playlist.trackIds.includes(id))] } : playlist))
    setSongAddSheetOpen(false)
    setActivePlaylistId(targetPlaylistId)
  }
  const deletePlaylist = (id: string) => {
    setPlaylists(current => current.filter(playlist => playlist.id !== id))
    if (activePlaylistId === id) setActivePlaylistId(null)
    setPlaylistPendingDeleteId(null)
  }
  const movePlaylistSong = (trackId: string, targetTrackId: string) => {
    if (!activePlaylistId) return
    setPlaylists(current => current.map(playlist => {
      if (playlist.id !== activePlaylistId) return playlist
      const trackIds = [...playlist.trackIds]
      const index = trackIds.indexOf(trackId)
      const targetIndex = trackIds.indexOf(targetTrackId)
      if (index < 0 || targetIndex < 0 || index === targetIndex) return playlist
      trackIds.splice(index, 1)
      trackIds.splice(targetIndex, 0, trackId)
      return { ...playlist, trackIds }
    }))
  }
  const deletePlaylistSong = (trackId: string) => {
    if (!activePlaylistId) return
    setPlaylists(current => current.map(playlist => playlist.id === activePlaylistId ? { ...playlist, trackIds: playlist.trackIds.filter(id => id !== trackId) } : playlist))
  }
  const saveDiary = () => {
    const text = diaryText.trim()
    if (!text) return
    const now = new Date()
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const savedTrack = { ...track }
    setDiaryEntries(current => [{ id: crypto.randomUUID(), date, mood: diaryMood, text, track: savedTrack }, ...current])
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
  const openPlaylist = activePlaylistId ? playlists.find(playlist => playlist.id === activePlaylistId) : undefined
  const playlistForSongPicker = targetPlaylistId ? playlists.find(playlist => playlist.id === targetPlaylistId) : undefined
  const detailTracks = openPlaylist ? openPlaylist.trackIds.map(trackId => allSearchTracks.find(item => item.id === trackId)).filter((item): item is Track => Boolean(item)) : []
  const availableSongs = playlistForSongPicker ? allSearchTracks.filter(item => !playlistForSongPicker.trackIds.includes(item.id)) : allSearchTracks

  useEffect(() => {
    const cleanTracks = allSearchTracks.map(item => {
      const cleanTrack = { ...item }
      delete cleanTrack.audioUrl
      return cleanTrack
    })
    try {
      localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(cleanTracks))
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
  }, [allSearchTracks])
  useEffect(() => {
    try {
      localStorage.setItem(PLAYLIST_STORAGE_KEY_V2, JSON.stringify(playlists))
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
  }, [playlists])
  useEffect(() => {
    const cleanEntries = diaryEntries.map(entry => {
      const cleanTrack = { ...entry.track }
      delete cleanTrack.audioUrl
      return { ...entry, track: cleanTrack }
    })
    try {
      localStorage.setItem(DIARY_STORAGE_KEY_V2, JSON.stringify(cleanEntries))
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
  }, [diaryEntries])

  const moodStyle = mood ? {
    '--mood-start': mood.start, '--mood-middle': mood.middle, '--mood-end': mood.end, '--mood-chip': mood.chip,
  } as React.CSSProperties : undefined

  return <main className={mood ? 'phone-shell mood-active' : 'phone-shell'} style={moodStyle}>
    <audio
      ref={audioRef}
      onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
      onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
      onEnded={() => autoplay ? playNextTrack() : setPlaying(false)}
    />

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
        {activePlaylistId ? <><section className="detail-track-list">{detailTracks.map(item => <div className={draggedTrackId === item.id ? 'detail-track-row dragging' : 'detail-track-row'} data-track-id={item.id} key={item.id}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span><div className="song-actions"><button className="order-handle" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedTrackId(item.id) }} onPointerMove={event => { if (!draggedTrackId) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-track-id]')?.dataset.trackId; if (target && target !== draggedTrackId) movePlaylistSong(draggedTrackId, target) }} onPointerUp={() => setDraggedTrackId(null)} onPointerCancel={() => setDraggedTrackId(null)} aria-label={`${item.title} 순서 변경`}><img src={orderIcon} alt="" /></button><button className="song-delete-button" onClick={() => deletePlaylistSong(item.id)} aria-label={`${item.title} 삭제`}>삭제</button></div></div>)}</section><button className="add-song-button" onClick={() => { setTargetPlaylistId(activePlaylistId); setSelectedTrackIds([]); setSongAddSheetOpen(true) }}>+ 곡 추가</button></> : diaryWriting ? <section className="diary-form"><div className="diary-date">오늘 · {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/ /g, '')}</div><div className="diary-form-section"><h2>오늘의 기분</h2><div className="diary-mood-list">{moods.map(item => <button key={item.name} className={diaryMood === item.name ? 'diary-mood selected' : 'diary-mood'} onClick={() => setDiaryMood(item.name)}>{item.name}</button>)}</div></div><div className="diary-form-section"><h2>오늘의 이야기</h2><label className="diary-textarea"><textarea value={diaryText} onChange={event => setDiaryText(event.target.value.slice(0, 300))} placeholder="오늘 들은 음악과 마음을 기록해 보세요." aria-label="일기 내용" /><span>{diaryText.length}/300</span></label></div><div className="diary-form-section"><h2>함께 들은 곡</h2><div className="diary-selected-track"><span className="artwork" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{track.title}</strong><span>{track.artist}</span></span></div></div><button className="create-button diary-save-button" onClick={saveDiary}>저장하기</button></section> : myScreen === 'settings' ? <section className="my-detail"><button className="my-setting-row" onClick={() => setAutoplay(!autoplay)}><span>자동 재생</span><span className={autoplay ? 'toggle on' : 'toggle'}><i /></span></button><div className="my-setting-row"><span>재생 오프 타이머</span><small>사용 안 함</small></div></section> : myScreen === 'terms' ? <section className="terms-content"><h2>이용약관</h2><p>이 앱은 기기 내부에만 데이터를 저장하며, 계정·서버·분석 스크립트를 사용하지 않습니다.</p><p>작성한 일기와 플레이리스트는 이 기기에서만 관리됩니다.</p></section> : myScreen === 'diaries' ? diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <article className="diary-card" key={entry.id}><div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div><p>{entry.text}</p><div className="diary-track"><span className="artwork" style={entry.track.coverUrl ? { backgroundImage: `url(${entry.track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{entry.track.title}</strong><span>{entry.track.artist}</span></span><button className="icon-button play-button" onClick={() => { setQueue([entry.track.id]); selectTrack(entry.track) }} aria-label={`${entry.track.title} 재생`}><img src={diaryPlayIcon} alt="" /></button></div></article>)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>작성한 일기가 없어요</h2><p>일기를 쓰면 이곳에서 다시 볼 수 있어요.</p></section> : tab === '홈' ? <>
        <section className="mood-section"><h2>오늘 기분은 어때요?</h2><div className="mood-list">
          {moods.map(item => <button key={item.name} className={mood?.name === item.name ? 'mood-chip selected' : 'mood-chip'} onClick={() => setMood(item.name === mood?.name ? null : item)}>{item.name}</button>)}
        </div></section>
      <section className="music-section"><h2>오늘의 추천</h2>{allSearchTracks.slice(0, 2).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => playQueue(allSearchTracks.map(current => current.id), allSearchTracks.findIndex(current => current.id === item.id))} />)}{allSearchTracks.length === 0 && <p className="no-results">업로드한 음악이 없어요.</p>}</section>
        <section className="music-section"><h2>최근 재생</h2>{allSearchTracks.slice(2, 4).map(item => <TrackRow key={item.id} track={item} light={Boolean(mood)} onPlay={() => playQueue(allSearchTracks.map(current => current.id), allSearchTracks.findIndex(current => current.id === item.id))} />)}</section>
      </> : tab === '라이브러리' ? <>
        <div className="library-filters">{['전체', '좋아요', '최근재생'].map(filter => <button key={filter} onClick={() => setLibraryFilter(filter)} className={libraryFilter === filter ? 'library-filter active-filter' : 'library-filter'}>{filter}</button>)}</div>
        <section className="playlist-section"><div className="playlist-heading"><h2>내 플레이리스트</h2><div><button onClick={() => setCreateSheetOpen(true)}>+ 만들기</button><button className="upload-track-button" onClick={() => setUploadSheetOpen(true)}>+ 음악 추가</button></div></div>{playlists.map(playlist => { const playlistTrack: Track = { id: playlist.id, title: playlist.name, artist: `곡 ${playlist.trackIds.length}개` }
          const firstTrack = allSearchTracks.find(item => item.id === playlist.trackIds[0])
          return <TrackRow key={playlist.id} track={playlistTrack} light={false} onRowClick={() => setActivePlaylistId(playlist.id)} onDelete={() => setPlaylistPendingDeleteId(playlist.id)} onPlay={firstTrack ? () => playQueue(playlist.trackIds, 0) : undefined} />
        })}</section>
      </> : tab === '일기' ? diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <article className="diary-card" key={entry.id}><div className="diary-card-top"><time>{entry.date}</time><span>{entry.mood}</span></div><p>{entry.text}</p><div className="diary-track"><span className="artwork" style={entry.track.coverUrl ? { backgroundImage: `url(${entry.track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{entry.track.title}</strong><span>{entry.track.artist}</span></span><button className="icon-button play-button" onClick={() => { setQueue([entry.track.id]); selectTrack(entry.track) }} aria-label={`${entry.track.title} 재생`}><img src={diaryPlayIcon} alt="" /></button></div></article>)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>아직 쓴 일기가 없어요</h2><p>오늘 들은 음악과 마음을 기록해 보세요.</p><button className="create-button" onClick={() => setDiaryWriting(true)}>첫 일기 쓰기</button></section> : tab === '마이' ? <section className="my-page"><section className="my-summary"><span className="my-avatar" aria-hidden="true" /><div><h2>나의 음악 일기</h2><p>음악으로 기록한 나만의 하루</p></div></section><section className="my-stats"><div><strong>{playlists.length}</strong><span>플레이리스트</span></div><button onClick={() => setMyScreen('diaries')}><strong>{diaryEntries.length}</strong><span>일기</span></button></section><section className="my-menu"><h2>설정</h2><button onClick={() => setMyScreen('settings')}><span>재생 설정</span><b>›</b></button><button onClick={() => setMyScreen('terms')}><span>이용약관</span><b>›</b></button></section></section> : tab === '탐색' ? <>
        <label className="search-field"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="검색" aria-label="음악 검색" /></label>
        <section className="search-results" aria-live="polite">{searchResults.map(item => <TrackRow key={item.id} track={item} light={false} onPlay={() => playQueue(searchResults.map(current => current.id), searchResults.findIndex(current => current.id === item.id))} />)}{searchResults.length === 0 && <p className="no-results">검색 결과가 없어요.</p>}</section>
      </> : <section className="empty-screen"><h2>{tab}</h2><p>{tab} 화면은 곧 준비됩니다.</p></section>}
    </section>
    </div>
    {miniPlayerVisible && !playerOpen && <div className="mini-player"><button className="mini-player-main" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기"><span className="artwork mini-art" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="mini-copy"><strong>{track.title}</strong><span>{track.artist}</span></span></button><button className="mini-control" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button className="mini-control" onClick={playNextTrack} aria-label="다음 곡"><img src={nextIcon} alt="" /></button></div>}
    <nav className="nav-footer" aria-label="주요 메뉴">{tabs.map(([name, icon]) => <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => { setActivePlaylistId(null); setDiaryWriting(false); setMyScreen('main'); setTab(name) }}><img src={icon} alt="" /><span>{name}</span></button>)}</nav>
    {playerOpen && <div className={playerClosing ? 'player-overlay player-closing' : 'player-overlay'} onClick={minimizePlayer}><section className={playerClosing ? 'player-sheet player-sheet-closing' : 'player-sheet'} onClick={event => event.stopPropagation()} onPointerDown={event => setPlayerDragStart(event.clientY)} onPointerUp={event => { if (playerDragStart !== null && event.clientY - playerDragStart > 80) minimizePlayer(); setPlayerDragStart(null) }} onPointerCancel={() => setPlayerDragStart(null)} aria-label="전체 플레이어"><div className="player-sheet-handle" aria-hidden="true" /><div className="sheet-artwork" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><h2>{track.title}</h2><p>{track.artist}</p><input aria-label="재생 위치" type="range" min="0" max={Math.max(duration, 1)} value={Math.min(currentTime, duration || 0)} onChange={event => { const nextTime = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = nextTime; setCurrentTime(nextTime) }} /><div className="time-row"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div><div className="sheet-controls"><button aria-label="이전 곡" onClick={playPrevTrack}>‹‹</button><button className="sheet-play" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡" onClick={playNextTrack}>››</button></div></section></div>}
    {createSheetOpen && <div className="create-overlay"><section className="create-sheet" aria-label="새 플레이리스트 만들기"><header><h2>새 플레이리스트</h2><button onClick={() => setCreateSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><input autoFocus value={playlistName} onChange={event => setPlaylistName(event.target.value)} onKeyDown={event => event.key === 'Enter' && createPlaylist()} placeholder="예: 비 오는 날 듣는 곡" aria-label="플레이리스트 이름" /><button className="create-button" onClick={createPlaylist}>만들기</button></section></div>}
    {uploadSheetOpen && <div className="create-overlay" onClick={() => { uploadTokenRef.current += 1; setUploadSheetOpen(false); setUploadPreview(null); if (uploadFileInputRef.current) uploadFileInputRef.current.value = '' }}><section className="create-sheet" onClick={event => event.stopPropagation()} aria-label="음악 추가"><header><h2>음악 추가</h2><button onClick={() => { uploadTokenRef.current += 1; setUploadSheetOpen(false); setUploadPreview(null); if (uploadFileInputRef.current) uploadFileInputRef.current.value = '' }} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search">음악 파일<input ref={uploadFileInputRef} type="file" accept="audio/mpeg,audio/mp3" onChange={handleFileUpload} /></label>{uploadPreview && <><div className="diary-selected-track"><span className="artwork" style={uploadPreview.coverUrl ? { backgroundImage: `url(${uploadPreview.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{uploadPreview.title}</strong><span>{uploadPreview.artist}</span></span></div><button className="create-button" onClick={confirmUpload}>추가</button></>}</section></div>}
    {songAddSheetOpen && <div className="create-overlay" onClick={() => setSongAddSheetOpen(false)}><section className="song-add-sheet" onClick={event => event.stopPropagation()} aria-label="플레이리스트에 곡 추가"><header><h2>곡 추가</h2><button onClick={() => setSongAddSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search"><input placeholder="검색" aria-label="추가할 곡 검색" /></label><div className="song-options">{availableSongs.map(item => { const selected = selectedTrackIds.includes(item.id); return <button key={item.id} className="song-option" onClick={() => toggleSong(item.id)}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span><span className={selected ? 'circle-choice checked' : 'circle-choice'}>{selected ? '✓' : <img src={checkboxCircleIcon} alt="" />}</span></button> })}</div>{availableSongs.length === 0 && <p className="no-results">추가할 수 있는 곡이 없어요.</p>}<button className="create-button" onClick={addSongsToPlaylist}>{selectedTrackIds.length}곡 추가</button></section></div>}
    {playlistPendingDeleteId && <div className="create-overlay delete-overlay" onClick={() => setPlaylistPendingDeleteId(null)}><section className="delete-dialog" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">플레이리스트를 삭제할까요?</h2><p>삭제한 플레이리스트는 되돌릴 수 없어요.</p><div><button onClick={() => setPlaylistPendingDeleteId(null)}>취소</button><button className="confirm-delete" onClick={() => deletePlaylist(playlistPendingDeleteId)}>삭제</button></div></section></div>}
  </main>
}

export default App
