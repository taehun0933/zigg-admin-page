"use client";

import React, { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary, inputStyle } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import UserAvatar from "@/components/admin/UserAvatar";
import {
  searchUsersByNickname,
  grantTickets,
  getUserTicketSummary,
  getTicketPurchases,
  UserSearchResult,
  UserTicketSummary,
  TicketLogType,
  TicketPurchase,
} from "@/apis/ticket";

const REASON_OPTIONS = [
  "결제 오류 보상",
  "이벤트 보상",
  "오디션 재지원",
  "기타",
];

const PAGE_SIZE = 20;

const LOG_META: Record<TicketLogType, { label: string; sign: "+" | "-"; color: string }> = {
  PURCHASE: { label: "구매", sign: "+", color: "var(--admin-blue)" },
  ADMIN_ADJUSTMENT: { label: "관리자 지급", sign: "+", color: "#1f8a52" },
  AUDITION_CANCEL: { label: "오디션 취소 환급", sign: "+", color: "#1f8a52" },
  REFUND: { label: "환불", sign: "-", color: "#cc3333" },
  USE: { label: "사용", sign: "-", color: "var(--admin-ink-2)" },
};

const fmtDate = (iso: string) => iso.replace("T", " ").slice(0, 16);

const TicketPage: React.FC = () => {
  const ready = useAdminAuthGuard();

  // ── UI ───────────────────────────────────────────────
  const [tab, setTab] = useState<"grant" | "pay">("grant");

  // ── 지급 ─────────────────────────────────────────────
  const [searchNickname, setSearchNickname] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [memo, setMemo] = useState("");
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── 선택 유저 티켓 요약 ───────────────────────────────
  const [summary, setSummary] = useState<UserTicketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── 결제내역 목록 ─────────────────────────────────────
  const [purchaseQuery, setPurchaseQuery] = useState("");
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const loadSummary = useCallback(async (userId: number) => {
    setSummaryLoading(true);
    try {
      setSummary(await getUserTicketSummary(userId));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) loadSummary(selectedUser.userId);
    else setSummary(null);
  }, [selectedUser, loadSummary]);

  const loadPurchases = useCallback(async (nextPage: number, query: string) => {
    setLoadingPurchases(true);
    try {
      const res = await getTicketPurchases(nextPage, query, PAGE_SIZE);
      setPurchases(res.content);
      setPage(res.number);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases(0, "");
  }, [loadPurchases]);

  const handleSearch = async () => {
    const q = searchNickname.trim();
    if (!q) return;
    setSearching(true);
    setSelectedUser(null);
    setError("");
    setSuccess("");
    try {
      const results = await searchUsersByNickname(q);
      setSearchResults(results);
      if (results.length === 0) setError("해당 닉네임의 유저를 찾을 수 없습니다.");
    } catch {
      setError("유저 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedUser) return;
    if (amount <= 0) {
      setError("지급 수량은 1장 이상이어야 합니다.");
      return;
    }
    setGranting(true);
    setError("");
    setSuccess("");
    try {
      const finalReason = memo.trim() ? `${reason} — ${memo.trim()}` : reason;
      const res = await grantTickets(selectedUser.userNickname, amount, finalReason);
      setSuccess(res.message);
      setAmount(1);
      setMemo("");
      // 지급 후 요약·결제내역 갱신
      loadSummary(selectedUser.userId);
      loadPurchases(page, purchaseQuery);
    } catch {
      setError("티켓 지급에 실패했습니다.");
    } finally {
      setGranting(false);
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="티켓 관리"
        title="티켓 지급 · 결제내역"
        subtitle="유저에게 티켓을 직접 지급하고, 결제(구매) 내역을 조회합니다."
      >
        {/* 서브탭 */}
        <div
          style={{
            display: "flex",
            gap: 18,
            margin: "0 0 16px",
            borderBottom: "1px solid var(--admin-border)",
          }}
        >
          {[
            { key: "grant" as const, label: "티켓 지급" },
            { key: "pay" as const, label: "결제내역", count: totalElements },
          ].map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  position: "relative",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: on ? "var(--admin-ink)" : "var(--admin-ink-3)",
                  padding: "11px 2px",
                }}
              >
                {t.label}
                {t.count != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--admin-ink-3)", marginLeft: 5 }}>
                    {t.count.toLocaleString()}
                  </span>
                )}
                {on && (
                  <span
                    style={{
                      position: "absolute", left: 0, right: 0, bottom: -1,
                      height: 2, background: "var(--admin-blue)", borderRadius: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {tab === "grant" && (
        <div className="zg-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* 지급 */}
          <div style={{ ...adminCardStyle, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>티켓 지급</div>

            <Field label="대상 유저 닉네임">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={searchNickname}
                  onChange={(e) => setSearchNickname(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="@닉네임"
                  style={inputStyle}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ ...btnSecondary, height: 40, whiteSpace: "nowrap" }}
                >
                  {searching ? "검색…" : "검색"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    border: "1px solid var(--admin-border)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {searchResults.map((u, i) => (
                    <button
                      key={u.userId}
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchResults([]);
                        setError("");
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "#fff",
                        borderTop: i ? "1px solid var(--admin-border)" : "none",
                        textAlign: "left",
                      }}
                    >
                      <UserAvatar url={u.profileImageUrl} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.userNickname}</div>
                        {u.userName && (
                          <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>{u.userName}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "var(--admin-blue-tint)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <UserAvatar url={selectedUser.profileImageUrl} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedUser.userNickname}</div>
                    <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>ID #{selectedUser.userId}</div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} style={{ fontSize: 12, color: "var(--admin-ink-2)" }}>
                    × 해제
                  </button>
                </div>
              )}
            </Field>

            <Field label="지급 매수">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>

            <Field label="지급 사유">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ ...inputStyle, paddingRight: 32 }}
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>

            <Field label="메모 (선택)">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="추가 메모"
                style={{ ...inputStyle, height: "auto", padding: 12, lineHeight: 1.5, resize: "vertical" }}
              />
            </Field>

            {error && <Banner tone="error">{error}</Banner>}
            {success && <Banner tone="good">{success}</Banner>}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={handleGrant}
                disabled={!selectedUser || granting}
                style={{
                  ...btnPrimary,
                  background: !selectedUser || granting ? "#c4c4cc" : "var(--admin-blue)",
                  cursor: !selectedUser || granting ? "not-allowed" : "pointer",
                }}
              >
                {granting ? "지급 중…" : "티켓 지급"}
              </button>
            </div>
          </div>

          {/* 선택 유저 티켓 현황 */}
          <div style={{ ...adminCardStyle, padding: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--admin-border)" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>유저 티켓 현황</div>
              <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: 4 }}>
                {selectedUser ? `${selectedUser.userNickname} 님의 보유·구매·사용 내역` : "지급할 유저를 선택하면 표시됩니다."}
              </div>
            </div>

            {!selectedUser ? (
              <Empty>선택된 유저가 없습니다.</Empty>
            ) : summaryLoading ? (
              <Empty>불러오는 중…</Empty>
            ) : !summary ? (
              <Empty>현황을 불러오지 못했습니다.</Empty>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--admin-border)" }}>
                  <Stat label="현재 보유" value={summary.remainAmount} accent="var(--admin-blue)" />
                  <Stat label="누적 구매" value={summary.purchasedTotal} />
                  <Stat label="누적 사용" value={summary.usedTotal} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", maxHeight: 360 }}>
                  {summary.logs.length === 0 ? (
                    <Empty>티켓 내역이 없습니다.</Empty>
                  ) : (
                    summary.logs.map((l, i) => {
                      const meta = LOG_META[l.type];
                      return (
                        <div
                          key={l.logId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 8,
                            padding: "11px 22px",
                            borderTop: i ? "1px solid var(--admin-border)" : "none",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                              {meta.label}
                              <span style={{ color: "var(--admin-ink-3)", fontWeight: 400 }}> · {l.productName}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 2 }}>{fmtDate(l.createdAt)}</div>
                          </div>
                          <span style={{ fontWeight: 700, color: meta.color, fontVariantNumeric: "tabular-nums" }}>
                            {meta.sign}{l.amount}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {tab === "pay" && (
          /* 결제내역 */
        <div style={{ ...adminCardStyle, padding: 0, marginTop: 0 }}>
          <div
            className="zg-pay-toolbar"
            style={{
              padding: "18px 22px",
              borderBottom: "1px solid var(--admin-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>티켓 결제내역</div>
              <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: 4 }}>
                인앱 구매(PURCHASE) 기준 · 총 {totalElements.toLocaleString()}건
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={purchaseQuery}
                onChange={(e) => setPurchaseQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadPurchases(0, purchaseQuery)}
                placeholder="닉네임 검색"
                style={{ ...inputStyle, width: 200 }}
              />
              <button
                onClick={() => loadPurchases(0, purchaseQuery)}
                disabled={loadingPurchases}
                style={{ ...btnSecondary, height: 40, whiteSpace: "nowrap" }}
              >
                {loadingPurchases ? "검색…" : "검색"}
              </button>
            </div>
          </div>

          {/* header */}
          <div
            className="zg-pay-head"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 90px 150px",
              gap: 10,
              padding: "10px 22px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--admin-ink-3)",
              borderBottom: "1px solid var(--admin-border)",
            }}
          >
            <span>유저</span>
            <span>상품</span>
            <span style={{ textAlign: "right" }}>구매 매수</span>
            <span style={{ textAlign: "right" }}>결제일시</span>
          </div>

          {loadingPurchases ? (
            <Empty>불러오는 중…</Empty>
          ) : purchases.length === 0 ? (
            <Empty>결제내역이 없습니다.</Empty>
          ) : (
            purchases.map((p, i) => (
              <React.Fragment key={p.logId}>
                {/* 데스크탑: grid 행 */}
                <div
                  className="zg-pay-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 90px 150px",
                    gap: 10,
                    padding: "12px 22px",
                    borderTop: i ? "1px solid var(--admin-border)" : "none",
                    fontSize: 12.5,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <UserAvatar url={p.profileImageUrl} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.nickname ?? "-"}</div>
                      {p.userName && <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>{p.userName}</div>}
                    </div>
                  </div>
                  <span style={{ color: "var(--admin-ink-2)" }}>{p.productName}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: "var(--admin-blue)", fontVariantNumeric: "tabular-nums" }}>
                    {p.amount}
                  </span>
                  <span style={{ textAlign: "right", color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtDate(p.createdAt)}
                  </span>
                </div>

                {/* 모바일: 카드형 행 */}
                <div
                  className="zg-pay-card"
                  style={{
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 12,
                    padding: "13px 16px",
                    borderTop: i ? "1px solid var(--admin-border)" : "none",
                    alignItems: "center",
                  }}
                >
                  <UserAvatar url={p.profileImageUrl} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nickname ?? "-"}</div>
                    {p.userName && <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 1 }}>{p.userName}</div>}
                    <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 2 }}>{p.productName}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 700, color: "var(--admin-blue)", fontVariantNumeric: "tabular-nums" }}>{p.amount}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "var(--admin-ink-3)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                      {fmtDate(p.createdAt).slice(5)}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            ))
          )}

          {/* pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              loading={loadingPurchases}
              onGo={(p) => loadPurchases(p, purchaseQuery)}
            />
          )}
        </div>
        )}
      </PageShell>
    </AdminShell>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-2)", marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const Stat: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ background: "#fff", padding: "16px 18px", textAlign: "center" }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: accent ?? "var(--admin-ink)", fontVariantNumeric: "tabular-nums" }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: "var(--admin-ink-3)", marginTop: 2 }}>{label}</div>
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>{children}</div>
);

const Banner: React.FC<{ tone: "error" | "good"; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    style={{
      marginTop: 8,
      padding: "10px 12px",
      borderRadius: 8,
      background: tone === "error" ? "#ffeaea" : "var(--admin-good-tint)",
      color: tone === "error" ? "#cc3333" : "#1f8a52",
      fontSize: 12,
    }}
  >
    {children}
  </div>
);

export default TicketPage;
