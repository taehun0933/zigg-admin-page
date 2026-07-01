"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, inputStyle } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { useIsMobile } from "@/components/admin/useIsMobile";
import { getAuditionDetail, deleteAudition } from "@/apis/audition";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { getUrlForUploadImage, putImageToPresignedUrl } from "@/apis/media";

interface AuditionEditData {
  title: string;
  company: string;
  qualification: string;
  startDate: string;   // yyyy-MM-dd
  endDate: string;     // yyyy-MM-dd
  thumbnailId?: number | null;             // 서버 DTO와 동일
}

const Field: React.FC<{ label: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  label,
  style,
  children,
}) => (
  <div style={style}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)", marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);

const AuditionEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ready = useAdminAuthGuard();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<AuditionEditData | null>(null);
  const [loading, setLoading] = useState(true);

  // 생성 페이지와 동일한 업로드/미리보기 상태
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ extension: string; width: number; height: number } | null>(null);
  const [currentImageKey, setCurrentImageKey] = useState<string>(""); // 조회 시 표시용
  const fileRef = useRef<HTMLInputElement | null>(null);

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

      const resp = await fetch(`${getApiBaseUrl()}/auditions/${id}`, {
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

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="오디션 관리"
        title="오디션 정보 수정"
        subtitle="오디션의 기본 정보와 썸네일을 수정합니다."
        maxWidth={880}
        action={
          <button style={btnPrimary} onClick={handleSubmit} disabled={loading || !form}>
            수정하기
          </button>
        }
      >
        {loading || !form ? (
          <div
            style={{
              ...adminCardStyle,
              padding: 48,
              textAlign: "center",
              color: "var(--admin-ink-3)",
              fontSize: 14,
            }}
          >
            불러오는 중…
          </div>
        ) : (
          <div
            style={{
              ...adminCardStyle,
              padding: isMobile ? 20 : 28,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 20 : 32,
            }}
          >
            {/* 썸네일 */}
            <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)", marginBottom: 6 }}>
                썸네일
              </div>
              <div
                onClick={handlePick}
                title="클릭해서 썸네일 변경"
                style={{
                  aspectRatio: "1 / 1",
                  width: "100%",
                  background: "#f3f3f6",
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {uploadedPreview ? (
                  <img
                    src={uploadedPreview}
                    alt="새 썸네일"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : currentImageKey ? (
                  <img
                    src={currentImageKey}
                    alt="현재 썸네일"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--admin-ink-3)" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>이미지 업로드</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>클릭하여 추가</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--admin-ink-3)" }}>
                이미지를 클릭하여 변경하세요
                {uploadedPreview && (
                  <span style={{ color: "var(--admin-blue)", fontWeight: 600 }}> · 미리보기 적용됨</span>
                )}
              </div>
              {uploadedPreview && (
                <button
                  type="button"
                  style={{
                    marginTop: 8,
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "1px solid var(--admin-border)",
                    background: "#fff",
                    color: "var(--admin-ink-2)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setUploadedPreview(null);
                    setImageMeta(null);
                  }}
                >
                  선택 취소 (기존 유지)
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
            </div>

            {/* 폼 필드 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="제목">
                <input name="title" value={form.title} onChange={handleInputChange} style={inputStyle} />
              </Field>
              <Field label="기획사명">
                <input name="company" value={form.company} onChange={handleInputChange} style={inputStyle} />
              </Field>
              <Field label="지원자격">
                <input
                  name="qualification"
                  value={form.qualification}
                  onChange={handleInputChange}
                  style={inputStyle}
                />
              </Field>
              <div style={{ display: "flex", gap: 12 }}>
                <Field label="시작일" style={{ flex: 1 }}>
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </Field>
                <Field label="종료일" style={{ flex: 1 }}>
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleInputChange}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  paddingTop: 16,
                  borderTop: "1px solid var(--admin-border)",
                }}
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    height: 38,
                    padding: "0 16px",
                    borderRadius: 10,
                    background: "#fff",
                    border: "1px solid #ffd0cc",
                    color: "#ff453a",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  삭제하기
                </button>
                <button style={btnPrimary} onClick={handleSubmit}>
                  수정하기
                </button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </AdminShell>
  );
};

export default AuditionEditPage;
