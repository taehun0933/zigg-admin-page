// 생략된 import는 유지
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import {
  toImageExt,        // (지금은 컴포넌트에서 직접은 안써도 됨)
  uploadImageForPost,// (옵션/미사용)
  getImageSize,      // (requestImagePresignedUrl 내부에서 사용)
  putFileToPresignedUrl,
  requestImagePresignedUrl,
  requestVideoPresignedUrl,  // ✅ 추가
  toVideoExt,                // ✅ 추가
  formatHms,                 // ✅ 추가
  createPost,                // ✅ 추가
} from "@/apis/board"; // 경로 확인: 실제 파일 위치와 통일

const boardIdMap: Record<string, number> = {
  free: 1,
  promotion: 2,
  challenge: 3,
};

const BoardWrite: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState("free");

  // state 추가
  const [boardId, setBoardId] = useState<number | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previewURLs, setPreviewURLs] = useState<string[]>([]);

  // 초기 쿼리 파싱 useEffect 수정
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category") || "free";
    setCategory(categoryParam);

    // 1) 쿼리에 boardId가 오면 그걸 사용, 2) 없으면 매핑으로 계산
    const fromQuery = urlParams.get("boardId");
    const resolved =
      fromQuery !== null ? Number(fromQuery) : boardIdMap[categoryParam] ?? 1;
    setBoardId(resolved);
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const newFiles = [...files, ...selectedFiles];

    if (newFiles.length > MAX_FILES) {
        alert(`사진/영상은 최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`);
        return;
    }

    setFiles(newFiles);

    const newPreviewURLs = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewURLs((prev) => [...prev, ...newPreviewURLs]);
    };


    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !content.trim()) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
      }
    
      setIsSubmitting(true);
      try {
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        const videoFiles = files.filter((f) => f.type.startsWith("video/"));
    
        // 1) 이미지: presigned URL 발급 → PUT 업로드 → url 수집
        const imageUrls: string[] = [];
        for (const img of imageFiles) {
          const { url } = await requestImagePresignedUrl(img);
          await putFileToPresignedUrl(url, img);
          imageUrls.push(url); // 최종 게시글 본문에 그대로 사용(요구사항대로)
        }
    
        // 2) 비디오: presigned URL 발급 → PUT 업로드
        let videoUrl: string | undefined;
        let videoDuration: string | undefined;
        if (videoFiles[0]) {
          const v = videoFiles[0];
    
          // 길이(초) 계산
          const durationSec = await new Promise<number>((resolve, reject) => {
            const u = URL.createObjectURL(v);
            const el = document.createElement("video");
            el.preload = "metadata";
            el.onloadedmetadata = () => {
              resolve(Math.floor(el.duration || 0));
              URL.revokeObjectURL(u);
            };
            el.onerror = () => reject(new Error("비디오 길이 추출 실패"));
            el.src = u;
          });
    
          const { url } = await requestVideoPresignedUrl(durationSec, toVideoExt(v));
          await putFileToPresignedUrl(url, v);
          videoUrl = url;
          videoDuration = formatHms(durationSec); // "HH:mm:ss"
        }
    
        // handleSubmit 내부 createPost 호출 부분 교체
        if (!boardId) {
          alert("게시판 정보를 확인할 수 없습니다.");
          setIsSubmitting(false);
          return;
        }

        await createPost(boardId, {
          postTitle: title,
          postMessage: content,
          postImageContent: imageUrls,
          postVideoThumbnail: imageUrls[0],
          postVideoContent: videoUrl
            ? { videoKey: videoUrl, videoDuration: videoDuration! }
            : undefined,
        });
    
        alert("글이 성공적으로 저장되었습니다!");
        router.push("/board");
      } catch (err: any) {
        console.error(err);
        alert(err?.message || "업로드 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    };



  const navItems = navigationItems(router, handleLogout);
  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <main className="max-w-4xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">새 글 작성</h1>
            <div className="text-sm text-gray-600">
              카테고리: {category === "free" ? "자유" : category === "promotion" ? "홍보/구인" : "첼린지"}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 입력 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">제목</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            {/* 내용 입력 */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">내용</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="내용을 입력하세요"
                required
              />
            </div>


            {/* 파일 업로드 */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사진 및 영상 업로드</label>

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
                {previewURLs.map((url, idx) => {
                const file = files[idx];
                const isVideo = file?.type.startsWith("video");

                return isVideo ? (
                    <div key={idx} className="relative w-full h-32 overflow-hidden rounded-md border border-gray-200">
                    <video src={url} controls className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div key={idx} className="relative w-full h-32 overflow-hidden rounded-md border border-gray-200">
                    <img src={url} alt={`uploaded-${idx}`} className="w-full h-full object-cover" />
                    </div>
                );
                })}
            </div>
            </div>

            {/* 버튼 */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/board")}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BoardWrite;
