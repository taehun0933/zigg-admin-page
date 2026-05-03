// app/notice/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";

import {
  createBannerOnlyNotice,
  createCommonNotice,
  type NoticeLayout,
} from "@/apis/notice";

import {
  getVideoDurationSec,
  getFileExtension,
  formatHms,
} from "@/utils/media";
import {
  getUrlForUploadImage,
  putImageToPresignedUrl,
  requestImagePresignedUrl,
  requestVideoPresignedUrl,
} from "@/apis/media";
import { putFileToPresignedUrl } from "@/apis/board";

// ⬇️ 상단 import들 아래 아무 곳에 추가
const BANNER_ASPECT = 9 / 5.16; // 권장 비율
const BANNER_MIN_WIDTH = 1500; // 권장 최소 가로(px)
const BANNER_MIME = "image/jpeg"; // 저장 포맷
const BANNER_QUALITY = 0.92; // JPEG 품질
// 기존 상수는 그대로 두고, 배경색만 추가(원하면 투명 PNG도 가능)
const BANNER_BACKGROUND = "#ffffff"; // 레터박스 배경(흰색)

// 권장 비율과 거의 같은지 허용 오차
const ASPECT_EPS = 0.01;

function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
// 1234×567 같은 실제 픽셀에서 간단한 "xx:yy" 문자열 만들기
function toRatioString(w: number, h: number): string {
  const g = gcd(w, h);
  return `${Math.round(w / g)}:${Math.round(h / g)}`;
}

// 목표 비율로 센터크롭 (cover) — 비율이 안 맞는 만큼 가장자리 잘림
async function fitAndCropToAspect(
  file: File,
  targetAspect: number,
  minWidth: number,
  mime: string = BANNER_MIME, // "image/jpeg"
  quality: number = BANNER_QUALITY // 0.92
): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });

    const sw = img.naturalWidth;
    const sh = img.naturalHeight;

    // 출력 캔버스는 항상 targetAspect 유지
    const outW = Math.max(minWidth, sw); // 최소 가로 보장
    const outH = Math.round(outW / targetAspect);

    // 캔버스를 꽉 채우는 cover 스케일 (비율이 안 맞는 만큼 가장자리 잘림)
    const scale = Math.max(outW / sw, outH / sh);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    // 중앙 배치
    ctx.drawImage(img, dx, dy, dw, dh);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), mime, quality)
    );

    const base = file.name.replace(/\.[^/.]+$/, "");
    const outName = `${base}_cropped.${mime === "image/png" ? "png" : "jpg"}`;
    return new File([blob], outName, { type: mime });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function normalizeBannerImage(file: File) {
  return fitAndCropToAspect(file, BANNER_ASPECT, BANNER_MIN_WIDTH);
}

async function cropAndResizeToAspect(
  file: File,
  targetAspect: number,
  minWidth: number
): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });

    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const r = sw / sh;

    // 중앙 크롭 영역 계산
    let sx = 0,
      sy = 0,
      sWidth = sw,
      sHeight = sh;
    if (r > targetAspect) {
      // 너무 가로로 넓음 → 좌우를 잘라냄
      sWidth = Math.round(sh * targetAspect);
      sx = Math.round((sw - sWidth) / 2);
    } else if (r < targetAspect) {
      // 너무 세로로 김 → 위아래를 잘라냄
      sHeight = Math.round(sw / targetAspect);
      sy = Math.round((sh - sHeight) / 2);
    }

    // 출력 크기 결정(작으면 살짝 업스케일 허용)
    const outW = Math.max(minWidth, sWidth);
    const outH = Math.round(outW / targetAspect);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outW, outH);

    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), BANNER_MIME, BANNER_QUALITY)
    );

    // 원본 이름 기반 새 파일명
    const base = file.name.replace(/\.[^/.]+$/, "");
    const outName = `${base}_normalized.jpg`;
    return new File([blob], outName, { type: BANNER_MIME });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** presigned URL → S3 key 추출 (쿼리 앞까지만) */
function extractS3Key(url: string) {
  try {
    const u = new URL(url);
    // 경로의 선두 "/" 제거, 쿼리 제외
    return u.pathname.replace(/^\/+/, "");
  } catch {
    // 혹시 이미 key면 그대로
    return url.split("?")[0].replace(/^\/+/, "");
  }
}

export default function NoticeCreatePage() {
  // 상단 상태 영역에 추가
  const [bannerFit, setBannerFit] = useState<"cover" | "contain">("cover");

  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const [bannerNotice, setBannerNotice] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  // ✅ files → previews 파생
  const previews = useMemo(() => {
    return files.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
    }));
  }, [files]);

  // 공통 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [layout, setLayout] = useState<NoticeLayout>("BANNER_ONLY"); // 기본 배너형
  const [priority, setPriority] = useState<number>(10);
  const [onClickUrl, setOnClickUrl] = useState<string>("");

  // COMMON 전용
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // 업로드 파일 상태
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoThumbFile, setVideoThumbFile] = useState<File | null>(null);

  // 로그인 가드
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };
  const MAX_FILES = 5;

  const navItems = navigationItems(router, handleLogout);

  // ✅ 미리보기 1개 삭제
  const removeFileAt = (idx: number) => {
    // 현재 프리뷰 URL을 먼저 확보해서 revoke
    const targetPreview = previews[idx];
    if (targetPreview?.url) {
      URL.revokeObjectURL(targetPreview.url);
    }
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    const remaining = Math.max(0, MAX_FILES - files.length);
    const take = incoming.slice(0, remaining);

    if (incoming.length > remaining) {
      alert(`사진/영상은 최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`);
    }

    setFiles((prev) => [...prev, ...take]);

    // 같은 파일을 연속으로 선택해도 onChange가 다시 트리거되게
    e.target.value = "";
  };
  // 미리보기
  const bannerPreview = useMemo(
    () => (bannerImageFile ? URL.createObjectURL(bannerImageFile) : null),
    [bannerImageFile]
  );
  const imagePreviews = useMemo(
    () => imageFiles.map((f) => URL.createObjectURL(f)),
    [imageFiles]
  );
  const videoPreview = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );
  const videoThumbPreview = useMemo(
    () => (videoThumbFile ? URL.createObjectURL(videoThumbFile) : null),
    [videoThumbFile]
  );

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      imagePreviews.forEach((u) => URL.revokeObjectURL(u));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (videoThumbPreview) URL.revokeObjectURL(videoThumbPreview);
    };
  }, [bannerPreview, imagePreviews, videoPreview, videoThumbPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bannerImageFile && layout === "BANNER_ONLY") {
      alert("배너 이미지를 선택해주세요.");
      return;
    }

    if (layout === "COMMON" && (!title.trim() || !textContent.trim())) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let bannerUrl: string = "";
      let bannerContentId: any;
      let noticeVideoContentId: any;
      if (bannerImageFile) {
        const { url, contentId } = await requestImagePresignedUrl(
          bannerImageFile,
          "NOTICE_BANNER"
        );


        await putFileToPresignedUrl(url, bannerImageFile);
        bannerUrl = url;
        bannerContentId = contentId;
      }

      // 1) 배너 이미지 업로드(선택됨)
      if (layout === "BANNER_ONLY") {
        await createBannerOnlyNotice({
          layout: "BANNER_ONLY",
          priority: priority,
          bannerImageContent: bannerContentId,
        });
      } else if (layout === "COMMON") {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        const videoFiles = files.filter((f) => f.type.startsWith("video/"));

        // 1) 이미지: presigned URL 발급 → PUT 업로드 → url 수집
        const imageUrls: string[] = [];
        const imageIds: number[] = [];

        for (const img of imageFiles) {
          const { url, contentId } = await requestImagePresignedUrl(
            img,
            "NOTICE_IMAGE"
          );
          await putFileToPresignedUrl(url, img);
          imageUrls.push(url); // 최종 게시글 본문에 그대로 사용(요구사항대로)
          imageIds.push(contentId);
        }

        // 2) 비디오: presigned URL 발급 → PUT 업로드
        let videoUrl: string | undefined;
        let videoDuration: string | undefined;
        if (videoFiles[0]) {
          const v = videoFiles[0];

          // 길이(초) 계산
          const sec = await getVideoDurationSec(v);

          // 확장자 대문자
          const ext = getFileExtension(v);

          // presigned 발급 + 업로드
          const { url, contentId } = await requestVideoPresignedUrl(
            { videoDuration: String(sec), videoExtension: ext },
            "NOTICE_VIDEO"
          );
          noticeVideoContentId = contentId;
          await putFileToPresignedUrl(url, v);

          videoUrl = url;
          videoDuration = formatHms(sec); // "HH:mm:ss"
        }

        await createCommonNotice({
          layout: "COMMON",
          title: title,
          textContent: textContent,
          bannerImageContent: bannerContentId,
          noticeImageContent: imageIds,
          noticeVideoContent: noticeVideoContentId,
        });
      }

      router.push("/notice");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "공지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation items={navItems} />
      <main className="max-w-4xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">새 공지 만들기</h1>
          </div>

          {/* 레이아웃 선택 */}
          <div className="flex items-center gap-4">
            <label className="font-medium">레이아웃</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as NoticeLayout)}
              className="border rounded-md px-3 py-2"
            >
              <option value="BANNER_ONLY">BANNER_ONLY (배너형)</option>
              <option value="COMMON">COMMON (텍스트/이미지/영상)</option>
            </select>

            <label className="font-medium ml-6">
              노출 우선순위(높을수록 우선입니다)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-24 border rounded-md px-3 py-2"
            />
          </div>

          {/* 공통: 배너 이미지 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">배너 이미지</label>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="hidden sm:inline">
                  권장: 1500×(1500÷1.744≈)860px 이상 · 9:5.16 비율 · JPG/PNG
                </span>
                {bannerImageFile && (
                  <>
                    <span className="truncate max-w-[180px] sm:max-w-[280px]">
                      {bannerImageFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBannerImageFile(null)}
                      className="px-2 py-1 rounded-md ring-1 ring-gray-300 hover:bg-gray-50"
                    >
                      제거
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 업로드 버튼 + 숨김 input */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="bannerUpload"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md ring-1 ring-gray-300 hover:bg-gray-50 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19 15v4H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4zM11 7.83V17h2V7.83l3.59 3.58L18 10l-6-6l-6 6l1.41 1.41z"
                  />
                </svg>
                이미지 선택
              </label>
              <input
                id="bannerUpload"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const raw = e.target.files?.[0] ?? null;
                  setBannerNotice(""); // 이전 메시지 초기화
                  if (!raw) {
                    setBannerImageFile(null);
                    return;
                  }

                  // 1) 원본 비율 측정
                  const tmpUrl = URL.createObjectURL(raw);
                  try {
                    const img = await new Promise<HTMLImageElement>(
                      (res, rej) => {
                        const i = new Image();
                        i.onload = () => res(i);
                        i.onerror = rej;
                        i.src = tmpUrl;
                      }
                    );
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    const currentAspect = w / h;
                    const currentRatioStr = toRatioString(w, h);

                    // 2) 권장 비율과 다르면 안내 메시지
                    if (Math.abs(currentAspect - BANNER_ASPECT) > ASPECT_EPS) {
                      setBannerNotice(
                        `현재 이미지 비율은 ${currentRatioStr} (≈ ${currentAspect.toFixed(
                          3
                        )}) 입니다. ` +
                          `권장 9:5.16(≈ ${BANNER_ASPECT.toFixed(
                            3
                          )}) 비율에 맞춰 자동 조정되어 업로드됩니다.`
                      );
                    } else {
                      setBannerNotice(`권장 비율(9:5.16)과 거의 동일합니다.`);
                    }
                  } finally {
                    URL.revokeObjectURL(tmpUrl);
                  }

                  // 3) 보정(패딩 또는 크롭) 수행 후 상태 반영
                  const fixed = await normalizeBannerImage(raw); // 9:5.16 비율로 센터크롭
                  setBannerImageFile(fixed);
                }}
                className="sr-only"
              />
            </div>

            {bannerNotice && (
              <div
                role="status"
                className="mt-2 text-xs sm:text-sm rounded-md px-3 py-2 bg-blue-50 text-blue-700 ring-1 ring-blue-200"
              >
                {bannerNotice}
              </div>
            )}
            {/* 미리보기: 가로 배너 비율 유지 */}
            <div className="aspect-[900/516] w-full overflow-hidden rounded-xl ring-1 ring-gray-200 bg-gradient-to-b from-gray-50 to-white">
              {bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="banner"
                  className={`w-full h-full ${
                    bannerFit === "cover" ? "object-cover" : "object-contain"
                  } bg-white`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  배너 이미지를 선택하세요
                </div>
              )}
            </div>

            {/* 클릭 URL */}
          </div>

          {/* COMMON 전용 필드 */}
          {layout === "COMMON" && (
            <>
              <div>
                <label className="block text-sm font-medium">제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="공지 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">본문</label>
                <textarea
                  rows={8}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="공지 내용을 입력하세요"
                />
              </div>

              {/* 파일 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 및 영상 업로드
                </label>

                {/* 숨겨진 실제 input */}
                <input
                  id="fileUpload"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* 커스텀 버튼 */}
                <label
                  htmlFor="fileUpload"
                  className="inline-block px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md cursor-pointer hover:bg-blue-600"
                >
                  📁 사진/영상 올리기 (최대 5개)
                </label>

                {/* 선택된 파일 미리보기 */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {previews.map((p, idx) => (
                    <div
                      key={p.url}
                      className="relative w-full h-32 overflow-hidden rounded-md border border-gray-200"
                    >
                      {/* 미리보기 본체 */}
                      {p.isVideo ? (
                        <video
                          src={p.url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={p.url}
                          alt={`uploaded-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* 삭제 버튼 (오버레이) */}
                      <button
                        type="button"
                        aria-label="삭제"
                        title="삭제"
                        onClick={() => removeFileAt(idx)}
                        className="absolute top-1 right-1 inline-flex items-center justify-center
                              h-6 w-6 rounded-full bg-black/60 text-white text-sm
                              hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-6 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isSubmitting ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/notice")}
              className="px-6 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
