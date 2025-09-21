"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import { getAuditionDetail, deleteAudition } from "@/apis/audition";
import { getUrlForUploadImage, putImageToPresignedUrl } from "@/apis/media";

interface AuditionEditData {
  title: string;
  company: string;
  qualification: string;
  startDate: string;   // yyyy-MM-dd
  endDate: string;     // yyyy-MM-dd
  thumbnailId?: number | null;             // 서버 DTO와 동일
}

const AuditionEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<AuditionEditData | null>(null);
  const [loading, setLoading] = useState(true);

  // 생성 페이지와 동일한 업로드/미리보기 상태
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ extension: string; width: number; height: number } | null>(null);
  const [currentImageKey, setCurrentImageKey] = useState<string>(""); // 조회 시 표시용
  const fileRef = useRef<HTMLInputElement | null>(null);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL_FOR_ADMIN;

  const navItems: NavItem[] = [
    { label: "오디션 관리", onClick: () => router.push("/audition") },
    { label: "공지사항 관리", onClick: () => router.push("/notice") },
    { label: "로그아웃", onClick: () => router.push("/signin") },
  ];

  const toDateInput = (s?: string) => (s ? new Date(s).toISOString().slice(0, 10) : "");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const detail = await getAuditionDetail(Number(id));
        setForm({
          title: detail.title ?? "",
          company: detail.company ?? "",
          qualification: detail.qualification ?? "",
          startDate: toDateInput(detail.startDate),
          endDate: toDateInput(detail.endDate),
          // thumbnailId는 조회 응답에 없을 수 있음 → 새 업로드 시에만 세팅
        });
        setCurrentImageKey(detail.thumbnail?.imageKey ?? "");
      } catch {
        alert("오디션 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading || !form) return <div className="p-8">Loading...</div>;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handlePick = () => fileRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const reader = new FileReader();
    const img = new Image();

    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedPreview(base64);
      img.onload = () => {
        setImageMeta({
          extension: ext,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form) return;
    if (!window.confirm("수정하시겠습니까?")) return;

    const token = localStorage.getItem("token") ?? "";
    let thumbnailIdToSend: number | undefined = undefined;

    try {
      // 새 이미지가 선택된 경우에만 presigned 업로드
      if (uploadedPreview && imageMeta) {
        const { contentId, url } = await getUrlForUploadImage({
          uploadPurposeQuery: "AUDITION_THUMBNAIL",
          body: {
            extension: imageMeta.extension,
            width: imageMeta.width,
            height: imageMeta.height,
          },
        });

        const res = await fetch(uploadedPreview);
        const blob = await res.blob();
        const ok = await putImageToPresignedUrl({
          presignedUrl: url,
          file: blob,
          contentType: `image/${imageMeta.extension}`,
        });
        if (!ok) throw new Error("썸네일 업로드 실패");
        thumbnailIdToSend = contentId;
        // 폼에도 반영(사용자가 다시 수정 페이지에 머물러도 값 유지)
        setForm((prev) => (prev ? { ...prev, thumbnailId: contentId } : prev));
      }

      const payload: Record<string, unknown> = {
        title: form.title,
        company: form.company,
        qualification: form.qualification,
        startDate: form.startDate,
        endDate: form.endDate,
      };
      if (typeof thumbnailIdToSend === "number") payload.thumbnailId = thumbnailIdToSend;

      const resp = await fetch(`${BASE_URL}/auditions/${id}`, {
        method: "PATCH",
        headers: { Authorization: `${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("수정 실패");

      alert("수정되었습니다.");
      router.push(`/audition/${id}`);
    } catch (e: any) {
      alert(e?.message ?? "수정에 실패했습니다.");
    }
  };

  // ✅ 삭제 로직
  const handleDelete = async () => {
    if (!window.confirm("정말 이 오디션을 삭제하시겠습니까?")) return;
    try {
      await deleteAudition(Number(id));
      alert("삭제되었습니다.");
      router.push("/audition");
    } catch (error: any) {
      alert("삭제에 실패했습니다: " + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />

      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6">오디션 정보 수정</h2>

        <table className="w-full border">
          <tbody>
            <tr>
              <th className="text-left p-2 border">제목</th>
              <td className="p-2 border">
                <input
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">기획사명</th>
              <td className="p-2 border">
                <input
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">지원자격</th>
              <td className="p-2 border">
                <input
                  name="qualification"
                  value={form.qualification}
                  onChange={handleInputChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">시작일</th>
              <td className="p-2 border">
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleInputChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">종료일</th>
              <td className="p-2 border">
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleInputChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>

            {/* 썸네일: 생성 페이지 UX 동일 */}
            <tr>
              <th className="text-left p-2 border">썸네일</th>
              <td className="p-2 border">
                <div
                  className="inline-flex items-center gap-4 cursor-pointer"
                  onClick={handlePick}
                  title="클릭해서 썸네일 변경"
                >
                  <div className="w-[200px] h-[200px] bg-gray-100 rounded border overflow-hidden flex items-center justify-center">
                    {uploadedPreview ? (
                      <img src={uploadedPreview} alt="새 썸네일" className="object-contain w-full h-full" />
                    ) : currentImageKey ? (
                      <img src={currentImageKey} alt="현재 썸네일" className="object-contain w-full h-full" />
                    ) : (
                      <span className="text-gray-400 text-sm">썸네일 없음 (클릭하여 추가)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 hidden sm:block">
                    이미지를 클릭하여 변경하세요
                    {uploadedPreview && <div className="text-xs text-rose-500">미리보기 적용됨</div>}
                  </div>
                </div>

                <div className="mt-2">
                  {uploadedPreview && (
                    <button
                      type="button"
                      className="px-3 py-1 text-sm border rounded"
                      onClick={() => {
                        setUploadedPreview(null);
                        setImageMeta(null);
                      }}
                    >
                      선택 취소 (기존 유지)
                    </button>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between mt-6">
          {/* 삭제 버튼 */}
          <button
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors"
            onClick={handleDelete}
          >
            삭제하기
          </button>

          {/* 수정 버튼 */}
          <button
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
            onClick={handleSubmit}
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditionEditPage;
