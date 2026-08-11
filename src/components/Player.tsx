import type { ChangeEvent } from 'react'
import './Player.css'

import pauseIcon from '../assets/figma/pause.svg'
import playIcon from '../assets/figma/play.svg'
import nextIcon from '../assets/figma/next.svg'

import type { PlayerState } from '../hooks/usePlayer'

type MiniPlayerProps = Pick<PlayerState, 'track' | 'playing' | 'miniPlayerVisible' | 'playerOpen' | 'setPlaying' | 'setPlayerOpen' | 'playNextTrack'>

export function MiniPlayer({ track, playing, miniPlayerVisible, playerOpen, setPlaying, setPlayerOpen, playNextTrack }: MiniPlayerProps) {
  if (!miniPlayerVisible || playerOpen) return null
  return <div className="mini-player"><button className="mini-player-main" onClick={() => setPlayerOpen(true)} aria-label="전체 플레이어 열기"><span className="artwork mini-art" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><span className="mini-copy"><strong>{track.title}</strong><span>{track.artist}</span></span></button><button className="mini-control" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button className="mini-control" onClick={playNextTrack} aria-label="다음 곡"><img src={nextIcon} alt="" /></button></div>
}

type PlayerSheetProps = Pick<PlayerState, 'track' | 'playing' | 'playerOpen' | 'playerClosing' | 'audioRef' | 'currentTime' | 'duration' | 'setPlaying' | 'setCurrentTime' | 'playerDragStart' | 'setPlayerDragStart' | 'playNextTrack' | 'playPrevTrack' | 'minimizePlayer' | 'formatTime'>

export function PlayerSheet({ track, playing, playerOpen, playerClosing, audioRef, currentTime, duration, setPlaying, setCurrentTime, playerDragStart, setPlayerDragStart, playNextTrack, playPrevTrack, minimizePlayer, formatTime }: PlayerSheetProps) {
  if (!playerOpen) return null
  return <div className={playerClosing ? 'player-overlay player-closing' : 'player-overlay'} onClick={minimizePlayer}><section className={playerClosing ? 'player-sheet player-sheet-closing' : 'player-sheet'} onClick={event => event.stopPropagation()} onPointerDown={event => setPlayerDragStart(event.clientY)} onPointerUp={event => { if (playerDragStart !== null && event.clientY - playerDragStart > 80) minimizePlayer(); setPlayerDragStart(null) }} onPointerCancel={() => setPlayerDragStart(null)} aria-label="전체 플레이어"><div className="player-sheet-handle" aria-hidden="true" /><div className="sheet-artwork" style={track.coverUrl ? { backgroundImage: `url(${track.coverUrl})`, backgroundSize: 'cover' } : undefined} /><h2>{track.title}</h2><p>{track.artist}</p><input aria-label="재생 위치" type="range" min="0" max={Math.max(duration, 1)} value={Math.min(currentTime, duration || 0)} onChange={(event: ChangeEvent<HTMLInputElement>) => { const nextTime = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = nextTime; setCurrentTime(nextTime) }} /><div className="time-row"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div><div className="sheet-controls"><button aria-label="이전 곡" onClick={playPrevTrack}>‹‹</button><button className="sheet-play" onClick={() => setPlaying(current => track.audioUrl ? !current : false)} aria-label={playing ? '일시 정지' : '재생'}><img src={playing ? pauseIcon : playIcon} alt="" /></button><button aria-label="다음 곡" onClick={playNextTrack}>››</button></div></section></div>
}

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
  handleTimeUpdate,
  handleLoadedMetadata,
  handleEnded,
  playNextTrack,
  playPrevTrack,
  minimizePlayer,
  formatTime,
}: PlayerState) {
  return <>
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
    />
    <MiniPlayer track={track} playing={playing} miniPlayerVisible={miniPlayerVisible} playerOpen={playerOpen} setPlaying={setPlaying} setPlayerOpen={setPlayerOpen} playNextTrack={playNextTrack} />
    <PlayerSheet track={track} playing={playing} playerOpen={playerOpen} playerClosing={playerClosing} audioRef={audioRef} currentTime={currentTime} duration={duration} setPlaying={setPlaying} setCurrentTime={setCurrentTime} playerDragStart={playerDragStart} setPlayerDragStart={setPlayerDragStart} playNextTrack={playNextTrack} playPrevTrack={playPrevTrack} minimizePlayer={minimizePlayer} formatTime={formatTime} />
  </>
}
