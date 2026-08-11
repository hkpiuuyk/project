# Music Diary

Mobile web music app built with React 19 + TypeScript + Vite 8 + oxlint; state uses `useState` + `localStorage` only (no Redux, Zustand, or Context, deliberately).

## Folder structure

- `src/App.tsx` - navigation, cross-screen state, and all persisted data; passes state down to screens as props
- `src/main.tsx` - app entry point
- `src/index.css` - global root/body defaults and Paperlogy font declarations
- `src/types.ts`, `src/data.ts`
- `src/hooks/usePersistentState.ts`, `src/hooks/usePlayer.ts`
- `src/lib/audioMetadata.ts`, `src/lib/storage.ts`
- `src/components/TrackRow.tsx`
- `src/components/Player.tsx` + `src/components/Player.css`
- `src/components/DiaryCard.tsx` + `src/components/DiaryCard.css`
- `src/components/LibrarySheets.tsx` + `src/components/LibrarySheets.css`
- `src/screens/HomeScreen.tsx` + `src/screens/HomeScreen.css`
- `src/screens/LibraryScreen.tsx` + `src/screens/LibraryScreen.css`
- `src/screens/SearchScreen.tsx` + `src/screens/SearchScreen.css`
- `src/screens/DiaryScreen.tsx` + `src/screens/DiaryScreen.css`
- `src/screens/MyScreen.tsx` + `src/screens/MyScreen.css`
- `src/styles/shared.css` — cross-cutting primitives (`.track-row`, `.artwork`, `.create-overlay`/`.create-sheet`, etc.)
- `src/App.css` — shell only: `@property` mood registrations, resets, orb keyframes
- `src/assets/` — Figma SVG icons, fonts (self-hosted Paperlogy WOFF2), images

State ownership convention: `App.tsx` owns navigation/tab state, cross-screen state (`mood`, `activePlaylistId`, `diaryWriting`, `myScreen`), and all persisted app data (tracks, playlists, diary entries), which it passes down to screens as props. Each screen owns only its private local UI state (form inputs, filters, sheet-open booleans). `usePlayer` owns track, queue, playing, time, and the audio element. Do not drill state more than one level unless it is genuinely shared.

## Required process for every nontrivial change

### 1. Plan

Before writing code, state in 2–4 sentences what you are about to change and why, and name the files you expect to touch. If the change would touch more than about three files or add a dependency, stop and describe the plan before executing, then wait for explicit human go-ahead before continuing.

### 2. Execute

Make the smallest change that solves the actual problem. Match existing patterns in the file being edited (naming, CSS selector style, hook usage) instead of introducing a new pattern for one call site. Do not refactor or "clean up" code you were not asked to touch.

### 3. Review before calling it done

Run `npm run build` and `npm run lint`, and confirm both are clean, not merely that there are no new errors. For changes touching localStorage, uploads, playback, or playlists: manually reload the page after your change and confirm data survives - build and lint do not catch this class of bug. Read your own `git diff` once, end to end, before considering the task finished. State what you changed and why in 1-3 sentences; do not just report "done."

## Hard rules

- Never weaken compiler or lint configuration to make an error go away. Do not loosen `tsconfig` strictness, add permissive index signatures, or wrap unused values in `void`. If the compiler flags something, fix the actual code path, not the settings; a weakened check can make a real bug invisible to CI.
- Never delete or silently drop working functionality while resolving a merge conflict. If a conflict touches a feature, such as image rendering, a computed value, or an event handler, verify the resolved code still does what both sides intended. Do not simply pick one side and move on.
- Data already persisted in `localStorage` must be migrated forward, not abandoned. Never fix a data-shape bug by switching to a new storage key while leaving old user data unread; write a migration that reads the old shape and converts it.
- Leave no dead code paths and no duplicate implementations of the same function "just in case." Delete the implementation that is not used.
- Do not suppress a TypeScript or lint error with a broad escape hatch such as `any`, `@ts-ignore`, or a file-wide rule disable when a narrow real fix exists. A narrowly scoped, commented suppression is acceptable only for a genuinely external constraint, such as a third-party type gap, never for app code. As of this writing, `usePersistentState.ts` disables `react-hooks/exhaustive-deps` around its persistence effect without an explaining comment - treat this as a known gap, not a template to copy elsewhere; any new suppression needs its own justification comment.

The agent going green (build passed, no errors shown) is not the same as the change being correct; a human or second reviewing pass should inspect the diff before it is considered finished.
