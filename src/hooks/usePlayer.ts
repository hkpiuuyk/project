import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react'

import { loadNowPlaying, saveNowPlaying } from '../lib/storage'
import type { Track } from '../types'

const shuffleArray = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export type PlayerState = {
  audioRef: React.RefObject<HTMLAudioElement | null>
  currentTime: number
  duration: number
  autoplay: boolean
  setAutoplay: Dispatch<SetStateAction<boolean>>
  shuffled: boolean
  toggleShuffle: () => void
  repeatOne: boolean
  toggleRepeatOne: () => void
  track: Track
  queue: string[]
  queueSourceLabel: string | null
  playing: boolean
  playerOpen: boolean
  playerClosing: boolean
  miniPlayerVisible: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  setPlayerOpen: Dispatch<SetStateAction<boolean>>
  setCurrentTime: Dispatch<SetStateAction<number>>
  handleTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => void
  handleLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => void
  handleEnded: () => void
  playQueue: (trackIds: string[], startIndex: number, sourceLabel?: string) => void
  playNextTrack: () => void
  playPrevTrack: () => void
  moveQueueTrack: (trackId: string, targetTrackId: string) => void
  removeFromQueue: (trackId: string) => void
  minimizePlayer: () => void
  formatTime: (sec: number) => string
}

export function usePlayer(allSearchTracks: Track[], onPlay?: (trackId: string) => void): PlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [shuffled, setShuffled] = useState(false)
  const [repeatOne, setRepeatOne] = useState(false)
  const [track, setTrack] = useState<Track>({ id: '', title: '', artist: '' })
  const [queue, setQueue] = useState<string[]>([])
  const [queueSourceLabel, setQueueSourceLabel] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerClosing, setPlayerClosing] = useState(false)
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false)
  const resumeTimeRef = useRef<number | null>(null)
  const restoredRef = useRef(false)

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

  // Restore the last-playing track/queue/position once, right after mount. Runs only on the
  // first render regardless of allSearchTracks changes (it re-checks on every change until it
  // either finds the track or confirms it's gone, then never runs again).
  useEffect(() => {
    if (restoredRef.current) return
    const nowPlaying = loadNowPlaying()
    if (!nowPlaying) { restoredRef.current = true; return }
    const restoredTrack = allSearchTracks.find(item => item.id === nowPlaying.trackId)
    if (!restoredTrack) { restoredRef.current = true; saveNowPlaying(null); return }
    restoredRef.current = true
    resumeTimeRef.current = nowPlaying.currentTime
    setQueue(nowPlaying.queue)
    setQueueSourceLabel(nowPlaying.queueSourceLabel)
    setTrack(restoredTrack)
    setMiniPlayerVisible(true)
  }, [allSearchTracks])

  // Keep the current track's audioUrl/coverUrl in sync with allSearchTracks. track is a
  // snapshot taken at select-time, so if IndexedDB hydration (audio/cover blobs) finishes after
  // the track was already selected or restored, this is what lets the real media catch up.
  useEffect(() => {
    if (!track.id) return
    const latest = allSearchTracks.find(item => item.id === track.id)
    if (latest && (latest.audioUrl !== track.audioUrl || latest.coverUrl !== track.coverUrl)) {
      setTrack(latest)
    }
  }, [allSearchTracks, track.id, track.audioUrl, track.coverUrl])

  // Autosave now-playing so an abrupt stop (crash, backgrounded tab getting killed, force-close)
  // still resumes close to where it left off, not just a graceful reload. Reads through refs so
  // this effect (and its interval/listeners) is set up once, not torn down on every currentTime tick.
  const nowPlayingRef = useRef({ trackId: track.id, queue, queueSourceLabel })
  nowPlayingRef.current = { trackId: track.id, queue, queueSourceLabel }
  useEffect(() => {
    const persistNowPlaying = () => {
      const { trackId, queue: currentQueue, queueSourceLabel: currentLabel } = nowPlayingRef.current
      if (!trackId) return
      saveNowPlaying({ trackId, queue: currentQueue, queueSourceLabel: currentLabel, currentTime: audioRef.current?.currentTime ?? 0 })
    }
    const interval = window.setInterval(persistNowPlaying, 5000)
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') persistNowPlaying() }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', persistNowPlaying)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', persistNowPlaying)
    }
  }, [])

  const selectTrack = (nextTrack: Track) => {
    setTrack(nextTrack)
    const canPlay = Boolean(nextTrack.audioUrl)
    setPlaying(canPlay)
    setMiniPlayerVisible(true)
    if (canPlay) onPlay?.(nextTrack.id)
  }

  const minimizePlayer = () => {
    if (playerClosing) return
    setPlayerClosing(true)
    window.setTimeout(() => { setPlayerOpen(false); setPlayerClosing(false) }, 220)
  }

  const playQueue = (trackIds: string[], startIndex: number, sourceLabel?: string) => {
    setQueueSourceLabel(sourceLabel ?? null)
    const startTrack = allSearchTracks.find(item => item.id === trackIds[startIndex])
    if (!startTrack) return
    setQueue(trackIds)
    selectTrack(startTrack)
  }

  const toggleShuffle = () => {
    setShuffled(current => {
      const next = !current
      if (next) {
        setQueue(currentQueue => {
          const currentIndex = Math.max(currentQueue.indexOf(track.id), 0)
          const before = currentQueue.slice(0, currentIndex + 1)
          const after = currentQueue.slice(currentIndex + 1)
          return [...before, ...shuffleArray(after)]
        })
      }
      return next
    })
  }

  const toggleRepeatOne = () => setRepeatOne(current => !current)

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

  const moveQueueTrack = (trackId: string, targetTrackId: string) => {
    setQueue(current => {
      const ids = [...current]
      const index = ids.indexOf(trackId)
      const targetIndex = ids.indexOf(targetTrackId)
      if (index < 0 || targetIndex < 0 || index === targetIndex) return current
      ids.splice(index, 1)
      ids.splice(targetIndex, 0, trackId)
      return ids
    })
  }

  const removeFromQueue = (trackId: string) => {
    const wasCurrentlyPlaying = trackId === track.id
    const currentIndex = queue.indexOf(trackId)
    const nextQueue = queue.filter(id => id !== trackId)
    setQueue(nextQueue)
    if (wasCurrentlyPlaying) {
      if (nextQueue.length === 0) { setPlaying(false); return }
      const nextIndex = currentIndex % nextQueue.length
      const next = allSearchTracks.find(item => item.id === nextQueue[nextIndex])
      if (next) selectTrack(next)
    }
  }

  const handleTimeUpdate = (event: SyntheticEvent<HTMLAudioElement>) => setCurrentTime(event.currentTarget.currentTime)
  const handleLoadedMetadata = (event: SyntheticEvent<HTMLAudioElement>) => {
    setDuration(event.currentTarget.duration)
    if (resumeTimeRef.current !== null) {
      event.currentTarget.currentTime = resumeTimeRef.current
      setCurrentTime(resumeTimeRef.current)
      resumeTimeRef.current = null
    }
  }
  const handleEnded = () => {
    if (repeatOne) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => setPlaying(false))
      }
      return
    }
    return autoplay ? playNextTrack() : setPlaying(false)
  }

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
    shuffled,
    toggleShuffle,
    repeatOne,
    toggleRepeatOne,
    track,
    queue,
    queueSourceLabel,
    playing,
    playerOpen,
    playerClosing,
    miniPlayerVisible,
    setPlaying,
    setPlayerOpen,
    setCurrentTime,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    playQueue,
    playNextTrack,
    playPrevTrack,
    moveQueueTrack,
    removeFromQueue,
    minimizePlayer,
    formatTime,
  }
}
