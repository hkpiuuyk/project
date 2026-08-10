# 음악 일기 (Music Diary)

오늘의 기분을 고르면 어울리는 곡을 추천해주고, 플레이리스트로 모아 듣고, 들은 곡과 함께
하루를 기록하는 모바일 웹 음악 앱입니다. 팀 **Clova**의 프로젝트입니다.

## 주요 기능

- **홈**: 기분(차분함/설렘/위로/집중/그리움)을 고르면 배경이 그 기분 색으로 물들고,
  추천곡과 최근 재생 목록을 보여줍니다.
- **라이브러리**: 플레이리스트를 만들고 곡을 담고, 곡 순서를 드래그로 바꾸고, 삭제할 수
  있습니다.
- **탐색**: 곡 제목이나 아티스트로 검색합니다.
- **일기**: 오늘 들은 곡과 기분을 짧은 글로 남깁니다.
- **미니 플레이어 / 전체 플레이어**: 화면 하단에서 재생과 다음 곡을 조작하고, 위로
  스와이프하면 전체 화면으로 펼쳐집니다.

> 현재 재생은 UI 시뮬레이션입니다. 실제 오디오 재생(`<audio>`)은 아직 연결되어 있지
> 않습니다.

## 기술 스택

- React 19 + TypeScript
- Vite 8
- Oxlint
- 상태 관리는 `useState`와 `localStorage`만 사용합니다(별도 라이브러리 없음).

## 시작하기

```bash
npm install
npm run dev      # 개발 서버, http://localhost:5173
npm run build    # 프로덕션 빌드 (tsc -b && vite build)
npm run lint     # oxlint
npm run preview  # 빌드 결과 미리보기
```

## 알려진 이슈

- [#1 플레이리스트 이름 중복되면 곡 목록이 덮어써짐](https://github.com/hkpiuuyk/project/issues/1)
- [#2 플레이리스트 재생 버튼이 항상 같은 곡을 재생함](https://github.com/hkpiuuyk/project/issues/2)
