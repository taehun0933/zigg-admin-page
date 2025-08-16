"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  toVideoExt,
  formatHms,
} from "@/apis/board";

export default function BoardEditPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const boardId = Number(params.get("boardId"));
  const postId = Number(params.get("postId"));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 기존 미디어(수정 안 하면 그대로 유지)
  const [origImages, setOrigImages] = useState<string[]>([]);
  const [origVideoUrl, setOrigVideoUrl] = useState<string | undefined>(undefined);
  const [origVideoDuration, setOrigVideoDuration] = useState<string | undefined>(undefined);
  const [origThumb, setOrigThumb] = useState<string | undefined>(undefined);

  // 교체 업로드용
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);

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
        setOrigImages(d.postImageContents?.map((i) => i.imageKey) ?? []);
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
    () => navigationItems(router, () => (setIsLoggedIn(false), router.push("/signin"))),
    [router, setIsLoggedIn]
  );

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목/내용을 입력하세요.");
      return;
    }

    setSaving(true);
    try {
      // 1) 이미지 교체가 있다면 업로드, 아니면 기존 유지
      let imageUrls: string[] = origImages;
      if (newImages.length > 0) {
        const urls: string[] = [];
        for (const img of newImages) {
          const { url } = await requestImagePresignedUrl(img);
          await putFileToPresignedUrl(url, img);
          urls.push(url);
        }
        imageUrls = urls;
      }

      // 2) 비디오 교체
      let videoUrl = origVideoUrl;
      let videoDuration = origVideoDuration;

      if (newVideo) {
        // 길이 구하기
        const durationSec = await new Promise<number>((resolve, reject) => {
          const u = URL.createObjectURL(newVideo);
          const el = document.createElement("video");
          el.preload = "metadata";
          el.onloadedmetadata = () => {
            resolve(Math.floor(el.duration || 0));
            URL.revokeObjectURL(u);
          };
          el.onerror = () => reject(new Error("비디오 길이 추출 실패"));
          el.src = u;
        });

        const { url } = await requestVideoPresignedUrl(durationSec, toVideoExt(newVideo));
        await putFileToPresignedUrl(url, newVideo);
        videoUrl = url;
        videoDuration = formatHms(durationSec);
      }

      await updatePost(boardId, postId, {
        postTitle: title,
        postMessage: content,
        postImageContent: imageUrls,
        postVideoThumbnail: imageUrls[0] ?? origThumb,
        postVideoContent:
          videoUrl && videoDuration ? { videoKey: videoUrl, videoDuration } : undefined,
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

            {/* 기존 이미지 미리보기 */}
            {origImages.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">현재 이미지</div>
                <div className="grid grid-cols-3 gap-3">
                  {origImages.map((u, i) => (
                    <img key={i} src={u} className="w-full h-28 object-cover rounded-md border" />
                  ))}
                </div>
              </div>
            )}

            {/* 이미지 교체 업로드 */}
            <div>
              <label className="block text-sm font-medium mb-1">이미지 교체(선택)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => {
                const fs = Array.from(e.target.files || []);
                setNewImages(fs);
              }} />
            </div>

            {/* 기존 비디오 */}
            {origVideoUrl && (
              <div>
                <div className="text-sm font-medium mb-1">현재 비디오</div>
                <video src={origVideoUrl} controls className="w-full rounded-md border" />
              </div>
            )}

            {/* 비디오 교체 */}
            <div>
              <label className="block text-sm font-medium mb-1">비디오 교체(선택)</label>
              <input type="file" accept="video/*" onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setNewVideo(f);
              }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
