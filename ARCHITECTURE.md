# 기술 프로필 — 프다갤 벙 일정 캘린더

프리다이빙 갤러리(프다갤) 이용자들이 다이빙 모임(벙) 일정을 등록·조회·공유하는 모바일 웹앱.

## 프론트엔드

- React 19 + TypeScript, Vite 6 번들링, Tailwind CSS 4
- 서버는 Express(`server.ts`)가 Vite 미들웨어와 AI 이미지 분석(Gemini) API 라우트 하나만 담당 — 사실상 SPA
- PWA: `public/manifest.json` + `public/sw.js`(stale-while-revalidate 캐싱) + 설치 유도 배너(iOS는 beforeinstallprompt 미지원이라 "공유 → 홈 화면에 추가" 안내 alert로 대체)

## 데이터 저장 — Supabase (PostgreSQL)

- `schedules` / `schedule_attendees` 두 테이블을 사용. 이 스키마는 **여러 회사/앱이 같이 쓰는 공용 테이블**이라, 이 앱은 항상 `company = 'dcfdg'`로만 읽고 씀
- 참석자는 정규화된 별도 테이블(`schedule_attendees`)로 관리하고, 앱 내부적으로는 콤마 구분 문자열로 합쳐서 다룸 (`src/lib/authors.ts`)
- **인증 없음** — anon key로 클라이언트에서 Supabase REST를 직접 호출 (RLS로 최소 방어)
- 동시 편집 안전성을 위해 "이벤트 하나만 변경" 원칙으로 저장 로직 설계 — 일정 필드 수정 / 참석자 추가·삭제·이름변경을 각각 단일 행 단위로 분리해서, 한 세션의 낡은 스냅샷이 다른 세션의 변경을 덮어쓰지 않도록 함 (`src/lib/supabaseApi.ts`)

## 핵심 도메인 로직

- 위치(딥스/성남/파라/수원/자유일정), 시간(부 단위 또는 정시), 딥탱크 이용시간 등 다이빙 벙 특화 필드
- "작성자/리더"는 참석자 배열의 첫 번째 항목으로 판별 (`src/lib/authors.ts`)
- AI 스크린샷 인식(Gemini)으로 일정 일괄 등록 기능
- `src/lib/linkify.tsx`: 메모(설명) 속 URL을 자동으로 클릭 가능한 링크로 변환

## 알려진 제약

- 회사(`dcfdg`)에 스키마 변경 권한이 제한적(공용 테이블) — 작성자 식별 등에서 전용 컬럼 대신 관례(convention) 기반 설계를 채택함
- 로컬 개발 시 Vite HMR 웹소켓이 샌드박스 환경에서 자주 끊겨서, 서비스워커 캐시 때문에 변경사항이 안 보일 수 있음 → 앱 내 "강력 새로고침" 버튼으로 대응
