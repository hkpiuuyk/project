import type { ChangeEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import './LibrarySheets.css'

import checkboxCircleIcon from '../assets/figma/checkbox-circle.svg'
import closeIcon from '../assets/figma/close.svg'

import type { Track } from '../types'

export type UploadPreview = { file: File; title: string; artist: string; coverUrl?: string }

type LibrarySheetsProps = {
  createSheetOpen: boolean
  setCreateSheetOpen: (open: boolean) => void
  playlistName: string
  setPlaylistName: (name: string) => void
  createPlaylist: () => void
  uploadSheetOpen: boolean
  closeUpload: () => void
  uploadFileInputRef: RefObject<HTMLInputElement | null>
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  uploadPreview: UploadPreview | null
  confirmUpload: () => void
  songAddSheetOpen: boolean
  setSongAddSheetOpen: (open: boolean) => void
  availableSongs: Track[]
  selectedTrackIds: string[]
  toggleSong: (trackId: string) => void
  addSongsToPlaylist: () => void
  playlistPendingDeleteId: string | null
  setPlaylistPendingDeleteId: (id: string | null) => void
  deletePlaylist: (id: string) => void
}

type CreatePlaylistSheetProps = Pick<LibrarySheetsProps, 'setCreateSheetOpen' | 'playlistName' | 'setPlaylistName' | 'createPlaylist'>

export function CreatePlaylistSheet({ setCreateSheetOpen, playlistName, setPlaylistName, createPlaylist }: CreatePlaylistSheetProps) {
  return <div className="create-overlay"><section className="create-sheet" aria-label="새 플레이리스트 만들기"><header><h2>새 플레이리스트</h2><button onClick={() => setCreateSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><input autoFocus value={playlistName} onChange={event => setPlaylistName(event.target.value)} onKeyDown={event => event.key === 'Enter' && createPlaylist()} placeholder="예: 비 오는 날 듣는 곡" aria-label="플레이리스트 이름" /><button className="create-button" onClick={createPlaylist}>만들기</button></section></div>
}

type UploadSheetProps = Pick<LibrarySheetsProps, 'closeUpload' | 'uploadFileInputRef' | 'handleFileUpload' | 'uploadPreview' | 'confirmUpload'>

export function UploadSheet({ closeUpload, uploadFileInputRef, handleFileUpload, uploadPreview, confirmUpload }: UploadSheetProps) {
  return <div className="create-overlay" onClick={closeUpload}><section className="create-sheet" onClick={event => event.stopPropagation()} aria-label="음악 추가"><header><h2>음악 추가</h2><button onClick={closeUpload} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search">음악 파일<input ref={uploadFileInputRef} type="file" accept="audio/mpeg,audio/mp3" onChange={handleFileUpload} /></label>{uploadPreview && <><div className="diary-selected-track"><span className="artwork" style={uploadPreview.coverUrl ? { backgroundImage: `url(${uploadPreview.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{uploadPreview.title}</strong><span>{uploadPreview.artist}</span></span></div><button className="create-button" onClick={confirmUpload}>추가</button></>}</section></div>
}

type SongAddSheetProps = Pick<LibrarySheetsProps, 'setSongAddSheetOpen' | 'availableSongs' | 'selectedTrackIds' | 'toggleSong' | 'addSongsToPlaylist'>

export function SongAddSheet({ setSongAddSheetOpen, availableSongs, selectedTrackIds, toggleSong, addSongsToPlaylist }: SongAddSheetProps) {
  return <div className="create-overlay" onClick={() => setSongAddSheetOpen(false)}><section className="song-add-sheet" onClick={event => event.stopPropagation()} aria-label="플레이리스트에 곡 추가"><header><h2>곡 추가</h2><button onClick={() => setSongAddSheetOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header><label className="sheet-search"><input placeholder="검색" aria-label="추가할 곡 검색" /></label><div className="song-options">{availableSongs.map(item => { const selected = selectedTrackIds.includes(item.id); return <button key={item.id} className="song-option" onClick={() => toggleSong(item.id)}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span><span className={selected ? 'circle-choice checked' : 'circle-choice'}>{selected ? '✓' : <img src={checkboxCircleIcon} alt="" />}</span></button> })}</div>{availableSongs.length === 0 && <p className="no-results">추가할 수 있는 곡이 없어요.</p>}<button className="create-button" onClick={addSongsToPlaylist}>{selectedTrackIds.length}곡 추가</button></section></div>
}

type DeleteConfirmDialogProps = Pick<LibrarySheetsProps, 'playlistPendingDeleteId' | 'setPlaylistPendingDeleteId' | 'deletePlaylist'>

export function DeleteConfirmDialog({ playlistPendingDeleteId, setPlaylistPendingDeleteId, deletePlaylist }: DeleteConfirmDialogProps) {
  if (!playlistPendingDeleteId) return null
  return <div className="create-overlay delete-overlay" onClick={() => setPlaylistPendingDeleteId(null)}><section className="delete-dialog" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">플레이리스트를 삭제할까요?</h2><p>삭제한 플레이리스트는 되돌릴 수 없어요.</p><div><button onClick={() => setPlaylistPendingDeleteId(null)}>취소</button><button className="confirm-delete" onClick={() => deletePlaylist(playlistPendingDeleteId)}>삭제</button></div></section></div>
}

export function LibrarySheets({
  createSheetOpen,
  setCreateSheetOpen,
  playlistName,
  setPlaylistName,
  createPlaylist,
  uploadSheetOpen,
  closeUpload,
  uploadFileInputRef,
  handleFileUpload,
  uploadPreview,
  confirmUpload,
  songAddSheetOpen,
  setSongAddSheetOpen,
  availableSongs,
  selectedTrackIds,
  toggleSong,
  addSongsToPlaylist,
  playlistPendingDeleteId,
  setPlaylistPendingDeleteId,
  deletePlaylist,
}: LibrarySheetsProps) {
  return createPortal(<>
    {createSheetOpen && <CreatePlaylistSheet setCreateSheetOpen={setCreateSheetOpen} playlistName={playlistName} setPlaylistName={setPlaylistName} createPlaylist={createPlaylist} />}
    {uploadSheetOpen && <UploadSheet closeUpload={closeUpload} uploadFileInputRef={uploadFileInputRef} handleFileUpload={handleFileUpload} uploadPreview={uploadPreview} confirmUpload={confirmUpload} />}
    {songAddSheetOpen && <SongAddSheet setSongAddSheetOpen={setSongAddSheetOpen} availableSongs={availableSongs} selectedTrackIds={selectedTrackIds} toggleSong={toggleSong} addSongsToPlaylist={addSongsToPlaylist} />}
    <DeleteConfirmDialog playlistPendingDeleteId={playlistPendingDeleteId} setPlaylistPendingDeleteId={setPlaylistPendingDeleteId} deletePlaylist={deletePlaylist} />
  </>, document.body)
}
