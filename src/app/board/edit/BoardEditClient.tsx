"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdminPostDetail,
  updatePost,
  deletePost,
  requestImagePresignedUrl,
  requestVideoPresignedUrl,
  putFileToPresignedUrl,
} from "@/apis/board";
import {
  getFileExtension,
  formatHms,
  getVideoDurationSec,
} from "@/utils/media";

interface BoardEditClientProps {
  boardId: number;
  postId: number;
}

export default function BoardEditClient({
  boardId,
  postId,
}: BoardEditClientProps) {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 원본(서버에 이미 존재)
  const [origImages, setOrigImages] = useState<string[]>([]);
  const [origVideoUrl, setOrigVideoUrl] = useState<string | undefined>(
    undefined
  );
  const [origVideoDuration, setOrigVideoDuration] = useState<
    string | undefined
  >(undefined);
  const [origThumb, setOrigThumb] = useState<string | undefined>(undefined);

  // 편집 상태
  const [keptImages, setKeptImages] = useState<string[]>([]); // 삭제 반영용(남기는 원본)
  const [newImages, setNewImages] = useState<File[]>([]); // 새로 추가한 이미지
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false); // 기존 비디오 삭제 플래그

  const MAX_FILES = 5;

  // 편집 상태
  // ✅ 새 비디오 프리뷰 URL
  const [newVideoPreview, setNewVideoPreview] = useState<string | null>(null);
  useEffect(() => {
    if (newVideo) {
      const u = URL.createObjectURL(newVideo);
      setNewVideoPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setNewVideoPreview(null);
  }, [newVideo]);
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }
    if (!boardId || !postId) {
      alert("잘못된 접근입니다.");
      router.push("/board");
      return;
    }

    (async () => {
      try {
        const d = await getAdminPostDetail(boardId, postId);
        setTitle(d.postTitle);
        setContent(d.postMessage);
        const imgs = d.postImageContents?.map((i: any) => i.imageKey) ?? [];
        setOrigImages(imgs);
        setKeptImages(imgs); // 편집 시작 시엔 모두 유지
        setOrigThumb(d.postThumbnailImage?.imageKey ?? undefined);
        setOrigVideoUrl(d.postVideoContent?.videoUrl ?? undefined);
        setOrigVideoDuration(d.postVideoContent?.videoDuration ?? undefined);
      } catch (e: any) {
        console.error(e);
        alert(e?.message || "게시글을 불러오지 못했습니다.");
        router.push("/board");
      } finally {
        setLoading(false);
      }
    })();
  }, [boardId, postId, isLoggedIn, router]);

  const navItems = useMemo(
    () =>
      navigationItems(
        router,
        () => (setIsLoggedIn(false), router.push("/signin"))
      ),
    [router, setIsLoggedIn]
  );

  // 새 이미지 미리보기
  const newPreviews = useMemo(
    () => newImages.map((f) => URL.createObjectURL(f)),
    [newImages]
  );
  useEffect(() => {
    return () => {
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newPreviews]);

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    const currentCount = keptImages.length + newImages.length;
    const remaining = Math.max(0, MAX_FILES - currentCount);
    const take = incoming.slice(0, remaining);
    if (incoming.length > remaining) {
      alert(`이미지는 최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`);
    }
    setNewImages((prev) => [...prev, ...take]);
    e.target.value = "";
  };

  const removeKeptImage = (idx: number) => {
    setKeptImages((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeNewImage = (idx: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목/내용을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      // 1) 새 이미지 업로드
      const uploadedNewImageUrls: string[] = [];
      for (const img of newImages) {
        const { url } = await requestImagePresignedUrl(img);
        await putFileToPresignedUrl(url, img);
        uploadedNewImageUrls.push(url);
      }

      // 최종 이미지 리스트(삭제 반영 + 새 업로드 추가)
      const finalImages = [...keptImages, ...uploadedNewImageUrls];

      // 2) 비디오 처리
      let videoUrl = origVideoUrl;
      let videoDuration = origVideoDuration;

      if (removeVideo) {
        videoUrl = undefined;
        videoDuration = undefined;
      }

      if (newVideo) {
        const sec = await getVideoDurationSec(newVideo);
        const ext = getFileExtension(newVideo); // 서버 enum과 매핑되는 문자열
        const { url } = await requestVideoPresignedUrl({
          videoDuration: String(sec),
          videoExtension: ext,
        });
        await putFileToPresignedUrl(url, newVideo);
        videoUrl = url;
        videoDuration = formatHms(sec);
      }

      await updatePost(boardId, postId, {
        postTitle: title,
        postMessage: content,
        postImageContent: finalImages,
        // (옵션) 썸네일 선택 로직: 지금은 첫 이미지로 자동
        // 필요하면 UI에서 라디오로 선택받아 값 사용
        postVideoThumbnail: finalImages[0] ?? origThumb,
        postVideoContent:
          videoUrl && videoDuration
            ? { videoKey: videoUrl, videoDuration }
            : undefined,
      });

      alert("수정되었습니다.");
      router.push("/board");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "수정 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deletePost(boardId, postId);
      alert("삭제되었습니다.");
      router.push("/board");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "삭제 실패");
    }
  };

  if (loading) return null;

  const totalImageCount = keptImages.length + newImages.length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <main className="max-w-4xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">게시글 수정</h1>
            <div className="space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md"
              >
                삭제
              </button>
            </div>
          </div>

          {/* 폼 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">내용</label>
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>

            {/* 이미지 섹션 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  이미지 ({totalImageCount}/{MAX_FILES})
                </div>
                <div className="space-x-2">
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddImages}
                    className="hidden"
                    disabled={totalImageCount >= MAX_FILES}
                  />
                  <label
                    htmlFor="imageUpload"
                    className={`inline-block px-3 py-1.5 rounded-md text-white text-sm cursor-pointer ${
                      totalImageCount >= MAX_FILES
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    이미지 추가
                  </label>
                </div>
              </div>

              {/* 유지 중인(원본) 이미지 */}
              {keptImages.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    현재 유지하는 이미지
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {keptImages.map((u, i) => (
                      <div key={`${u}-${i}`} className="relative">
                        <img
                          src={u}
                          alt="이미지"
                          className="w-full h-28 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeKeptImage(i)}
                          className="absolute top-1 right-1 px-2 py-1 text-xs bg-red-500 text-white rounded"
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새로 추가한 이미지 미리보기 */}
              {newImages.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    추가된 새 이미지
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {newPreviews.map((u, i) => (
                      <div key={u} className="relative">
                        <img
                          src={u}
                          alt="이미지"
                          className="w-full h-28 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          className="absolute top-1 right-1 px-2 py-1 text-xs bg-red-500 text-white rounded"
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 비디오 섹션 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">비디오</div>

              {/* 1) 기존 비디오 표시 (삭제 체크 or 새 비디오 선택되면 숨김) */}
              {origVideoUrl && !removeVideo && !newVideo && (
                <div className="space-y-2">
                  <video
                    src={origVideoUrl}
                    controls
                    className="w-full rounded-md border"
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={removeVideo}
                      onChange={(e) => setRemoveVideo(e.target.checked)}
                    />
                    기존 비디오 삭제
                  </label>
                </div>
              )}

              {/* 2) 새 비디오 선택 input */}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setNewVideo(f);
                    if (f) setRemoveVideo(false); // 새로 선택하면 삭제 플래그 해제
                  }}
                />
              </div>

              {/* 3) ✅ 새 비디오 미리보기 + 제거 버튼 (write처럼 즉시 미리보기) */}
              {newVideoPreview && (
                <div className="relative">
                  <video
                    src={newVideoPreview}
                    controls
                    className="w-full rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => setNewVideo(null)}
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-red-500 text-white rounded"
                  >
                    선택 해제
                  </button>
                  <div className="text-xs text-gray-500 mt-1">
                    {newVideo?.name}
                  </div>
                </div>
              )}
            </div>

            {/* (옵션) 썸네일 선택 UI를 쓰고 싶으면 아래 주석 해제
            <div>
              <div className="text-sm font-medium mb-1">썸네일 선택</div>
              {[...keptImages, ...newPreviews].map((u, i) => (
                <label key={u} className="inline-flex items-center mr-3 mb-2">
                  <input
                    type="radio"
                    name="thumb"
                    checked={(keptImages[0] ?? origThumb) === u}
                    onChange={() => setOrigThumb(u)}
                  />
                  <img src={u} className="w-16 h-16 object-cover rounded border ml-2" />
                </label>
              ))}
            </div>
            */}
          </div>
        </div>
      </main>
    </div>
  );
}
