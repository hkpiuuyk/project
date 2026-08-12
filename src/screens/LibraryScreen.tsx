import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import './LibraryScreen.css'

import orderIcon from '../assets/figma/order.svg'
import { LibrarySheets, type UploadPreview } from '../components/LibrarySheets'
import { TrackRow } from '../components/TrackRow'
import { parseAudioMetadata } from '../lib/audioMetadata'
import { saveTrackAudio, saveTrackCover } from '../lib/storage'
import type { Playlist, Track } from '../types'

type LibraryScreenProps = {
  visible: boolean
  allSearchTracks: Track[]
  setAllSearchTracks: Dispatch<SetStateAction<Track[]>>
  playlists: Playlist[]
  setPlaylists: Dispatch<SetStateAction<Playlist[]>>
  activePlaylistId: string | null
  setActivePlaylistId: Dispatch<SetStateAction<string | null>>
  playQueue: (trackIds: string[], startIndex: number, sourceLabel?: string) => void
  likedTrackIds: string[]
  toggleLike: (trackId: string) => void
}

export function LibraryScreen({ visible, allSearchTracks, setAllSearchTracks, playlists, setPlaylists, activePlaylistId, setActivePlaylistId, playQueue, likedTrackIds, toggleLike }: LibraryScreenProps) {
  const [libraryFilter, setLibraryFilter] = useState('전체')
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false)
  const [uploadPreviews, setUploadPreviews] = useState<UploadPreview[]>([])
  const [uploadResult, setUploadResult] = useState<Track[] | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTokenRef = useRef(0)
  const [songAddSheetOpen, setSongAddSheetOpen] = useState(false)
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | null>(null)
  const [playlistPendingDeleteId, setPlaylistPendingDeleteId] = useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null)

  // 음악 파일 선택 시 작동하는 이벤트 함수
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const previousCoverUrls = uploadPreviews.map(preview => preview.coverUrl)
    uploadTokenRef.current += 1
    const uploadToken = uploadTokenRef.current

    const parsed = await Promise.all(files.map(async (file, index) => {
      // 1. 메타데이터 파싱 시도
      const metadata = await parseAudioMetadata(file)

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
      const fallbackCover = `https://picsum.photos/400/400?random=${Date.now()}-${index}`
      const finalCover = metadata.coverUrl || fallbackCover

      return { id: crypto.randomUUID(), file, title: finalTitle, artist: finalArtist, coverUrl: finalCover, coverBlob: metadata.coverBlob }
    }))

    if (uploadToken !== uploadTokenRef.current) {
      parsed.forEach(preview => {
        if (preview.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(preview.coverUrl)
      })
      return
    }

    previousCoverUrls.forEach(coverUrl => {
      if (coverUrl?.startsWith('blob:')) URL.revokeObjectURL(coverUrl)
    })
    setUploadPreviews(parsed)
  }

  const closeUpload = () => {
    uploadTokenRef.current += 1
    setUploadSheetOpen(false)
    uploadPreviews.forEach(preview => {
      if (preview.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(preview.coverUrl)
    })
    setUploadPreviews([])
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = ''
  }

  const confirmUpload = async () => {
    if (uploadPreviews.length === 0) return
    uploadTokenRef.current += 1
    const newTracks = await Promise.all(uploadPreviews.map(async ({ id, file, title, artist, coverUrl, coverBlob }) => {
      await saveTrackAudio(id, file)
      if (coverBlob) await saveTrackCover(id, coverBlob)
      return { id, title, artist, coverUrl, audioUrl: URL.createObjectURL(file) }
    }))
    setAllSearchTracks(prev => [...newTracks, ...prev])
    setUploadSheetOpen(false)
    setUploadPreviews([])
    setUploadResult(newTracks)
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = ''
  }

  const closeUploadResult = () => setUploadResult(null)

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

  const openPlaylist = activePlaylistId ? playlists.find(playlist => playlist.id === activePlaylistId) : undefined
  const playlistForSongPicker = targetPlaylistId ? playlists.find(playlist => playlist.id === targetPlaylistId) : undefined
  const detailTracks = openPlaylist ? openPlaylist.trackIds.map(trackId => allSearchTracks.find(item => item.id === trackId)).filter((item): item is Track => Boolean(item)) : []
  const availableSongs = playlistForSongPicker ? allSearchTracks.filter(item => !playlistForSongPicker.trackIds.includes(item.id)) : allSearchTracks

  const sheetProps = {
    createSheetOpen,
    setCreateSheetOpen,
    playlistName,
    setPlaylistName,
    createPlaylist,
    uploadSheetOpen,
    closeUpload,
    uploadFileInputRef,
    handleFileUpload,
    uploadPreviews,
    confirmUpload,
    uploadResult,
    closeUploadResult,
    songAddSheetOpen,
    setSongAddSheetOpen,
    availableSongs,
    selectedTrackIds,
    toggleSong,
    addSongsToPlaylist,
    playlistPendingDeleteId,
    setPlaylistPendingDeleteId,
    deletePlaylist,
  }

  return <>
    {visible && (activePlaylistId ? <><section className="detail-track-list">{detailTracks.map(item => <div className={draggedTrackId === item.id ? 'detail-track-row dragging' : 'detail-track-row'} data-track-id={item.id} key={item.id}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span><div className="song-actions"><button className="order-handle" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedTrackId(item.id) }} onPointerMove={event => { if (!draggedTrackId) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-track-id]')?.dataset.trackId; if (target && target !== draggedTrackId) movePlaylistSong(draggedTrackId, target) }} onPointerUp={() => setDraggedTrackId(null)} onPointerCancel={() => setDraggedTrackId(null)} aria-label={`${item.title} 순서 변경`}><img src={orderIcon} alt="" /></button><button className="song-delete-button" onClick={() => deletePlaylistSong(item.id)} aria-label={`${item.title} 삭제`}>삭제</button></div></div>)}</section><button className="add-song-button" onClick={() => { setTargetPlaylistId(activePlaylistId); setSelectedTrackIds([]); setSongAddSheetOpen(true) }}>+ 곡 추가</button></> : <><div className="library-filters">{['전체', '좋아요', '최근재생'].map(filter => <button key={filter} onClick={() => setLibraryFilter(filter)} className={libraryFilter === filter ? 'library-filter active-filter' : 'library-filter'}>{filter}</button>)}</div><section className="playlist-section"><div className="playlist-heading"><h2>내 플레이리스트</h2><div><button onClick={() => setCreateSheetOpen(true)}>+ 만들기</button><button className="upload-track-button" onClick={() => setUploadSheetOpen(true)}>+ 음악 추가</button></div></div>{playlists.map(playlist => { const playlistTrack: Track = { id: playlist.id, title: playlist.name, artist: `곡 ${playlist.trackIds.length}개` }
          const firstTrack = allSearchTracks.find(item => item.id === playlist.trackIds[0])
          return <TrackRow key={playlist.id} track={playlistTrack} light={false} onRowClick={() => setActivePlaylistId(playlist.id)} onDelete={() => setPlaylistPendingDeleteId(playlist.id)} onPlay={firstTrack ? () => playQueue(playlist.trackIds, 0, playlist.name) : undefined} />
        })}</section><section className="playlist-section"><div className="playlist-heading"><h2>모든 곡</h2></div>{allSearchTracks.map(item => <TrackRow key={item.id} track={item} light={false} onPlay={() => playQueue(allSearchTracks.map(current => current.id), allSearchTracks.findIndex(current => current.id === item.id))} liked={likedTrackIds.includes(item.id)} onToggleLike={() => toggleLike(item.id)} />)}{allSearchTracks.length === 0 && <p className="no-results">업로드한 음악이 없어요.</p>}</section></>)}
    <LibrarySheets {...sheetProps} />
  </>
}
