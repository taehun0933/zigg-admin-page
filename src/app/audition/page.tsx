"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary } from "@/components/admin/PageShell";
import AdminIcon from "@/components/admin/AdminIcon";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { useIsMobile } from "@/components/admin/useIsMobile";
import { getAuditions, postNewAudition } from "@/apis/audition";
import { getUrlForUploadImage, putImageToPresignedUrl } from "@/apis/media";
import Modal from "@/components/Modal";

export interface Audition {
  id: number;
  applicationCount: number;
  likeCount: number;
  scrapCount: number;
  title: string;
  company: string;
  qualification: string;
  thumbnail: { imageKey: string; onClickUrl: string | null };
  startDate: string;
  endDate: string;
  isAlwaysOn?: boolean;
}

type Bucket = "alwaysOn" | "ongoing" | "upcoming" | "completed";

const BUCKET_META: Record<Bucket, { label: string; color: string; tint: string }> = {
  alwaysOn: { label: "상시 피드백", color: "#6b3ec9", tint: "#f0ecff" },
  ongoing: { label: "진행중", color: "#1f8a52", tint: "#e6f7ee" },
  upcoming: { label: "예정", color: "#007aff", tint: "#ecf3ff" },
  completed: { label: "종료", color: "#a1a1aa", tint: "#f1f1f5" },
};

const nfmt = (n: number) => n.toLocaleString("ko-KR");

const AuditionPage: React.FC = () => {
  const router = useRouter();
  const ready = useAdminAuthGuard();
  const isMobile = useIsMobile();

  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // create form
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ extension: string; width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    title: "",
    company: "",
    qualification: "",
    thumbnailId: 0,
    startDate: "",
    endDate: "",
    isAlwaysOn: false,
  });

  const loadList = () => {
    getAuditions()
      .then((data) => setAuditions(data ?? []))
      .catch(console.error);
  };

  useEffect(() => {
    if (ready) loadList();
  }, [ready]);

  const grouped = useMemo(() => {
    const now = new Date();
    const sorted = [...auditions].sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );
    const alwaysOn = sorted.filter((a) => a.isAlwaysOn);
    const regular = sorted.filter((a) => !a.isAlwaysOn);
    return {
      alwaysOn,
      ongoing: regular.filter((a) => new Date(a.startDate) <= now && new Date(a.endDate) >= now),
      upcoming: regular.filter((a) => new Date(a.startDate) > now),
      completed: regular.filter((a) => new Date(a.endDate) < now),
    };
  }, [auditions]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const reader = new FileReader();
    const image = new Image();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      image.onload = () => setImageMeta({ extension, width: image.naturalWidth, height: image.naturalHeight });
      image.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const required: Array<keyof typeof form> = form.isAlwaysOn
      ? ["title", "company", "qualification", "startDate"]
      : ["title", "company", "qualification", "startDate", "endDate"];
    if (required.some((k) => (form as any)[k] === "")) {
      alert("모든 정보를 입력해주세요.");
      return;
    }
    if (!uploadedImage || !imageMeta) {
      alert("이미지는 필수입니다.");
      return;
    }
    try {
      const { contentId, url } = await getUrlForUploadImage({
        uploadPurposeQuery: "AUDITION_THUMBNAIL",
        body: { extension: imageMeta.extension, width: imageMeta.width, height: imageMeta.height },
      });
      const res = await fetch(uploadedImage);
      const blob = await res.blob();
      const ok = await putImageToPresignedUrl({
        presignedUrl: url,
        file: blob,
        contentType: `image/${imageMeta.extension}`,
      });
      if (!ok) {
        alert("이미지 업로드 실패");
        return;
      }
      const finalForm = {
        ...form,
        thumbnailId: contentId,
        endDate: form.isAlwaysOn ? "2999-12-31" : form.endDate,
      };
      await postNewAudition(finalForm);
      alert("오디션이 생성되었습니다.");
      setIsModalOpen(false);
      setUploadedImage(null);
      setImageMeta(null);
      setForm({
        title: "",
        company: "",
        qualification: "",
        thumbnailId: 0,
        startDate: "",
        endDate: "",
        isAlwaysOn: false,
      });
      loadList();
    } catch (e) {
      alert("오류 발생: " + String(e));
    }
  };

  if (!ready) return null;

  const total = auditions.length;

  return (
    <AdminShell>
      <PageShell
        eyebrow="오디션 관리"
        title="진행 중인 오디션 모아보기"
        subtitle={
          <>
            <strong style={{ color: "var(--admin-ink)" }}>{nfmt(total)}개</strong>의 오디션 ·
            상시 {grouped.alwaysOn.length} · 진행 {grouped.ongoing.length} · 예정 {grouped.upcoming.length} · 종료 {grouped.completed.length}
          </>
        }
        action={
          <button style={btnPrimary} onClick={() => setIsModalOpen(true)}>
            + 새 오디션 생성
          </button>
        }
      >
        {/* 활성(상시 + 진행중) 같은 그리드 */}
        {(() => {
          const activeList: { audition: Audition; bucket: Bucket }[] = [
            ...grouped.alwaysOn.map((a) => ({ audition: a, bucket: "alwaysOn" as Bucket })),
            ...grouped.ongoing.map((a) => ({ audition: a, bucket: "ongoing" as Bucket })),
          ];
          return (
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: BUCKET_META.ongoing.tint,
                    color: BUCKET_META.ongoing.color,
                  }}
                >
                  진행중 {grouped.ongoing.length}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: BUCKET_META.alwaysOn.tint,
                    color: BUCKET_META.alwaysOn.color,
                  }}
                >
                  상시 {grouped.alwaysOn.length}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  총 {activeList.length}개
                </h2>
              </div>
              {activeList.length === 0 ? (
                <div
                  style={{
                    ...adminCardStyle,
                    padding: 28,
                    textAlign: "center",
                    color: "var(--admin-ink-3)",
                    fontSize: 13,
                  }}
                >
                  진행중 / 상시 오디션이 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  {activeList.map(({ audition, bucket }) => (
                    <AuditionCard
                      key={audition.id}
                      audition={audition}
                      bucket={bucket}
                      onClick={() => router.push(`/audition/${audition.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* 예정 / 종료 — 기존처럼 분리된 섹션 */}
        {(["upcoming", "completed"] as Bucket[]).map((bucket) => {
          const list = grouped[bucket];
          const meta = BUCKET_META[bucket];
          return (
            <section key={bucket} style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: meta.tint,
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  {list.length}개
                </h2>
              </div>
              {list.length === 0 ? (
                <div
                  style={{
                    ...adminCardStyle,
                    padding: 28,
                    textAlign: "center",
                    color: "var(--admin-ink-3)",
                    fontSize: 13,
                  }}
                >
                  해당 카테고리의 오디션이 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  {list.map((a) => (
                    <AuditionCard key={a.id} audition={a} bucket={bucket} onClick={() => router.push(`/audition/${a.id}`)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </PageShell>

      {/* Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="오디션 생성"
        sizeMode="LARGE"
      >
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 32 }}>
          <div
            style={{
              flex: 1,
              minHeight: isMobile ? 200 : 320,
              background: "#f3f3f6",
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              overflow: "hidden",
              position: "relative",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="썸네일"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "var(--admin-ink-3)" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>이미지 업로드</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>1:1 비율 권장</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="오디션 제목">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: JYP Audition"
                style={inputStyle}
              />
            </Field>
            <Field label="기획사명">
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="예: JYP 엔터테인먼트"
                style={inputStyle}
              />
            </Field>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--admin-ink-2)",
              }}
            >
              <input
                type="checkbox"
                checked={form.isAlwaysOn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isAlwaysOn: e.target.checked,
                    endDate: e.target.checked ? "2999-12-31" : "",
                  })
                }
              />
              상시 피드백 오디션 (마감일 없음, 지원 시 티켓 1장 차감)
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="시작일" style={{ flex: 1 }}>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="종료일" style={{ flex: 1 }}>
                <input
                  type="date"
                  value={form.endDate}
                  disabled={form.isAlwaysOn}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  style={{
                    ...inputStyle,
                    background: form.isAlwaysOn ? "#f3f3f6" : "#fff",
                    color: form.isAlwaysOn ? "var(--admin-ink-3)" : "var(--admin-ink)",
                  }}
                />
              </Field>
            </div>
            <Field label="지원자격">
              <input
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                placeholder="예: A,B,C"
                style={inputStyle}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={btnPrimary} onClick={handleSubmit}>
                생성하기
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};

const Field: React.FC<{ label: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ label, style, children }) => (
  <div style={style}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)", marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

interface AuditionCardProps {
  audition: Audition;
  bucket: Bucket;
  onClick: () => void;
}

const AuditionCard: React.FC<AuditionCardProps> = ({ audition, bucket, onClick }) => {
  const meta = BUCKET_META[bucket];
  return (
    <button
      onClick={onClick}
      style={{
        ...adminCardStyle,
        padding: 14,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#d0d0d8";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--admin-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          width: "100%",
          borderRadius: 10,
          overflow: "hidden",
          background: "#f3f3f6",
        }}
      >
        {audition.thumbnail?.imageKey ? (
          <img
            src={audition.thumbnail.imageKey}
            alt={audition.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            background: meta.tint,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {audition.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>{audition.company}</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--admin-ink-2)",
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {audition.isAlwaysOn ? "상시" : `${audition.startDate} ~ ${audition.endDate}`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--admin-border)",
          fontSize: 12,
          color: "var(--admin-ink-2)",
        }}
      >
        <span>
          지원{" "}
          <strong
            style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}
          >
            {nfmt(audition.applicationCount)}
          </strong>
        </span>
        <span>
          좋아요{" "}
          <strong
            style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}
          >
            {nfmt(audition.likeCount)}
          </strong>
        </span>
        <span>
          북마크{" "}
          <strong
            style={{ color: "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}
          >
            {nfmt(audition.scrapCount)}
          </strong>
        </span>
      </div>
    </button>
  );
};

export default AuditionPage;
