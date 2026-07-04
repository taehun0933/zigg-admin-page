import React from "react";
import { cdnImage, cdnImgError } from "@/utils/cdnImage";

interface UserAvatarProps {
  /** 백엔드가 내려준 콘텐츠 CloudFront 프로필 이미지 URL */
  url: string | null | undefined;
  /** 원형 지름(px). 기본 32 */
  size?: number;
  alt?: string;
}

/**
 * admin 공통 유저 프로필 아바타 (작은 원형 뷰).
 *
 * - 이미지는 리사이즈 CDN(`cdnImage`)으로 최적화(webp/폭 지정)해서 로드한다.
 * - 리사이즈 CDN 이 실패(502/미변환 등)하면 `cdnImgError` 가 원본 CloudFront URL 로
 *   1회 fallback 한다. → CloudFront 조회가 안 돼도 원본 이미지는 뜨게 한다.
 * - url 이 없으면 회색 원 + "?" placeholder.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ url, size = 32, alt = "" }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: url ? "transparent" : "#e8e8ee",
      overflow: "hidden",
      display: "grid",
      placeItems: "center",
      fontSize: Math.max(10, Math.round(size * 0.4)),
      color: "var(--admin-ink-2)",
      flexShrink: 0,
    }}
  >
    {url ? (
      <img
        src={cdnImage(url, { width: size * 2 })}
        onError={cdnImgError(url)}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      "?"
    )}
  </div>
);

export default UserAvatar;
