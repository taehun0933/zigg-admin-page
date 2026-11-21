This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI 운영 도우미

관리자 메뉴의 **AI 운영 도우미** (`/ai-assistant`)에서 환경별로 질문하고
조사 결과와 대화 이력을 확인합니다. Next.js 서버는 브라우저의 ZIGG 로그인
`Authorization` 토큰을 그대로 NanoClaw에 전달하는 프록시입니다. 관리자 권한을
어드민 서버에서 검증하거나 JWT 내용을 해석하지 않습니다. NanoClaw가 매 작업
생성·목록·상세 조회 요청마다 해당 환경의 ZIGG `GET /admin/v0/auth/me`를 호출해
JWT와 DB의 현재 ADMIN 권한을 검증합니다.
브라우저가 보낸 사용자 식별자나 NanoClaw 대상 URL은 사용하지 않습니다.

Vercel 또는 Next.js 서버에 아래 **서버 전용** 환경변수를 등록하고 다시 배포합니다.

```dotenv
NANOCLAW_ADMIN_API_URL=https://<nanoclaw-internal-proxy-host>
```

`NANOCLAW_ADMIN_API_URL`에는 `/jobs`를 붙이지 않습니다. 로컬 개발에서만
`http://127.0.0.1:3180` 같은 loopback HTTP 주소를 허용합니다. 원격 서버는
HTTPS 역방향 프록시를 사용하고 어드민 서버만 접근하도록 제한하세요.
NanoClaw는 전달받은 ZIGG 관리자 토큰을 직접 검증합니다. 별도의 어드민↔NanoClaw
공유 토큰은 사용하지 않습니다.
ZIGG 토큰을 URL·프롬프트·로그에 기록하지 마세요. 서버 전환 시 기존처럼
대상 환경에 다시 로그인합니다. 어드민 프록시는 NanoClaw가 반환한 401/403을
안전한 오류 메시지로 전달합니다.

NanoClaw 쪽은 `nanoclaw-zigg/docs/zigg-admin-ai.md`를 따라 Dev/Prod 전용 그룹과
읽기 전용 조회 도구를 연결합니다. DB·AWS 원본 자격증명은 도구 서버에서
관리합니다. 웹 화면만 배포해도 DB·로그 접근이 자동으로 준비되지는 않습니다.
미연결 상태에서는 연결 오류가 표시됩니다. 새 ZIGG 관리자 인증 API를 배포한 뒤
NanoClaw를 연결해야 하며, 인증 API 장애·응답 형식 오류 시 NanoClaw는 접근을
차단합니다. 기존 계정 발급 정책, 토큰 만료·회수, 에이전트 네트워크·메모리
격리는 별도 보강이 필요합니다. 이 경계들과 배포 설정을 검증하기 전에는
운영 DB를 연결하지 마세요.

질문은 비동기 작업으로 접수되므로 페이지를 나가도 서버에 이력이 남습니다.
현재 구현은 2초 간격 상태 조회와 최종 답변이며 토큰 스트리밍은 아닙니다.
작업과 이력은 NanoClaw에서 계정/환경별로 분리하고, 응답은 캐시하지 않습니다.
민감한 조사 결과는 브라우저 localStorage에 저장하지 않습니다.

검증:

```bash
npm run test:ai  # 프록시 테스트 10개
npx tsc --noEmit --incremental false
npm run build
```
