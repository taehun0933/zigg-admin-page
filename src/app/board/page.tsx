"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { AdminBoardPost, getAdminPosts } from "@/apis/board";

const CATEGORIES = [
  { id: "free", name: "자유게시판", boardId: 1, accent: "#007aff", tint: "#ecf3ff" },
  { id: "promotion", name: "홍보/구인", boardId: 2, accent: "#1f8a52", tint: "#e6f7ee" },
  { id: "challenge", name: "챌린지", boardId: 3, accent: "#6b3ec9", tint: "#f0ecff" },
];

const formatYmdHm = (iso: string) => {
  try {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
};

const BoardPage: React.FC = () => {
  const router = useRouter();
  const ready = useAdminAuthGuard();
  const [activeId, setActiveId] = useState("free");
  const [posts, setPosts] = useState<AdminBoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const active = useMemo(() => CATEGORIES.find((c) => c.id === activeId)!, [activeId]);

  const fetchPosts = useCallback(async (boardId: number) => {
    setLoading(true);
    try {
      const data = await getAdminPosts(boardId);
      setPosts(data ?? []);
    } catch (e) {
      console.error("게시글 불러오기 실패", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchPosts(active.boardId);
  }, [ready, active.boardId, fetchPosts]);

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="게시판 관리"
        title="카테고리별 운영자 게시글"
        subtitle="관리자가 작성한 게시글을 카테고리별로 관리합니다."
        action={
          <button
            style={btnPrimary}
            onClick={() => router.push(`/board/write?category=${active.id}&boardId=${active.boardId}`)}
          >
            + 글 쓰기
          </button>
        }
      >
        {/* category chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {CATEGORIES.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  background: isActive ? "#1a1a1f" : "#fff",
                  color: isActive ? "#fff" : "var(--admin-ink)",
                  border: isActive ? "none" : "1px solid var(--admin-border)",
                  fontWeight: 600,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent }} />
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="zg-table-scroll" style={{ ...adminCardStyle }}>
          <div className="zg-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 160px 160px 100px",
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
            <span>제목</span>
            <span>작성자</span>
            <span>작성일</span>
            <span style={{ textAlign: "right" }}>액션</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              등록된 게시글이 없습니다.
            </div>
          ) : (
            posts.map((p, i) => (
              <div
                key={p.postId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 160px 160px 100px",
                  padding: "14px 22px",
                  borderTop: i ? "1px solid var(--admin-border)" : "none",
                  alignItems: "center",
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span
                  style={{ fontVariantNumeric: "tabular-nums", color: "var(--admin-ink-2)" }}
                >
                  #{p.postId}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.postTitle || "(제목 없음)"}
                </span>
                <span style={{ color: "var(--admin-ink-2)" }}>{p.postCreator?.userName}</span>
                <span
                  style={{
                    color: "var(--admin-ink-2)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatYmdHm(p.createdAt)}
                </span>
                <button
                  onClick={() =>
                    router.push(`/board/edit?boardId=${p.boardId}&postId=${p.postId}`)
                  }
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--admin-blue)",
                    textAlign: "right",
                  }}
                >
                  수정·삭제
                </button>
              </div>
            ))
          )}
          </div>
        </div>
      </PageShell>
    </AdminShell>
  );
};

export default BoardPage;
