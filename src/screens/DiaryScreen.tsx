import { useState, type Dispatch, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import './DiaryScreen.css'

import { moods } from '../data'
import { DiaryCard } from '../components/DiaryCard'
import closeIcon from '../assets/figma/close.svg'
import type { DiaryEntry, Track } from '../types'

type DiaryScreenProps = {
  visible: boolean
  diaryWriting: boolean
  setDiaryWriting: Dispatch<SetStateAction<boolean>>
  diaryEntries: DiaryEntry[]
  setDiaryEntries: Dispatch<SetStateAction<DiaryEntry[]>>
  track: Track
  allSearchTracks: Track[]
  setQueue: Dispatch<SetStateAction<string[]>>
  selectTrack: (track: Track) => void
}

export function DiaryScreen({ visible, diaryWriting, setDiaryWriting, diaryEntries, setDiaryEntries, track, allSearchTracks, setQueue, selectTrack }: DiaryScreenProps) {
  const [diaryMood, setDiaryMood] = useState('차분함')
  const [diaryText, setDiaryText] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const displayTrack = selectedTrack ?? track

  const saveDiary = () => {
    const text = diaryText.trim()
    if (!text) return
    const now = new Date()
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const savedTrack = { ...displayTrack }
    setDiaryEntries(current => [{ id: crypto.randomUUID(), date, mood: diaryMood, text, track: savedTrack }, ...current])
    setDiaryText('')
    setSelectedTrack(null)
    setDiaryWriting(false)
  }

  const playDiaryEntry = (entry: DiaryEntry) => {
    setQueue([entry.track.id])
    selectTrack(entry.track)
  }

  if (!visible) return null
  if (diaryWriting) return <><section className="diary-form"><div className="diary-date">오늘 · {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/ /g, '')}</div><div className="diary-form-section"><h2>오늘의 기분</h2><div className="diary-mood-list">{moods.map(item => <button key={item.name} className={diaryMood === item.name ? 'diary-mood selected' : 'diary-mood'} onClick={() => setDiaryMood(item.name)}>{item.name}</button>)}</div></div><div className="diary-form-section"><h2>오늘의 이야기</h2><label className="diary-textarea"><textarea value={diaryText} onChange={event => setDiaryText(event.target.value.slice(0, 300))} placeholder="오늘 들은 음악과 마음을 기록해 보세요." aria-label="일기 내용" /><span>{diaryText.length}/300</span></label></div><div className="diary-form-section"><h2>함께 들은 곡</h2><button type="button" className="diary-selected-track" onClick={() => setPickerOpen(true)} aria-label="함께 들은 곡 선택"><span className="artwork" style={displayTrack.coverUrl ? { backgroundImage: `url(${displayTrack.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{displayTrack.title}</strong><span>{displayTrack.artist}</span></span></button></div><button className="create-button diary-save-button" onClick={saveDiary}>저장하기</button></section>{pickerOpen && createPortal(<div className="create-overlay" onClick={() => setPickerOpen(false)}><section className="song-add-sheet" onClick={event => event.stopPropagation()} aria-label="곡 선택"><header><h2>곡 선택</h2><button onClick={() => setPickerOpen(false)} aria-label="닫기"><img src={closeIcon} alt="" /></button></header>{allSearchTracks.length === 0 ? <p className="no-results">선택할 수 있는 곡이 없어요.</p> : <div className="song-options">{allSearchTracks.map(item => <button key={item.id} className="song-option" onClick={() => { setSelectedTrack(item); setPickerOpen(false) }}><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span></button>)}</div>}</section></div>, document.body)}</>
  return diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <DiaryCard key={entry.id} entry={entry} onPlay={playDiaryEntry} />)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>아직 쓴 일기가 없어요</h2><p>오늘 들은 음악과 마음을 기록해 보세요.</p><button className="create-button" onClick={() => setDiaryWriting(true)}>첫 일기 쓰기</button></section>
}
