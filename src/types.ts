export type Track = {
  id: string
  title: string
  artist: string
  coverUrl?: string
  audioUrl?: string
}

export type Playlist = { id: string; name: string; trackIds: string[] }
export type DiaryEntry = { id: string; date: string; mood: string; text: string; track: Track }
export type Mood = { name: string; start: string; middle: string; end: string; chip: string }
