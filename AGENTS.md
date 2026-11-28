# zigg-admin-page — AI 작업 가이드

> Claude·Codex·Cursor 등 이 레포를 수정하는 모든 AI 가 자동으로 읽는 규칙이다 (`CLAUDE.md` 는 이 파일을 import).
> 사람이 매번 "폰에서 깨져요" "디자인 달라요" 라고 지적하지 않아도 되도록, 아래를 **수정할 때마다 스스로 지킨다.**

Next.js 15 (App Router) + 인라인 스타일/CSS Module. 배포 = `main` → Vercel. 화면은 관리자(ADMIN)·강사(TRAINER) 두 역할이 함께 쓴다.

## 1. 반응형 — 화면을 늘이고 줄여도 깨지면 안 된다 (필수)

모든 화면 수정은 **390px(폰) · 768px(태블릿) · 1440px(데스크탑)** 세 폭에서 깨지지 않아야 끝난 것이다.

- 브레이크포인트는 기존 값만 쓴다: `1024px` / `820px`(모바일 분기 기준) / `540px` / 로그인 화면 `520px`·`360px`.
- JS 분기가 필요하면 `useIsMobile()` (`src/components/admin/useIsMobile.ts`, 기본 820px). 새 훅·새 기준값 만들지 말 것.
- 레이아웃은 `src/app/globals.css` 의 유틸 클래스를 재사용한다:
  - `zg-split`, `zg-split-2-1` — 2단 → 820px 이하 1단
  - `zg-grid-3/4/5` — 카드·지표 그리드 단계적 축소
  - `zg-table-scroll` + `zg-table-inner` — 넓은 표는 가로 스크롤 (페이지 전체가 가로로 밀리면 안 됨)
  - `zg-modal-card` — 모달이 화면 밖으로 안 넘치게
- 금지: 고정 `width: 600px` 같은 px 고정폭(→ `width: 100%` + `maxWidth`), `100vw` 로 가로 넘침, 한 줄에 버튼 여러 개 고정 배치(→ `flexWrap: "wrap"`), 텍스트 줄바꿈 막기(`whiteSpace: nowrap`) 남발.
- 입력창 글자 크기는 모바일에서 **16px 이상** (iOS 자동 확대 방지).
- 페이지에 **가로 스크롤이 생기면 버그**다. 확인: 개발자도구 콘솔 `document.documentElement.scrollWidth > innerWidth` 가 `false` 여야 함.
- 헤드리스 크롬 스크린샷은 창 최소폭(~500px) 때문에 폰 폭이 제대로 안 나온다 → iframe(width=390)이나 DevTools 기기 모드로 확인.

## 2. 디자인 톤

- 관리 화면: `globals.css` 의 `--admin-*` 토큰(색·테두리·사이드바·탑바)만 사용. 하드코딩 색 금지. 공용 틀은 `AdminShell` / `PageShell`.
- 로그인 화면: 랜딩페이지(`achoom-zigg-landing-page`) 히어로 톤 — 사진벽 + 보라 그라데이션 + 글래스 카드. 반드시 `src/components/auth/AuthShell.tsx` + `auth.module.css` 를 재사용하고 새 로그인 화면을 따로 디자인하지 않는다.
- 아이콘은 기존 `AdminIcon`/SVG 사용. 텍스트 문자(`‹ ✓`)로 아이콘 그리지 말 것.

## 3. 로그인 구조 (바꾸지 말 것)

| 경로 | 대상 | 방식 |
|---|---|---|
| `/signin` | 강사 | 카카오·Apple 소셜 (Google 은 UI만, 백엔드 미연동). **TRAINER 권한만 통과** — 일반 유저·승인대기·반려·ADMIN 은 사유 안내 |
| `/signin/kakao` | 강사 | 카카오 인가코드 콜백 |
| `/admin-signin` | 관리자(+이메일 가입 강사) | 이메일·비밀번호 |

- 소셜 결과 분기는 `src/utils/oauthRouting.ts` 한 곳에서만. 토큰 저장은 `src/apis/login.ts` (TRAINER 만 `localStorage`, 미강사는 `sessionStorage.trainerApplyToken`).
- 로그인 안 된 접근: ADMIN 화면 → `/admin-signin`, TRAINER 화면 → `/signin` (`useAdminAuthGuard`).

## 4. 기타 규칙

- API 경로: `src/apis/*.ts` 의 path 에 `/admin/v0` 를 붙이지 않는다 (baseURL 에 이미 포함 → 404).
- 서버 전환은 `ServerToggle` (Dev/Prod). 새 스위치 만들지 말 것.
- 요청받은 범위만 고친다. 무관한 파일 포맷팅·리팩터링 금지.
- 끝내기 전: `npx tsc --noEmit` 통과 + 위 1번 세 폭 확인.
