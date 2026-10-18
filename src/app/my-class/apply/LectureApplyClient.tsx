"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { EmptyState } from "@/components/admin/LectureParts";
import {
  GENRE_LABEL,
  LEVEL_LABEL,
  LectureGenre,
  LectureLevel,
  LectureOperationType,
  MAX_LECTURE_IMAGES,
  MAX_LECTURE_VIDEOS,
  createLecture,
  getMyLecture,
  updateLecture,
  uploadLectureImage,
  uploadLectureVideo,
} from "@/apis/lecture";

// 업로드된 미디어 (id + 미리보기 URL)
interface UploadedMedia {
  id: number;
  url: string;
}

const LectureApplyClient: React.FC<{ lectureId: number | null }> = ({ lectureId }) => {
  const ready = useAdminAuthGuard("TRAINER");
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isEdit = lectureId !== null;

  const [loading, setLoading] = useState(isEdit);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState<LectureGenre | null>(null);
  const [level, setLevel] = useState<LectureLevel | null>(null);
  const [capacity, setCapacity] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [price, setPrice] = useState("");
  const [operationType, setOperationType] = useState<LectureOperationType>("ALWAYS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [images, setImages] = useState<UploadedMedia[]>([]);
  const [videos, setVideos] = useState<UploadedMedia[]>([]);
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
        setGenre(l.genre);
        setLevel(l.level);
        setUnlimited(l.capacity === null);
        setCapacity(l.capacity === null ? "" : String(l.capacity));
        setPrice(String(l.price));
        setOperationType(l.operationType);
        setStartDate(l.startDate ?? "");
        setEndDate(l.endDate ?? "");
        setImages(l.images.map((i) => ({ id: i.imageId, url: i.url })));
        setVideos(l.introVideos.map((v) => ({ id: v.videoId, url: v.url })));
        setRejectReason(l.status === "REJECTED" ? l.rejectReason : null);
      } catch (err) {
        console.error(err);
        setError("클래스 정보를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId]);

  // 시즌제는 모집 인원 제한 없음 불가
  const changeOperationType = (type: LectureOperationType) => {
    setOperationType(type);
    if (type === "SEASON") setUnlimited(false);
  };

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_LECTURE_IMAGES - images.length);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const id = await uploadLectureImage(file);
        setImages((prev) => [...prev, { id, url: URL.createObjectURL(file) }]);
      }
    } catch (err) {
      console.error(err);
      setError("이미지 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || videos.length >= MAX_LECTURE_VIDEOS) return;
    setUploading(true);
    setError(null);
    try {
      const id = await uploadLectureVideo(file);
      setVideos((prev) => [...prev, { id, url: URL.createObjectURL(file) }]);
    } catch (err) {
      console.error(err);
      setError("영상 업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const priceNum = Number(price);
  const capacityNum = Number(capacity);
  const periodInvalid =
    operationType === "SEASON" && (!startDate || !endDate || startDate > endDate);
  const capacityInvalid = unlimited
    ? operationType === "SEASON"
    : capacity === "" || !Number.isInteger(capacityNum) || capacityNum < 1;
  const invalid =
    !title.trim() ||
    !description.trim() ||
    !genre ||
    !level ||
    capacityInvalid ||
    price === "" ||
    !Number.isInteger(priceNum) ||
    priceNum < 0 ||
    periodInvalid;
  const disabled = invalid || submitting || uploading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !genre || !level) return;
    setSubmitting(true);
    setError(null);
    const req = {
      title: title.trim(),
      description: description.trim(),
      genre,
      level,
      capacity: unlimited ? null : capacityNum,
      price: priceNum,
      operationType,
      startDate: operationType === "SEASON" ? startDate : null,
      endDate: operationType === "SEASON" ? endDate : null,
      imageIds: images.map((i) => i.id),
      videoIds: videos.map((v) => v.id),
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
        subtitle="수강료·기간·노출 이미지와 영상은 관리자 검토 후 최종 확정돼요. 결과는 로그인 이메일로 안내드려요."
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

            <Field label="장르">
              <ChipGroup<LectureGenre>
                options={(Object.keys(GENRE_LABEL) as LectureGenre[]).map((id) => ({ id, label: GENRE_LABEL[id] }))}
                value={genre}
                onChange={setGenre}
              />
            </Field>

            <Field label="난이도">
              <ChipGroup<LectureLevel>
                options={(Object.keys(LEVEL_LABEL) as LectureLevel[]).map((id) => ({ id, label: LEVEL_LABEL[id] }))}
                value={level}
                onChange={setLevel}
              />
            </Field>

            <Field label={`이미지 (최대 ${MAX_LECTURE_IMAGES}장 · 첫 번째가 대표 이미지)`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {images.map((img, idx) => (
                  <MediaThumb
                    key={img.id}
                    badge={idx === 0 ? "대표" : undefined}
                    onRemove={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                  >
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </MediaThumb>
                ))}
                {images.length < MAX_LECTURE_IMAGES && (
                  <AddTile disabled={uploading} onClick={() => imageInputRef.current?.click()}>
                    {uploading ? "업로드 중…" : `+ 이미지 (${images.length}/${MAX_LECTURE_IMAGES})`}
                  </AddTile>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={onPickImages} hidden />
            </Field>

            <Field label={`소개 영상 (선택 · 최대 ${MAX_LECTURE_VIDEOS}개)`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {videos.map((v) => (
                  <MediaThumb key={v.id} onRemove={() => setVideos((prev) => prev.filter((x) => x.id !== v.id))}>
                    <video src={v.url} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", background: "#000" }} />
                  </MediaThumb>
                ))}
                {videos.length < MAX_LECTURE_VIDEOS && (
                  <AddTile disabled={uploading} onClick={() => videoInputRef.current?.click()}>
                    {uploading ? "업로드 중…" : `+ 영상 (${videos.length}/${MAX_LECTURE_VIDEOS})`}
                  </AddTile>
                )}
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={onPickVideo} hidden />
            </Field>

            <Field label="희망 수강료 (원)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="0 이면 무료"
                style={inputStyle}
              />
            </Field>

            <Field label="운영 방식">
              <ChipGroup<LectureOperationType>
                options={[
                  { id: "ALWAYS", label: "상시 운영" },
                  { id: "SEASON", label: "시즌제" },
                ]}
                value={operationType}
                onChange={changeOperationType}
              />
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

            <Field label="모집 인원">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  value={unlimited ? "" : capacity}
                  disabled={unlimited}
                  onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={unlimited ? "제한 없음" : "예) 8"}
                  style={{ ...inputStyle, maxWidth: 160, background: unlimited ? "#f3f3f6" : "#fff" }}
                />
                <span style={{ fontSize: 14, color: "var(--admin-ink-2)" }}>명</span>
                {operationType === "ALWAYS" && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--admin-ink-2)", cursor: "pointer" }}>
                    <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
                    제한 없음
                  </label>
                )}
              </div>
            </Field>

            {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)" }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => router.push("/my-class")} style={secondaryBtn}>
                취소
              </button>
              <button
                type="submit"
                disabled={disabled}
                style={{
                  height: 42,
                  padding: "0 20px",
                  borderRadius: 10,
                  background: disabled ? "#c4c4cc" : "var(--admin-blue)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: disabled ? "not-allowed" : "pointer",
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

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
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
  );
}

const tileSize: React.CSSProperties = {
  width: 140,
  aspectRatio: "16 / 9",
  borderRadius: 10,
  overflow: "hidden",
  flexShrink: 0,
};

function MediaThumb({
  children,
  badge,
  onRemove,
}: {
  children: React.ReactNode;
  badge?: string;
  onRemove: () => void;
}) {
  return (
    <div style={{ ...tileSize, position: "relative", background: "#f3f3f6" }}>
      {children}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--admin-blue)",
            color: "#fff",
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        title="삭제"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "rgba(0,0,0,.55)",
          color: "#fff",
          fontSize: 13,
          lineHeight: "22px",
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddTile({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...tileSize,
        border: "1px dashed var(--admin-border)",
        background: "#fafafc",
        color: "var(--admin-ink-2)",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
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
