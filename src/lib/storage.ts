import type { DiaryEntry, Playlist, Track } from '../types'

export const PLAYLIST_STORAGE_KEY = 'music-diary-playlists'
export const PLAYLIST_SONGS_STORAGE_KEY = 'music-diary-playlist-songs'
export const DIARY_STORAGE_KEY = 'music-diary-entries'
export const PLAYLIST_STORAGE_KEY_V2 = 'music-diary-playlists-v2'
export const DIARY_STORAGE_KEY_V2 = 'music-diary-entries-v2'
export const TRACKS_STORAGE_KEY = 'music-diary-all-tracks'
const AUDIO_DB_NAME = 'music-diary-audio'
const AUDIO_STORE_NAME = 'tracks'
const COVER_STORE_NAME = 'covers'

function openAudioDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) db.createObjectStore(AUDIO_STORE_NAME)
      if (!db.objectStoreNames.contains(COVER_STORE_NAME)) db.createObjectStore(COVER_STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveTrackAudio(id: string, file: Blob) {
  const database = await openAudioDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(AUDIO_STORE_NAME, 'readwrite').objectStore(AUDIO_STORE_NAME).put(file, id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  database.close()
}

export async function loadTrackAudio(id: string) {
  const database = await openAudioDatabase()
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(AUDIO_STORE_NAME, 'readonly').objectStore(AUDIO_STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return file
}

export async function saveTrackCover(id: string, blob: Blob) {
  const database = await openAudioDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(COVER_STORE_NAME, 'readwrite').objectStore(COVER_STORE_NAME).put(blob, id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  database.close()
}

export async function loadTrackCover(id: string) {
  const database = await openAudioDatabase()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(COVER_STORE_NAME, 'readonly').objectStore(COVER_STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return blob
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const isPlaylist = (value: unknown): value is Playlist => isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.trackIds) && value.trackIds.every(item => typeof item === 'string')

export const isTrack = (value: unknown): value is Track => isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.artist === 'string' && (value.coverUrl === undefined || typeof value.coverUrl === 'string') && (value.audioUrl === undefined || typeof value.audioUrl === 'string')

export const isDiaryEntry = (value: unknown): value is DiaryEntry => isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string' && typeof value.mood === 'string' && typeof value.text === 'string' && isTrack(value.track)

export function loadTracks(): Track[] {
  try {
    const saved = localStorage.getItem(TRACKS_STORAGE_KEY)
    return saved ? JSON.parse(saved) as Track[] : []
  } catch {
    return []
  }
}

export function saveTracks(tracks: Track[]) {
  const cleanTracks = tracks.map(item => {
    const cleanTrack = { ...item }
    delete cleanTrack.audioUrl
    if (cleanTrack.coverUrl?.startsWith('blob:')) delete cleanTrack.coverUrl
    return cleanTrack
  })
  localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(cleanTracks))
}

export function loadPlaylists(): Playlist[] {
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

export function savePlaylists(playlists: Playlist[]) {
  localStorage.setItem(PLAYLIST_STORAGE_KEY_V2, JSON.stringify(playlists))
}

export function loadDiaryEntries(): DiaryEntry[] {
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

export function saveDiaryEntries(diaryEntries: DiaryEntry[]) {
  const cleanEntries = diaryEntries.map(entry => {
    const cleanTrack = { ...entry.track }
    delete cleanTrack.audioUrl
    return { ...entry, track: cleanTrack }
  })
  localStorage.setItem(DIARY_STORAGE_KEY_V2, JSON.stringify(cleanEntries))
}
