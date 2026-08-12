import type { Dispatch, SetStateAction } from 'react'
import './MyScreen.css'

import { DiaryCard } from '../components/DiaryCard'
import type { DiaryEntry, Playlist, Track } from '../types'

const credits = [
  { name: '희찬', github: 'hkpiuuyk' },
  { name: 'srit', github: 'Special-Srit' },
  { name: 'cheonnan', github: 'cheonnan' },
]

type MyScreenProps = {
  visible: boolean
  myScreen: 'main' | 'diaries' | 'settings' | 'terms' | 'credits'
  setMyScreen: Dispatch<SetStateAction<'main' | 'diaries' | 'settings' | 'terms' | 'credits'>>
  autoplay: boolean
  setAutoplay: Dispatch<SetStateAction<boolean>>
  playlists: Playlist[]
  diaryEntries: DiaryEntry[]
  allSearchTracks: Track[]
  playQueue: (trackIds: string[], startIndex: number, sourceLabel?: string) => void
  setTab: Dispatch<SetStateAction<string>>
}

export function MyScreen({ visible, myScreen, setMyScreen, autoplay, setAutoplay, playlists, diaryEntries, allSearchTracks, playQueue, setTab }: MyScreenProps) {
  const playDiaryEntry = (entry: DiaryEntry) => {
    playQueue([entry.track.id], 0)
  }

  if (!visible) return null
  if (myScreen === 'settings') return <section className="my-detail"><button className="my-setting-row" onClick={() => setAutoplay(!autoplay)}><span>자동 재생</span><span className={autoplay ? 'toggle on' : 'toggle'}><i /></span></button><div className="my-setting-row disabled"><span>재생 오프 타이머</span><small>준비 중</small></div></section>
  if (myScreen === 'terms') return <section className="terms-content"><h2>이용약관</h2><p>이 앱은 기기 내부에만 데이터를 저장하며, 계정·서버·분석 스크립트를 사용하지 않습니다.</p><p>작성한 일기와 플레이리스트는 이 기기에서만 관리됩니다.</p></section>
  if (myScreen === 'credits') return <section className="terms-content credits-content"><h2>크레딧</h2><p>이 프로젝트는 팀 Clova가 만들었습니다.</p><ul className="credits-list">{credits.map(person => <li key={person.github}><span>{person.name}</span><a href={`https://github.com/${person.github}`} target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>)}</ul></section>
  if (myScreen === 'diaries') return diaryEntries.length > 0 ? <section className="diary-list">{diaryEntries.map(entry => <DiaryCard key={entry.id} entry={entry} allSearchTracks={allSearchTracks} onPlay={playDiaryEntry} />)}</section> : <section className="diary-empty"><span className="diary-empty-mark" aria-hidden="true" /><h2>작성한 일기가 없어요</h2><p>일기를 쓰면 이곳에서 다시 볼 수 있어요.</p></section>
  return <section className="my-page"><section className="my-summary"><span className="my-avatar" aria-hidden="true" /><div><h2>나의 음악 일기</h2><p>음악으로 기록한 나만의 하루</p></div></section><section className="my-stats"><button onClick={() => setTab('라이브러리')}><strong>{playlists.length}</strong><span>플레이리스트</span></button><button onClick={() => setMyScreen('diaries')}><strong>{diaryEntries.length}</strong><span>일기</span></button></section><section className="my-menu"><h2>설정</h2><button onClick={() => setMyScreen('settings')}><span>재생 설정</span><b>›</b></button><button onClick={() => setMyScreen('terms')}><span>이용약관</span><b>›</b></button><button onClick={() => setMyScreen('credits')}><span>크레딧</span><b>›</b></button></section></section>
}
