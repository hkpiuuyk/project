import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react'

import type { Track } from '../types'

export type PlayerState = {
  audioRef: React.RefObject<HTMLAudioElement | null>
  currentTime: number
  duration: number
  autoplay: boolean
  setAutoplay: Dispatch<SetStateAction<boolean>>
  track: Track
  queue: string[]
  playing: boolean
  playerOpen: boolean
  playerClosing: boolean
  miniPlayerVisible: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  setPlayerOpen: Dispatch<SetStateAction<boolean>>
  setQueue: Dispatch<SetStateAction<string[]>>
  setCurrentTime: Dispatch<SetStateAction<number>>
  playerDragStart: number | null
  setPlayerDragStart: Dispatch<SetStateAction<number | null>>
  handleTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => void
  handleLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => void
  handleEnded: () => void
  selectTrack: (nextTrack: Track) => void
  playQueue: (trackIds: string[], startIndex: number) => void
  playNextTrack: () => void
  playPrevTrack: () => void
  minimizePlayer: () => void
  formatTime: (sec: number) => string
}

export function usePlayer(allSearchTracks: Track[]): PlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
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

  const handleTimeUpdate = (event: SyntheticEvent<HTMLAudioElement>) => setCurrentTime(event.currentTarget.currentTime)
  const handleLoadedMetadata = (event: SyntheticEvent<HTMLAudioElement>) => setDuration(event.currentTarget.duration)
  const handleEnded = () => autoplay ? playNextTrack() : setPlaying(false)

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return {
    audioRef,
    currentTime,
    duration,
    autoplay,
    setAutoplay,
    track,
    queue,
    playing,
    playerOpen,
    playerClosing,
    miniPlayerVisible,
    setPlaying,
    setPlayerOpen,
    setQueue,
    setCurrentTime,
    playerDragStart,
    setPlayerDragStart,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    selectTrack,
    playQueue,
    playNextTrack,
    playPrevTrack,
    minimizePlayer,
    formatTime,
  }
}
