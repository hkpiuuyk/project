import { useRef, useState, type ChangeEvent } from 'react'
import './Player.css'

import pauseIcon from '../assets/figma/pause.svg'
import playIcon from '../assets/figma/play.svg'
import nextIcon from '../assets/figma/next.svg'
import backIcon from '../assets/figma/back.svg'
import shuffleIcon from '../assets/figma/shuffle-line.svg'
import repeatLineIcon from '../assets/figma/repeat-line.svg'
import orderIcon from '../assets/figma/order.svg'

import type { PlayerState } from '../hooks/usePlayer'
import type { Track } from '../types'

type MiniPlayerProps = Pick<PlayerState, 'track' | 'playing' | 'miniPlayerVisible' | 'playerOpen' | 'setPlaying' | 'setPlayerOpen' | 'playNextTrack'>

export function MiniPlayer({ track, playing, miniPlayerVisible, playerOpen, setPlaying, setPlayerOpen, playNextTrack }: MiniPlayerProps) {
  if (!miniPlayerVisible || playerOpen) return null
  return <div className="mini-player"><button className="mini-player-main" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기"><span className="artwork mini-art" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="mini-copy"><strong>{track.title}</strong><span>{track.artist}</span></span></button><button className="mini-control" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button className="mini-control" onClick={playNextTrack} aria-label="다음 곡"><img src={nextIcon} alt="" /></button></div>
}

type PlayerSheetProps = Pick<PlayerState, 'track' | 'playing' | 'playerOpen' | 'playerClosing' | 'audioRef' | 'currentTime' | 'duration' | 'setPlaying' | 'setCurrentTime' | 'playerDragStart' | 'setPlayerDragStart' | 'shuffled' | 'toggleShuffle' | 'repeatOne' | 'toggleRepeatOne' | 'playNextTrack' | 'playPrevTrack' | 'minimizePlayer' | 'formatTime' | 'queueSourceLabel' | 'queue' | 'moveQueueTrack' | 'removeFromQueue'> & { allSearchTracks: Track[] }

export function PlayerSheet({ track, playing, playerOpen, playerClosing, audioRef, currentTime, duration, setPlaying, setCurrentTime, playerDragStart, setPlayerDragStart, shuffled, toggleShuffle, repeatOne, toggleRepeatOne, playNextTrack, playPrevTrack, minimizePlayer, formatTime, queueSourceLabel, queue, moveQueueTrack, removeFromQueue, allSearchTracks }: PlayerSheetProps) {
  const [draggedQueueTrackId, setDraggedQueueTrackId] = useState<string | null>(null)
  const [queueDragOffsetId, setQueueDragOffsetId] = useState<string | null>(null)
  const [queueDragOffsetX, setQueueDragOffsetX] = useState(0)
  const queueSwipeStartX = useRef<number | null>(null)
  const currentIndex = Math.max(queue.indexOf(track.id), 0)
  const upcoming = queue.slice(currentIndex + 1).map(trackId => allSearchTracks.find(item => item.id === trackId)).filter((item): item is Track => Boolean(item))

  if (!playerOpen) return null
  return <div className={playerClosing ? 'player-overlay player-closing' : 'player-overlay'} onClick={minimizePlayer}><section className={playerClosing ? 'player-sheet player-sheet-closing' : 'player-sheet'} onClick={event => event.stopPropagation()} onPointerDown={event => setPlayerDragStart(event.clientY)} onPointerUp={event => { if (playerDragStart !== null && event.clientY - playerDragStart > 80) minimizePlayer(); setPlayerDragStart(null) }} onPointerCancel={() => setPlayerDragStart(null)} aria-label="전체 플레이어"><button className="player-back-button" onClick={minimizePlayer} aria-label="전체 플레이어 닫기"><img src={backIcon} alt="" /></button><div className="player-hero"><div className="player-sheet-handle" aria-hidden="true" /><div className="sheet-artwork" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><h2>{track.title}</h2><p>{track.artist}</p>{queueSourceLabel && <p className="queue-source">{queueSourceLabel}에서 재생 중</p>}<input aria-label="재생 위치" type="range" min="0" max={Math.max(duration, 1)} value={Math.min(currentTime, duration || 0)} onChange={(event: ChangeEvent<HTMLInputElement>) => { const nextTime = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = nextTime; setCurrentTime(nextTime) }} /><div className="time-row"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div><div className="sheet-controls"><button className={shuffled ? 'icon-button shuffle-button active' : 'icon-button shuffle-button'} onClick={toggleShuffle} aria-label={shuffled ? '셔플 끄기' : '셔플 켜기'}><img src={shuffleIcon} alt="" /></button><button aria-label="이전 곡" onClick={playPrevTrack}>‹‹</button><button className="sheet-play" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡" onClick={playNextTrack}>››</button><button className={repeatOne ? 'icon-button repeat-button active' : 'icon-button repeat-button'} onClick={toggleRepeatOne} aria-label={repeatOne ? '한 곡 반복 끄기' : '한 곡 반복 켜기'}><img src={repeatLineIcon} alt="" /></button></div></div>{upcoming.length > 0 && <section className="queue-section"><h3>다음 곡</h3><div className="queue-list">{upcoming.map(item => <div key={item.id} data-track-id={item.id} className="queue-row" style={queueDragOffsetId === item.id ? { transform: `translateX(${queueDragOffsetX}px)`, transition: 'none' } : undefined} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); queueSwipeStartX.current = event.clientX; setQueueDragOffsetId(item.id) }} onPointerMove={event => { if (queueSwipeStartX.current === null) return; setQueueDragOffsetX(Math.max(0, event.clientX - queueSwipeStartX.current)) }} onPointerUp={event => { if (queueSwipeStartX.current !== null && event.clientX - queueSwipeStartX.current > 80) removeFromQueue(item.id); queueSwipeStartX.current = null; setQueueDragOffsetId(null); setQueueDragOffsetX(0) }} onPointerCancel={() => { queueSwipeStartX.current = null; setQueueDragOffsetId(null); setQueueDragOffsetX(0) }}><button className="order-handle" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedQueueTrackId(item.id) }} onPointerMove={event => { if (!draggedQueueTrackId) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-track-id]')?.dataset.trackId; if (target && target !== draggedQueueTrackId) moveQueueTrack(draggedQueueTrackId, target) }} onPointerUp={() => setDraggedQueueTrackId(null)} onPointerCancel={() => setDraggedQueueTrackId(null)} aria-label={`${item.title} 순서 변경`}><img src={orderIcon} alt="" /></button><span className="artwork" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="track-copy"><strong>{item.title}</strong><span>{item.artist}</span></span></div>)}</div></section>}</section></div>
}

type PlayerProps = PlayerState & { allSearchTracks: Track[] }

export function Player({
  audioRef,
  currentTime,
  duration,
  track,
  playing,
  playerOpen,
  playerClosing,
  miniPlayerVisible,
  setPlaying,
  setPlayerOpen,
  setCurrentTime,
  playerDragStart,
  setPlayerDragStart,
  shuffled,
  toggleShuffle,
  repeatOne,
  toggleRepeatOne,
  queueSourceLabel,
  queue,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleEnded,
  playNextTrack,
  playPrevTrack,
  moveQueueTrack,
  removeFromQueue,
  minimizePlayer,
  formatTime,
  allSearchTracks,
}: PlayerProps) {
  return <>
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
    />
    <MiniPlayer track={track} playing={playing} miniPlayerVisible={miniPlayerVisible} playerOpen={playerOpen} setPlaying={setPlaying} setPlayerOpen={setPlayerOpen} playNextTrack={playNextTrack} />
    <PlayerSheet track={track} playing={playing} playerOpen={playerOpen} playerClosing={playerClosing} audioRef={audioRef} currentTime={currentTime} duration={duration} setPlaying={setPlaying} setCurrentTime={setCurrentTime} playerDragStart={playerDragStart} setPlayerDragStart={setPlayerDragStart} shuffled={shuffled} toggleShuffle={toggleShuffle} repeatOne={repeatOne} toggleRepeatOne={toggleRepeatOne} queueSourceLabel={queueSourceLabel} queue={queue} moveQueueTrack={moveQueueTrack} removeFromQueue={removeFromQueue} allSearchTracks={allSearchTracks} playNextTrack={playNextTrack} playPrevTrack={playPrevTrack} minimizePlayer={minimizePlayer} formatTime={formatTime} />
  </>
}
