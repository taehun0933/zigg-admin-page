"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import Modal from "@/components/Modal";
import {
  getCustomerInquiryMessages,
  postCustomerInquiryReply,
} from "@/apis/customerInquiry";
import {
  CustomerInquiryDetailType,
  CustomerInquiryReplyType,
} from "@/types/customerInquiry";
import { formatYmdHm } from "@/utils/common";
import { Pagination } from "@mui/material";

const PAGE_SIZE = 20;
// 답변여부 필터 API가 없어 전체를 받아 클라이언트에서 탭 필터 + 페이지네이션
const FETCH_SIZE = 200;

type Tab = "open" | "done";

const CustomerInquiryPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<CustomerInquiryDetailType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState<Tab>("open");

  const [selected, setSelected] = useState<CustomerInquiryDetailType | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCustomerInquiryMessages({
        page: 0,
        size: FETCH_SIZE,
        sort: "createAt,desc",
      });
      setContent(data.content);
    } catch (e) {
      console.error(e);
      setError("문의 목록을 불러오지 못했어요.");
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchMessages();
  }, [ready, fetchMessages]);

  // 탭 전환 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  const counts = useMemo(() => {
    const open = content.filter((c) => c.replies.length === 0).length;
    const done = content.filter((c) => c.replies.length >= 1).length;
    return { open, done };
  }, [content]);

  const filtered = useMemo(
    () => content.filter((c) => (tab === "open" ? c.replies.length === 0 : c.replies.length >= 1)),
    [content, tab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const newReply = await postCustomerInquiryReply(selected.id, { message: replyText.trim() });
      setSelected((prev) =>
        prev ? { ...prev, replies: [...prev.replies, newReply] } : null,
      );
      setContent((prev) =>
        prev.map((it) => (it.id === selected.id ? { ...it, replies: [...it.replies, newReply] } : it)),
      );
      setReplyText("");
    } catch (e) {
      console.error(e);
      setReplyError("답장 전송에 실패했어요.");
    } finally {
      setReplySending(false);
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="고객 목소리함"
        title="유저 의견 응대"
        subtitle="유저가 보낸 의견·문의를 확인하고 응답합니다."
      >
        {/* tabs */}
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 3,
            background: "#f3f3f6",
            borderRadius: 9,
            marginBottom: 14,
          }}
        >
          {(
            [
              { id: "open", label: `미답변 (${counts.open})` },
              { id: "done", label: `답변 완료 (${counts.done})` },
            ] as { id: Tab; label: string }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  height: 30,
                  padding: "0 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? "#fff" : "transparent",
                  color: active ? "var(--admin-ink)" : "var(--admin-ink-2)",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ ...adminCardStyle, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 120px 1fr 80px 160px 80px",
              padding: "12px 22px",
              borderBottom: "1px solid var(--admin-border)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--admin-ink-3)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span>#</span>
            <span>닉네임</span>
            <span>제목</span>
            <span style={{ textAlign: "center" }}>답장수</span>
            <span>작성일</span>
            <span style={{ textAlign: "right" }}>액션</span>
          </div>

          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 40, textAlign: "center", color: "#cc3333", fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && pageItems.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              표시할 항목이 없어요.
            </div>
          )}

          {!loading &&
            !error &&
            pageItems.map((v, i) => (
              <div
                key={v.id}
                onClick={() => {
                  setSelected(v);
                  setReplyText("");
                  setReplyError(null);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 120px 1fr 80px 160px 80px",
                  padding: "14px 22px",
                  borderTop: i ? "1px solid var(--admin-border)" : "none",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: "#fff",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  #{v.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v.user.userNickname}</span>
                <span
                  style={{
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v.title || "(제목 없음)"}
                </span>
                <span
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: v.replies.length >= 1 ? "var(--admin-good)" : "var(--admin-ink-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v.replies.length}
                </span>
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  {formatYmdHm(v.createdAt)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-blue)", textAlign: "right" }}>
                  응답 →
                </span>
              </div>
            ))}
        </div>

        {!loading && !error && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_e, v) => setCurrentPage(v)}
              showFirstButton
              showLastButton
            />
          </div>
        )}
      </PageShell>

      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setReplyText("");
          setReplyError(null);
        }}
        title={selected?.title ?? ""}
        sizeMode="LARGE"
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: 14, marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--admin-ink-3)",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--admin-ink)" }}>
                  {selected.user.userNickname}
                </span>
                <span>·</span>
                <span>{formatYmdHm(selected.createdAt)}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, margin: 0 }}>{selected.message}</p>
            </div>

            <div
              style={{
                background: "var(--admin-bg)",
                border: "1px solid var(--admin-border)",
                borderRadius: 12,
                padding: 12,
                maxHeight: 280,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {selected.replies.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--admin-ink-3)", padding: 14, fontSize: 13 }}>
                  아직 답장이 없어요.
                </div>
              ) : (
                selected.replies.map((r) => <ReplyItem key={r.id} reply={r} />)
              )}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--admin-border)" }}>
              {replyError && (
                <div style={{ color: "#cc3333", fontSize: 12, marginBottom: 8 }}>{replyError}</div>
              )}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답장을 입력하세요…"
                rows={3}
                disabled={replySending}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid var(--admin-border)",
                  padding: 12,
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={handleSendReply}
                  disabled={replySending || !replyText.trim()}
                  style={{
                    ...btnPrimary,
                    background: !replyText.trim() || replySending ? "#c4c4cc" : "var(--admin-blue)",
                    cursor: !replyText.trim() || replySending ? "not-allowed" : "pointer",
                  }}
                >
                  {replySending ? "전송 중…" : "답장 보내기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
};

const ReplyItem: React.FC<{ reply: CustomerInquiryReplyType }> = ({ reply }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 8,
      padding: 10,
      border: "1px solid var(--admin-border)",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 8,
        fontSize: 12,
        color: "var(--admin-ink-3)",
        marginBottom: 4,
      }}
    >
      <span style={{ color: "var(--admin-ink-2)", fontWeight: 600 }}>{reply.sender.userNickname}</span>
      <span>{formatYmdHm(reply.createdAt)}</span>
    </div>
    <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>{reply.message}</p>
  </div>
);

export default CustomerInquiryPage;
