/**
 * 콘텐츠 CloudFront 이미지 URL → 이미지 리사이즈 최적화 CDN URL 변환.
 *
 * 백엔드는 이미지 URL 을 콘텐츠 CloudFront(`cdn.base.url`) 로 내려준다.
 * 리사이즈 CDN 은 같은 origin 버킷을 읽으므로, host 만 바꾸고
 * `?width=&format=auto` 를 붙이면 리사이즈/webp 변환된 이미지를 받는다.
 * host 를 못 알아보면 원본 URL 을 그대로 반환한다(안전한 fallback).
 *
 * admin 은 ServerSwitch 로 dev/prod 를 런타임 전환하므로 빌드 환경이 아니라
 * imageKey 에 박힌 host 를 기준으로 매핑한다. 로컬 콘텐츠 host 는 dev 로 매핑.
 */

import type { SyntheticEvent } from "react";

const DEV_RESIZE =
  process.env.NEXT_PUBLIC_IMG_RESIZE_CDN_DEV ?? "https://d1czedzmq6m24y.cloudfront.net";
const PROD_RESIZE =
  process.env.NEXT_PUBLIC_IMG_RESIZE_CDN_PROD ?? "https://d3q8ptk7wwo0j2.cloudfront.net";

// 콘텐츠 CloudFront host → 리사이즈 CDN base URL
const HOST_TO_RESIZE: Record<string, string> = {
  "dbq2jscl51hav.cloudfront.net": DEV_RESIZE, // dev
  "d1svuj017xiqiw.cloudfront.net": PROD_RESIZE, // prod
  "d2kaw972kdix6y.cloudfront.net": DEV_RESIZE, // local → dev
};

export interface CdnImageOptions {
  /** 리사이즈 목표 폭(px). 표시 폭의 약 2배(retina) 권장. */
  width?: number;
  /** 리사이즈 목표 높이(px, 선택). */
  height?: number;
  /** 출력 포맷. 기본 "auto"(webp/avif 자동 협상). */
  format?: string;
}

/**
 * @example cdnImage(applicant.images[0].imageKey, { width: 400 })
 */
export function cdnImage(
  url: string | null | undefined,
  { width, height, format = "auto" }: CdnImageOptions = {}
): string {
  if (!url) return url ?? "";

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url; // 상대경로/잘못된 URL 은 그대로
  }

  const resizeBase = HOST_TO_RESIZE[u.hostname];
  if (!resizeBase) return url; // 알 수 없는 host → 원본 유지

  const out = new URL(u.pathname, resizeBase);
  if (width) out.searchParams.set("width", String(width));
  if (height) out.searchParams.set("height", String(height));
  if (format) out.searchParams.set("format", format);
  return out.toString();
}

/**
 * <img onError> 핸들러. 리사이즈 CDN 이 실패(502/미변환 등)하면 원본 콘텐츠 CDN
 * URL 로 1회 되돌린다. 리사이즈 CDN 을 못 읽어도 원본 이미지는 뜨게 하는 안전장치.
 * (원본까지 실패하면 loop 방지 위해 그대로 둠 → 깨진 이미지)
 *
 * @example onError={cdnImgError(applicant.images[0].imageKey)}
 */
export function cdnImgError(originalUrl: string | null | undefined) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!originalUrl || img.dataset.fellBack === "1") return;
    img.dataset.fellBack = "1";
    img.src = originalUrl;
  };
}
