import homeIcon from './assets/figma/home.svg'
import libraryIcon from './assets/figma/library.svg'
import searchIcon from './assets/figma/search.svg'
import diaryIcon from './assets/figma/diary.svg'
import userIcon from './assets/figma/user.svg'

import type { Mood } from './types'

export const moods: Mood[] = [
  { name: '차분함', start: '#e0fbf5', middle: '#86ead4', end: '#5bcfb3', chip: '#4fbfa0' },
  { name: '설렘', start: '#fff0f6', middle: '#f6a3c0', end: '#ec5f8c', chip: '#df3f76' },
  { name: '위로', start: '#fff4d1', middle: '#ffd56d', end: '#ffc53d', chip: '#e2a914' },
  { name: '집중', start: '#dff2ff', middle: '#70befb', end: '#0090ff', chip: '#057ed8' },
  { name: '그리움', start: '#e8e8ff', middle: '#9292e4', end: '#5b5bd6', chip: '#4b4bbc' },
]

export const tabs = [
  ['홈', homeIcon], ['라이브러리', libraryIcon], ['탐색', searchIcon], ['일기', diaryIcon], ['마이', userIcon],
]
