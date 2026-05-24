"use client";

import React, { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary, inputStyle } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  searchUsersByNickname,
  grantTickets,
  UserSearchResult,
} from "@/apis/ticket";

const REASON_OPTIONS = [
  "결제 오류 보상",
  "이벤트 보상",
  "오디션 재지원",
  "기타",
];

interface RecentGrant {
  date: string;
  user: string;
  amount: number;
  reason: string;
}

const TicketPage: React.FC = () => {
  const ready = useAdminAuthGuard();

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
  const [recent, setRecent] = useState<RecentGrant[]>([]);

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
      setRecent((prev) =>
        [
          {
            date: new Date().toISOString().replace("T", " ").slice(0, 16),
            user: selectedUser.userNickname,
            amount,
            reason,
          },
          ...prev,
        ].slice(0, 10),
      );
      setSelectedUser(null);
      setSearchResults([]);
      setSearchNickname("");
      setAmount(1);
      setMemo("");
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
        eyebrow="티켓 수동 지급"
        title="유저에게 티켓 직접 지급"
        subtitle="결제 오류·이벤트 보상 등의 경우 닉네임으로 티켓을 지급합니다."
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* New grant */}
          <div style={{ ...adminCardStyle, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>새 지급</div>

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
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: u.profileImageUrl ? "transparent" : "#e8e8ee",
                          overflow: "hidden",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          color: "var(--admin-ink-2)",
                        }}
                      >
                        {u.profileImageUrl ? (
                          <img
                            src={u.profileImageUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          "?"
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {u.userNickname}
                        </div>
                        {u.userName && (
                          <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
                            {u.userName}
                          </div>
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
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#e8e8ee",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {selectedUser.profileImageUrl ? (
                      <img
                        src={selectedUser.profileImageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      "?"
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {selectedUser.userNickname}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
                      ID #{selectedUser.userId}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    style={{ fontSize: 12, color: "var(--admin-ink-2)" }}
                  >
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

            {error && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#ffeaea",
                  color: "#cc3333",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--admin-good-tint)",
                  color: "#1f8a52",
                  fontSize: 12,
                }}
              >
                {success}
              </div>
            )}

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

          {/* Recent grants (session-local) */}
          <div style={{ ...adminCardStyle, padding: 0 }}>
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid var(--admin-border)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>이번 세션 지급 내역</div>
              <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: 4 }}>
                현재 브라우저에서 발생한 지급만 표시됩니다.
              </div>
            </div>
            {recent.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--admin-ink-3)",
                  fontSize: 13,
                }}
              >
                아직 지급 내역이 없습니다.
              </div>
            ) : (
              recent.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr 50px 1fr",
                    gap: 10,
                    padding: "12px 22px",
                    borderTop: i ? "1px solid var(--admin-border)" : "none",
                    fontSize: 12,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {t.date}
                  </span>
                  <span style={{ fontWeight: 600 }}>{t.user}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--admin-blue)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    +{t.amount}
                  </span>
                  <span style={{ color: "var(--admin-ink-2)" }}>{t.reason}</span>
                </div>
              ))
            )}
          </div>
        </div>
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

export default TicketPage;
