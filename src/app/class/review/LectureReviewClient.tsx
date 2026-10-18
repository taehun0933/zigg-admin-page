"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import Modal from "@/components/Modal";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { useIsMobile } from "@/components/admin/useIsMobile";
import {
  EmptyState,
  LectureStatusChip,
  capacityText,
  formatPrice,
  formatYmd,
  periodText,
} from "@/components/admin/LectureParts";
import {
  GENRE_LABEL,
  LEVEL_LABEL,
  Lecture,
  LectureOperationType,
  approveLecture,
  getLecture,
  rejectLecture,
} from "@/apis/lecture";

// 왼쪽: 트레이너 원본 신청서 / 오른쪽: 관리자 최종값 → [반려] [승인 및 공개]
const LectureReviewClient: React.FC<{ lectureId: number }> = ({ lectureId }) => {
  const ready = useAdminAuthGuard();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);

  // 최종값
  const [price, setPrice] = useState("");
  const [operationType, setOperationType] = useState<LectureOperationType>("ALWAYS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [imageIds, setImageIds] = useState<number[]>([]); // 노출 이미지 (신청 순서 유지)
  const [thumbnailId, setThumbnailId] = useState<number | null>(null);
  const [videoIds, setVideoIds] = useState<number[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const l = await getLecture(lectureId);
        setLecture(l);
        // 신청값으로 초기화
        setPrice(String(l.price));
        setOperationType(l.operationType);
        setStartDate(l.startDate ?? "");
        setEndDate(l.endDate ?? "");
        setUnlimited(l.capacity === null);
        setCapacity(l.capacity === null ? "" : String(l.capacity));
        setImageIds(l.images.map((i) => i.imageId));
        setThumbnailId(l.images[0]?.imageId ?? null);
        setVideoIds(l.introVideos.map((v) => v.videoId));
      } catch (err) {
        console.error(err);
        setLecture(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId]);

  const changeOperationType = (type: LectureOperationType) => {
    setOperationType(type);
    if (type === "SEASON") setUnlimited(false);
  };

  const toggleImage = (id: number) => {
    if (!lecture) return;
    const next = imageIds.includes(id)
      ? imageIds.filter((x) => x !== id)
      : lecture.images.map((i) => i.imageId).filter((x) => x === id || imageIds.includes(x));
    setImageIds(next);
    if (!next.includes(thumbnailId ?? -1)) setThumbnailId(next[0] ?? null);
  };

  const toggleVideo = (id: number) =>
    setVideoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const priceNum = Number(price);
  const capacityNum = Number(capacity);
  const periodInvalid =
    operationType === "SEASON" && (!startDate || !endDate || startDate > endDate);
  const capacityInvalid = unlimited
    ? operationType === "SEASON"
    : capacity === "" || !Number.isInteger(capacityNum) || capacityNum < 1;
  const invalid =
    price === "" || !Number.isInteger(priceNum) || priceNum < 0 || periodInvalid || capacityInvalid;

  const onApprove = async () => {
    if (!lecture || invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await approveLecture(lecture.lectureId, {
        price: priceNum,
        operationType,
        startDate: operationType === "SEASON" ? startDate : null,
        endDate: operationType === "SEASON" ? endDate : null,
        capacity: unlimited ? null : capacityNum,
        imageIds,
        thumbnailImageId: thumbnailId,
        videoIds: lecture.introVideos.map((v) => v.videoId).filter((id) => videoIds.includes(id)),
      });
      router.replace("/class");
    } catch (err) {
      console.error(err);
      setError("승인에 실패했어요. 입력값을 확인하고 다시 시도해주세요.");
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!lecture || busy) return;
    setBusy(true);
    try {
      await rejectLecture(lecture.lectureId, rejectReason.trim() || undefined);
      router.replace("/class");
    } catch (err) {
      console.error(err);
      alert("처리에 실패했습니다. 다시 시도해주세요.");
      setBusy(false);
    }
  };

  if (!ready) return null;

  const pending = lecture?.status === "PENDING";

  return (
    <AdminShell>
      <PageShell
        eyebrow="클래스 신청 관리"
        title={lecture ? lecture.title : "클래스 신청서"}
        subtitle="트레이너 신청서를 확인하고 수강료·기간·모집 인원·노출 이미지와 영상을 확정해 공개해요."
        action={
          <button type="button" style={btnSecondary} onClick={() => router.push("/class")}>
            목록으로
          </button>
        }
      >
        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : !lecture ? (
          <EmptyState>신청서를 불러오지 못했어요.</EmptyState>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* 왼쪽: 원본 신청서 */}
            <Panel title="트레이너 신청서 (원본)" right={<LectureStatusChip status={lecture.status} />}>
              <Row label="트레이너">{lecture.trainerEmail ?? "-"}</Row>
              <Row label="신청일">{formatYmd(lecture.createAt)}</Row>
              <Row label="장르 / 난이도">
                {GENRE_LABEL[lecture.genre]} · {LEVEL_LABEL[lecture.level]}
              </Row>
              <Row label="희망 수강료">{formatPrice(lecture.price)}</Row>
              <Row label="희망 운영">{periodText(lecture)}</Row>
              <Row label="모집 인원">{capacityText(lecture)}</Row>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "14px 0" }}>
                {lecture.description}
              </div>
            </Panel>

            {/* 오른쪽: 최종값 */}
            <Panel title="최종 확정값">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="수강료 (원)">
                  <input
                    value={price}
                    disabled={!pending}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
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
                    ).map((o) => (
                      <ChoiceButton
                        key={o.id}
                        active={operationType === o.id}
                        disabled={!pending}
                        onClick={() => changeOperationType(o.id)}
                      >
                        {o.label}
                      </ChoiceButton>
                    ))}
                  </div>
                </Field>

                {operationType === "SEASON" && (
                  <Field label="운영 기간">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="date" value={startDate} disabled={!pending} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                      <span style={{ color: "var(--admin-ink-3)" }}>~</span>
                      <input type="date" value={endDate} min={startDate || undefined} disabled={!pending} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                    </div>
                    {periodInvalid && startDate && endDate && (
                      <div style={{ fontSize: 12, color: "var(--admin-red-ink)", marginTop: 6 }}>
                        시작일은 종료일보다 늦을 수 없어요.
                      </div>
                    )}
                  </Field>
                )}

                <Field label="모집 인원">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      value={unlimited ? "" : capacity}
                      disabled={!pending || unlimited}
                      onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder={unlimited ? "제한 없음" : "예) 8"}
                      style={{ ...inputStyle, maxWidth: 140, background: unlimited ? "#f3f3f6" : "#fff" }}
                    />
                    <span style={{ fontSize: 14, color: "var(--admin-ink-2)" }}>명</span>
                    {operationType === "ALWAYS" && (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--admin-ink-2)" }}>
                        <input type="checkbox" checked={unlimited} disabled={!pending} onChange={(e) => setUnlimited(e.target.checked)} />
                        제한 없음
                      </label>
                    )}
                  </div>
                </Field>

                <Field label={`노출 이미지 (${imageIds.length}/${lecture.images.length}) · 대표 1장 선택`}>
                  {lecture.images.length === 0 ? (
                    <span style={{ fontSize: 12.5, color: "var(--admin-ink-3)" }}>신청한 이미지가 없어요.</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {lecture.images.map((img) => {
                        const selected = imageIds.includes(img.imageId);
                        const isThumb = thumbnailId === img.imageId;
                        return (
                          <div key={img.imageId} style={{ width: 132, display: "flex", flexDirection: "column", gap: 6 }}>
                            <button
                              type="button"
                              disabled={!pending}
                              onClick={() => toggleImage(img.imageId)}
                              style={{
                                ...mediaTile,
                                outline: selected ? "2px solid var(--admin-blue)" : "none",
                                opacity: selected ? 1 : 0.4,
                              }}
                            >
                              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              {isThumb && <span style={thumbBadge}>대표</span>}
                            </button>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: selected ? "var(--admin-ink-2)" : "var(--admin-ink-3)" }}>
                              <input
                                type="radio"
                                name="thumbnail"
                                checked={isThumb}
                                disabled={!pending || !selected}
                                onChange={() => setThumbnailId(img.imageId)}
                              />
                              대표 썸네일
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Field>

                <Field label={`노출 소개 영상 (${videoIds.length}/${lecture.introVideos.length})`}>
                  {lecture.introVideos.length === 0 ? (
                    <span style={{ fontSize: 12.5, color: "var(--admin-ink-3)" }}>신청한 영상이 없어요.</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {lecture.introVideos.map((v) => {
                        const selected = videoIds.includes(v.videoId);
                        return (
                          <div key={v.videoId} style={{ width: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                            <video
                              src={v.url}
                              poster={v.thumbnailUrl ?? undefined}
                              controls
                              playsInline
                              style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 10, background: "#000", opacity: selected ? 1 : 0.4 }}
                            />
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--admin-ink-2)" }}>
                              <input type="checkbox" checked={selected} disabled={!pending} onChange={() => toggleVideo(v.videoId)} />
                              앱에 노출
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Field>

                {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)" }}>{error}</div>}

                {pending ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                    <button
                      type="button"
                      style={{ ...btnSecondary, color: "var(--admin-red-ink)" }}
                      disabled={busy}
                      onClick={() => {
                        setRejectReason("");
                        setRejectOpen(true);
                      }}
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      style={{ ...btnPrimary, opacity: invalid || busy ? 0.5 : 1, cursor: invalid || busy ? "not-allowed" : "pointer" }}
                      disabled={invalid || busy}
                      onClick={onApprove}
                    >
                      {busy ? "처리 중…" : "승인 및 공개"}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--admin-ink-3)" }}>
                    승인 대기 상태가 아니라 수정할 수 없어요.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </PageShell>

      {rejectOpen && lecture && (
        <Modal
          isOpen={rejectOpen}
          onClose={() => !busy && setRejectOpen(false)}
          title="클래스 반려"
          sizeMode="SMALL"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--admin-ink-2)", lineHeight: 1.6 }}>
              <strong>{lecture.title}</strong> 클래스 신청을{" "}
              <strong style={{ color: "var(--admin-red-ink)" }}>반려</strong>합니다. 입력한 사유는
              트레이너에게 메일로 전달되고, 트레이너는 수정 후 다시 신청할 수 있어요.
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              maxLength={255}
              placeholder="반려 사유를 입력하세요. (선택)"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid var(--admin-border)",
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.55,
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setRejectOpen(false)} disabled={busy}>
                취소
              </button>
              <button
                style={{ ...btnPrimary, background: "var(--admin-red)", opacity: busy ? 0.6 : 1 }}
                onClick={onReject}
                disabled={busy}
              >
                {busy ? "처리 중…" : "반려하기"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
};

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: "#fff", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--admin-border)" }}>
      <span style={{ width: 92, flexShrink: 0, color: "var(--admin-ink-3)", fontWeight: 600 }}>{label}</span>
      <span style={{ minWidth: 0, wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-ink-2)" }}>{label}</span>
      {children}
    </div>
  );
}

function ChoiceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1,
        height: 40,
        borderRadius: 10,
        border: `1px solid ${active ? "var(--admin-blue)" : "var(--admin-border)"}`,
        background: active ? "var(--admin-blue-tint)" : "#fff",
        color: active ? "var(--admin-blue)" : "var(--admin-ink-2)",
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

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

const mediaTile: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: 10,
  overflow: "hidden",
  padding: 0,
  background: "#f3f3f6",
  outlineOffset: 2,
};

const thumbBadge: React.CSSProperties = {
  position: "absolute",
  top: 6,
  left: 6,
  padding: "2px 7px",
  borderRadius: 999,
  background: "var(--admin-blue)",
  color: "#fff",
  fontSize: 10.5,
  fontWeight: 700,
};

export default LectureReviewClient;
