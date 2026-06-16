import { NextRequest, NextResponse } from "next/server";

/**
 * 이미지 프록시 (same-origin)
 * 원격(CloudFront) 이미지를 서버에서 받아 같은 출처로 돌려준다.
 * 브라우저 canvas 가 오염(taint)되지 않아 색 추출/내보내기가 가능해진다.
 * SSRF 방지를 위해 ZIGG CloudFront 호스트만 허용.
 */

const ALLOWED_HOSTS = new Set([
  "dbq2jscl51hav.cloudfront.net", // dev
  "d2kaw972kdix6y.cloudfront.net", // local
  "d1svuj017xiqiw.cloudfront.net", // prod
]);

function isAllowed(u: URL): boolean {
  if (u.protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(u.hostname) || u.hostname.endsWith(".cloudfront.net");
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return new NextResponse("missing url", { status: 400 });

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return new NextResponse("invalid url", { status: 400 });
  }
  if (!isAllowed(u)) return new NextResponse("forbidden host", { status: 403 });

  try {
    const upstream = await fetch(u.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return new NextResponse(`upstream ${upstream.status}`, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("image-proxy error", e);
    return new NextResponse("proxy error", { status: 502 });
  }
}
