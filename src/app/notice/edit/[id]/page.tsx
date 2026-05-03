"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";

// --- API 가정 (이름이 다르면 notice.ts의 실 함수명으로 바꿔주세요) ---
import {
    getAdminNoticeDetail,
    updateAdminNotice,  
    type NoticeLayout,
    deleteAdminNotice
  } from "@/apis/notice";
import { requestImagePresignedUrl, requestVideoPresignedUrl } from "@/apis/media";
import { putFileToPresignedUrl } from "@/apis/board";
import { getVideoDurationSec, getFileExtension, formatHms } from "@/utils/media";

// 배너 규격
const BANNER_ASPECT = 9 / 5.16;
const BANNER_MIN_WIDTH = 1500;
const BANNER_MIME = "image/jpeg";
const BANNER_QUALITY = 0.92;
const BANNER_BACKGROUND = "#ffffff";
const ASPECT_EPS = 0.01;

function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function toRatioString(w: number, h: number): string {
  const g = gcd(w, h);
  return `${Math.round(w / g)}:${Math.round(h / g)}`;
}
async function fitAndCropToAspect(
  file: File,
  targetAspect: number,
  minWidth: number,
  mime: string = BANNER_MIME,
  quality: number = BANNER_QUALITY
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
    const outW = Math.max(minWidth, sw);
    const outH = Math.round(outW / targetAspect);

    // 캔버스를 꽉 채우는 cover 스케일 — 비율이 안 맞는 만큼 가장자리 잘림
    const scale = Math.max(outW / sw, outH / sh);
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
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

// =========================
// 메인 페이지
// =========================
export default function NoticeEditPage(){

  const router = useRouter();
  const { id: idParam } = useParams<{ id: string }>(); // ✅ 클라에서 이렇게 가져와야 함
  const id = Number(idParam);

  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerContentId, setBannerContentId] = useState<number | undefined>(undefined);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [layout, setLayout] = useState<NoticeLayout | null>(null);

  // 공통 값
  const [priority, setPriority] = useState<number>(10);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null); // 이미 저장된 배너 URL (이미 있으면 표시)
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null); // 새로 교체 업로드할 파일
  const bannerPreview = useMemo(
    () => (bannerImageFile ? URL.createObjectURL(bannerImageFile) : bannerUrl),
    [bannerImageFile, bannerUrl]
  );

  // COMMON 전용
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [files, setFiles] = useState<File[]>([]); // 이미지/비디오 신규 업로드
  const previews = useMemo(
    () =>
      files.map((f) => ({ url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") })),
    [files]
  );

  useEffect(() => setMounted(true), []);

  const navItems = navigationItems(router, () => {
    setIsLoggedIn(false);
    router.push("/signin");
  });

  // 가드
  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn) router.replace("/signin");
  }, [mounted, isLoggedIn, router]);

  // 상세 로드
  useEffect(() => {
    if (!mounted || !isLoggedIn) return;
    let alive = true;
    (async () => {
      try {
        setIsLoading(true);
        const detail = await getAdminNoticeDetail(id);
        if (!alive) return;

        setLayout(detail.layout);
        setPriority(detail.priority ?? 10);
        setBannerUrl(detail.banner?.imageKey ?? null);

        if (detail.layout === "COMMON") {
          setTitle(detail.title ?? "");
          setTextContent(detail.textContent ?? "");
        }
      } catch (e) {
        console.error(e);
        alert("공지 정보를 불러오지 못했습니다.");
        router.push("/notice");
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
      // revoke previews
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [mounted, isLoggedIn]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileInputRef.current?.click();

  // 공통 배너 업로드 핸들러
// 공통 배너 업로드 핸들러
const onPickBanner: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const inputEl = e.currentTarget;                 // ← 캐싱
    const raw = inputEl.files?.[0] ?? null;
    if (!raw) return;
  
    setIsUploadingBanner(true);
    try {
      // 1) 비율 보정
      const fixed = await normalizeBannerImage(raw);
  
      // 2) 미리보기(낙관적 UI)
      setBannerImageFile(fixed);
  
      // 3) presigned 발급 → 업로드
      const { url, contentId } = await requestImagePresignedUrl(fixed, "NOTICE_BANNER");
      await putFileToPresignedUrl(url, fixed);

      // 4) contentId 저장 (number로 그대로)
      setBannerContentId(Number(contentId));

    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "배너 이미지 업로드에 실패했습니다.");
      setBannerImageFile(null);
      setBannerContentId(undefined);
    } finally {
      setIsUploadingBanner(false);
      // 같은 파일 다시 선택 가능하도록 (input이 존재할 때만)
      if (inputEl) inputEl.value = "";
    }
  };
  
  

  // 저장 공통
// 저장 공통
  const onSave = async () => {
      try {
        
        const basePayload: any = {
          priority,
          // 사용자가 배너를 바꾸지 않았다면 undefined로 두어 서버가 기존 값 유지
          bannerImageContent: bannerContentId,
        };
    
        if (layout === "BANNER_ONLY") {
          await updateAdminNotice(id, {
            ...basePayload,
            layout: "BANNER_ONLY",
          });
        } else if (layout === "COMMON") {
          // (기존 이미지/비디오 업로드 로직은 그대로)
          const imageIds: string[] = [];
          let noticeVideoContent: any = undefined;
    
          const imageFiles = files.filter((f) => f.type.startsWith("image/"));
          const video = files.find((f) => f.type.startsWith("video/"));
    
          for (const img of imageFiles) {
            const { url, contentId } = await requestImagePresignedUrl(img, "NOTICE_IMAGE");
            await putFileToPresignedUrl(url, img);
            imageIds.push(String(contentId));
          }
    
          if (video) {
            const sec = await getVideoDurationSec(video);
            const ext = getFileExtension(video);
            const { url, contentId } = await requestVideoPresignedUrl(
              { videoDuration: String(sec), videoExtension: ext },
              "NOTICE_VIDEO"
            );
            await putFileToPresignedUrl(url, video);
            noticeVideoContent = { videoKey: String(contentId), videoDuration: String(sec) };
          }
    
          await updateAdminNotice(id, {
            ...basePayload,
            layout: "COMMON",
            title,
            textContent,
            noticeImageContent: imageIds.length ? imageIds : undefined,
            noticeVideoContent,
          });
        }
    
        alert("저장되었습니다.");
        router.push("/notice");
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "저장 중 오류가 발생했습니다.");
      }
    };

  const onDelete = async () => {
  const ok = window.confirm("정말로 이 공지를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.");
  if (!ok) return;

  try {
    await deleteAdminNotice(id);
    alert("삭제되었습니다.");
    router.push("/notice");
  } catch (err: any) {
    console.error(err);
    alert(err?.message ?? "삭제 중 오류가 발생했습니다.");
  }
  };


  if (!mounted || !isLoggedIn || isLoading || !layout) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation items={navItems} />
      <main className="max-w-4xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">공지 수정 #{id}</h1>
            <div className="flex items-center gap-3">
              <label className="font-medium">우선순위</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-24 border rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* 레이아웃 고정 노출 */}
          <div className="text-sm text-gray-500">Layout: {layout}</div>

    {/* 공통: 배너 */}
    <section className="space-y-2">
    <div className="flex items-center gap-2">
        <label className="block text-sm font-medium">배너 이미지</label>
        <span className="text-xs text-gray-500">
        사진을 클릭하면 이미지를 수정할 수 있습니다.
        </span>
    </div>

    <div
  role="button"
  tabIndex={0}
  onClick={openFilePicker}
  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFilePicker()}
  aria-label="배너 이미지 변경"
  className="relative aspect-[900/516] w-full overflow-hidden rounded-xl ring-1 ring-gray-200 bg-gradient-to-b from-gray-50 to-white cursor-pointer group"
>
  {bannerPreview ? (
    <img
      src={bannerPreview}
      alt="배너 미리보기"
      className="w-full h-full object-contain bg-white transition-transform group-hover:scale-[1.01]"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
      배너 이미지를 선택하세요
    </div>
  )}

  {/* 호버 안내 */}
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
    <span className="opacity-0 group-hover:opacity-100 text-white text-sm px-3 py-1 rounded-md bg-black/60">
      이미지 변경
    </span>
  </div>

  {/* 업로드 중 오버레이 */}
  {isUploadingBanner && (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
      <span className="text-white text-sm">업로드 중…</span>
    </div>
  )}
</div>

    <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={onPickBanner}
    className="sr-only"
    />


    <p className="text-xs text-gray-500">
        권장 1500px 이상 · 9:5.16 비율. 다른 비율은 흰색 레터박스로 패딩 처리됩니다.
    </p>
    </section>

          {layout === "BANNER_ONLY" ? (
            <></>
          ) : (
            <CommonEditor
              title={title}
              setTitle={setTitle}
              textContent={textContent}
              setTextContent={setTextContent}
              files={files}
              setFiles={setFiles}
            />
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              저장
            </button>

            <button
              onClick={() => router.push("/notice")}
              className="px-6 py-2 rounded-md bg-gray-500 text-white hover:bg-gray-600"
            >
              취소
            </button>

            <div className="flex-1" />

            <button
              onClick={onDelete}
              className="px-6 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// =========================
// BANNER_ONLY 편집부
// =========================

// =========================
// COMMON 편집부
// =========================
function CommonEditor({
  title,
  setTitle,
  textContent,
  setTextContent,
  files,
  setFiles,
}: {
  title: string;
  setTitle: (v: string) => void;
  textContent: string;
  setTextContent: (v: string) => void;
  files: File[];
  setFiles: (v: File[]) => void;
}) {
  const MAX_FILES = 5;
  const previews = useMemo(
    () => files.map((f) => ({ url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") })),
    [files]
  );
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const removeAt = (idx: number) => setFiles(files.filter((_, i) => i !== idx));
  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const incoming = Array.from(e.target.files || []);
    const remain = Math.max(0, MAX_FILES - files.length);
    const take = incoming.slice(0, remain);
    if (incoming.length > remain) alert(`최대 ${MAX_FILES}개까지 업로드할 수 있어요.`);
    setFiles([...files, ...take]);
    e.target.value = "";
  };

  return (
    <section className="space-y-4">
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

      <div>
        <label className="block text-sm font-medium mb-2">사진/영상 추가 업로드</label>
        <input id="fileUpload" type="file" accept="image/*,video/*" multiple onChange={onPick} />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {previews.map((p, idx) => (
            <div key={p.url} className="relative h-28 overflow-hidden rounded-md border">
              {p.isVideo ? (
                <video src={p.url} className="w-full h-full object-cover" controls />
              ) : (
                <img src={p.url} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white"
                aria-label="삭제"
                title="삭제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
