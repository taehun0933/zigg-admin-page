"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { EmptyState } from "@/components/admin/LectureParts";
import {
  LectureOperationType,
  createLecture,
  getMyLecture,
  updateLecture,
  uploadLectureThumbnail,
} from "@/apis/lecture";

const LectureApplyClient: React.FC<{ lectureId: number | null }> = ({ lectureId }) => {
  const ready = useAdminAuthGuard("TRAINER");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = lectureId !== null;

  const [loading, setLoading] = useState(isEdit);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [operationType, setOperationType] = useState<LectureOperationType>("ALWAYS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [thumbnailId, setThumbnailId] = useState<number | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 재신청: 기존 내용 채우기
  useEffect(() => {
    if (!ready || lectureId === null) return;
    (async () => {
      try {
        const l = await getMyLecture(lectureId);
        setTitle(l.title);
        setDescription(l.description);
        setPrice(String(l.price));
        setOperationType(l.operationType);
        setStartDate(l.startDate ?? "");
        setEndDate(l.endDate ?? "");
        setThumbnailId(l.thumbnailImageId);
        setThumbnailPreview(l.thumbnailImageUrl);
        setRejectReason(l.status === "REJECTED" ? l.rejectReason : null);
      } catch (err) {
        console.error(err);
        setError("클래스 정보를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId]);

  const onPickThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const id = await uploadLectureThumbnail(file);
      setThumbnailId(id);
      setThumbnailPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error(err);
      setError("썸네일 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const priceNum = Number(price);
  const periodInvalid =
    operationType === "SEASON" && (!startDate || !endDate || startDate > endDate);
  const invalid =
    !title.trim() ||
    !description.trim() ||
    price === "" ||
    !Number.isInteger(priceNum) ||
    priceNum < 0 ||
    periodInvalid;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || submitting || uploading) return;
    setSubmitting(true);
    setError(null);
    const req = {
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      thumbnailImageId: thumbnailId,
      operationType,
      startDate: operationType === "SEASON" ? startDate : null,
      endDate: operationType === "SEASON" ? endDate : null,
    };
    try {
      if (lectureId !== null) await updateLecture(lectureId, req);
      else await createLecture(req);
      router.replace("/my-class");
    } catch (err) {
      console.error(err);
      setError("신청에 실패했어요. 입력 내용을 확인하고 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="내 클래스"
        title={isEdit ? "클래스 수정 후 재신청" : "클래스 신청"}
        subtitle="제출하면 관리자 승인 후 앱에 노출돼요. 결과는 로그인 이메일로 안내드려요."
        maxWidth={760}
      >
        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              background: "#fff",
              border: "1px solid var(--admin-border)",
              borderRadius: 14,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {rejectReason && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--admin-red-tint)",
                  color: "var(--admin-red-ink)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                반려 사유: {rejectReason}
              </div>
            )}

            <Field label="클래스 제목">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="예) 입시 보컬 기초반"
                style={inputStyle}
              />
            </Field>

            <Field label="클래스 소개">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={7}
                placeholder="커리큘럼, 대상, 진행 방식 등을 적어주세요."
                style={{ ...inputStyle, height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.55 }}
              />
            </Field>

            <Field label="썸네일 (선택)">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 160,
                    aspectRatio: "16 / 9",
                    borderRadius: 10,
                    background: "#f3f3f6",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--admin-ink-3)",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "16:9 권장"
                  )}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={secondaryBtn}
                >
                  {uploading ? "업로드 중…" : thumbnailPreview ? "이미지 변경" : "이미지 선택"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickThumbnail} hidden />
              </div>
            </Field>

            <Field label="수강료 (원)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="0 이면 무료"
                style={inputStyle}
              />
            </Field>

            <Field label="운영 방식">
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { id: "ALWAYS", label: "상시 운영" },
                    { id: "SEASON", label: "시즌제" },
                  ] as const
                ).map((o) => {
                  const active = operationType === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOperationType(o.id)}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 10,
                        border: `1px solid ${active ? "var(--admin-blue)" : "var(--admin-border)"}`,
                        background: active ? "var(--admin-blue-tint)" : "#fff",
                        color: active ? "var(--admin-blue)" : "var(--admin-ink-2)",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {operationType === "SEASON" && (
              <Field label="운영 기간">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={inputStyle}
                  />
                  <span style={{ color: "var(--admin-ink-3)" }}>~</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ fontSize: 12, color: periodInvalid && startDate && endDate ? "var(--admin-red-ink)" : "var(--admin-ink-3)", marginTop: 6 }}>
                  {periodInvalid && startDate && endDate
                    ? "시작일은 종료일보다 늦을 수 없어요."
                    : "승인되면 시작일 전에도 앱에 노출되고, 종료일이 지나면 자동으로 마감돼요."}
                </div>
              </Field>
            )}

            {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)" }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => router.push("/my-class")} style={secondaryBtn}>
                취소
              </button>
              <button
                type="submit"
                disabled={invalid || submitting || uploading}
                style={{
                  height: 42,
                  padding: "0 20px",
                  borderRadius: 10,
                  background: invalid || submitting || uploading ? "#c4c4cc" : "var(--admin-blue)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: invalid || submitting || uploading ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "제출 중…" : isEdit ? "재신청" : "신청하기"}
              </button>
            </div>
          </form>
        )}
      </PageShell>
    </AdminShell>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-ink-2)" }}>{label}</span>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};

const secondaryBtn: React.CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  color: "var(--admin-ink-2)",
  fontWeight: 600,
  fontSize: 13,
};

export default LectureApplyClient;
