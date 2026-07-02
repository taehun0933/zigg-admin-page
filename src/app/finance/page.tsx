"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, {
  adminCardStyle,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import AdminIcon from "@/components/admin/AdminIcon";
import { Pagination, useMediaQuery } from "@mui/material";
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  EXPENSE_CATEGORIES,
  FinanceSource,
  FinanceSummary,
  FinanceTransaction,
  FinanceType,
  getFinanceSummary,
  getFinanceTransactions,
  Page,
  SOURCE_LABEL,
} from "@/apis/finance";
import { formatUsd, formatWon, formatWonSigned } from "@/utils/finance";

/* ───────────────────────── 색상 토큰 (red 계열은 globals.css 신규) ───────────────────────── */
const RED = "#e0322a";
const RED_BAR = "#ff3b30";
const RED_TINT = "var(--admin-red-tint)";
const BLUE = "var(--admin-blue)";
const BLUE_TINT = "var(--admin-blue-tint)";

const SOURCE_CHIP: Record<FinanceSource, { bg: string; fg: string }> = {
  GOOGLE_PLAY: { bg: "#eaf5ec", fg: "#1f8a52" },
  APP_STORE: { bg: "#eef0f3", fg: "#3a3a42" },
  AWS: { bg: "var(--admin-warn-tint)", fg: "#b5710a" },
  MANUAL: { bg: BLUE_TINT, fg: "#0a63cc" },
};

const todayYmd = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

type Filter = FinanceType | "ALL";

const FinancePage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(0); // 0-base
  const [pageData, setPageData] = useState<Page<FinanceTransaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<FinanceTransaction | null>(null);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2200);
  };

  const fetchSummary = useCallback(async () => {
    const s = await getFinanceSummary();
    if (s) setSummary(s);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await getFinanceTransactions({
      type: filter === "ALL" ? undefined : filter,
      page,
    });
    if (data) {
      setPageData(data);
    } else {
      setError("거래 목록을 불러오지 못했어요.");
      setPageData(null);
    }
    setLoading(false);
  }, [filter, page]);

  useEffect(() => {
    if (!ready) return;
    fetchSummary();
  }, [ready, fetchSummary]);

  useEffect(() => {
    if (!ready) return;
    fetchTransactions();
  }, [ready, fetchTransactions]);

  // 필터 변경 시 0페이지로 리셋
  useEffect(() => {
    setPage(0);
  }, [filter]);

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchTransactions()]);
  }, [fetchSummary, fetchTransactions]);

  const handleCreated = async () => {
    setAddOpen(false);
    await refetchAll();
    flash("거래를 등록했어요.");
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteFinanceTransaction(delTarget.id);
      setDelTarget(null);
      // 마지막 한 건 삭제로 현재 페이지가 비면 한 페이지 앞으로
      if (pageData && pageData.content.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        await refetchAll();
      }
      flash("거래를 삭제했어요.");
    } catch {
      flash("삭제에 실패했어요.");
    }
  };

  const total = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="정산 · 비용 관리"
        title="회계 원장"
        subtitle="수익(구글·애플 정산)과 지출(AWS·기타)을 하나의 원장으로 관리합니다. · 기준 통화 원화(KRW)"
        action={
          <button style={btnPrimary} onClick={() => setAddOpen(true)}>
            ＋ 비용 / 수익 추가
          </button>
        }
      >
        {/* (A) 요약 카드 3장 */}
        <div
          className="zg-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <SummaryCard
            label="총수익"
            tone="blue"
            value={summary ? formatWon(summary.totalRevenue) : "—"}
            sub="구글·애플 정산 + 수동 등록"
          />
          <SummaryCard
            label="총지출"
            tone="red"
            value={summary ? formatWon(summary.totalExpense) : "—"}
            sub="AWS·기타 비용"
          />
          <SummaryCard
            label="현재 잔액"
            big
            tone={summary && summary.balance < 0 ? "warn" : "ink"}
            value={
              summary
                ? (summary.balance < 0 ? "−" : "") +
                  formatWon(Math.abs(summary.balance))
                : "—"
            }
            sub={
              summary
                ? `초기 잔액 ${formatWon(summary.initialBalance)} 포함 · 총수익 − 총지출`
                : "총수익 − 총지출"
            }
          />
        </div>

        {/* (B) 필터 탭 + 건수 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 3,
              background: "#f3f3f6",
              borderRadius: 9,
            }}
          >
            {(
              [
                { id: "ALL", label: "전체" },
                { id: "REVENUE", label: "수익" },
                { id: "EXPENSE", label: "지출" },
              ] as { id: Filter; label: string }[]
            ).map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  style={{
                    height: 32,
                    padding: "0 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
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
          <span
            style={{
              fontSize: 12,
              color: "var(--admin-ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            총 {total.toLocaleString("ko-KR")}건
            {totalPages > 1 ? ` · ${totalPages}페이지` : ""}
          </span>
        </div>

        {/* (C) 거래 테이블 (모바일에서는 카드형) */}
        <div
          className={isMobile ? undefined : "zg-table-scroll"}
          style={{ ...adminCardStyle, overflow: "hidden" }}
        >
          <div
            className={isMobile ? undefined : "zg-table-inner"}
            style={isMobile ? undefined : { minWidth: 760 }}
          >
            {/* 헤더 (데스크톱만) */}
            {!isMobile && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 72px 104px 92px 168px 1fr 44px",
                  gap: 12,
                  padding: "14px 22px",
                  background: "#fafbfc",
                  borderBottom: "1px solid var(--admin-border)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--admin-ink-3)",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                <span>거래일</span>
                <span>구분</span>
                <span>출처</span>
                <span>분류</span>
                <span style={{ textAlign: "right" }}>금액</span>
                <span>메모</span>
                <span />
              </div>
            )}

            {loading && (
              <div style={emptyStyle}>불러오는 중…</div>
            )}
            {!loading && error && (
              <div style={{ ...emptyStyle, color: "#cc3333" }}>{error}</div>
            )}
            {!loading && !error && pageData && pageData.content.length === 0 && (
              <div style={emptyStyle}>표시할 거래가 없습니다.</div>
            )}

            {!loading &&
              !error &&
              pageData?.content.map((t, i) =>
                isMobile ? (
                  <TxnCard
                    key={t.id}
                    txn={t}
                    first={i === 0}
                    onDelete={() => setDelTarget(t)}
                  />
                ) : (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    first={i === 0}
                    onDelete={() => setDelTarget(t)}
                  />
                )
              )}
          </div>
        </div>

        {/* (D) 페이지네이션 (0-base ↔ MUI 1-base) */}
        {!loading && !error && pageData && totalPages > 1 && (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 22 }}
          >
            <Pagination
              count={totalPages}
              page={pageData.number + 1}
              onChange={(_e, v) => setPage(v - 1)}
              showFirstButton
              showLastButton
            />
          </div>
        )}
      </PageShell>

      {/* (E) 수동 등록 모달 */}
      {addOpen && (
        <AddTransactionModal
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {/* (F) 삭제 확인 다이얼로그 */}
      {delTarget && (
        <DeleteDialog
          txn={delTarget}
          onCancel={() => setDelTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: 999,
            background: "#1a1a1f",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,.22)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--admin-good)",
            }}
          />
          {toast}
        </div>
      )}
    </AdminShell>
  );
};

/* ───────────────────────── 요약 카드 ───────────────────────── */
const SummaryCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  tone: "blue" | "red" | "warn" | "ink";
  big?: boolean;
}> = ({ label, value, sub, tone, big }) => {
  const accent =
    tone === "blue"
      ? BLUE
      : tone === "red"
      ? RED
      : tone === "warn"
      ? "#cc7a00"
      : "var(--admin-ink)";
  const bar =
    tone === "blue"
      ? BLUE
      : tone === "red"
      ? RED_BAR
      : tone === "warn"
      ? "#cc7a00"
      : "var(--admin-ink-3)";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--admin-border)",
        borderRadius: 14,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          background: bar,
        }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--admin-ink-2)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 800,
          letterSpacing: -1,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color: accent,
          fontSize: big ? "clamp(22px,2.1vw,32px)" : "clamp(20px,1.9vw,28px)",
        }}
      >
        {value}
      </div>
      <div
        style={{ fontSize: 11.5, color: "var(--admin-ink-3)", marginTop: 8 }}
      >
        {sub}
      </div>
    </div>
  );
};

/* ───────────────────────── 거래 행 ───────────────────────── */
const TxnRow: React.FC<{
  txn: FinanceTransaction;
  first: boolean;
  onDelete: () => void;
}> = ({ txn, first, onDelete }) => {
  const isRevenue = txn.type === "REVENUE";
  const srcChip = SOURCE_CHIP[txn.source];
  const showFx =
    txn.source !== "MANUAL" &&
    txn.originalCurrency === "USD" &&
    txn.originalAmount != null &&
    txn.exchangeRate != null;
  const fxText = showFx
    ? `(${formatUsd(txn.originalAmount as number)} × ₩${(txn.exchangeRate as number).toLocaleString("ko-KR")})`
    : "";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 72px 104px 92px 168px 1fr 44px",
        gap: 12,
        padding: "14px 22px",
        alignItems: "center",
        borderTop: first ? "none" : "1px solid var(--admin-border)",
        background: "#fff",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbfc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      {/* 거래일 */}
      <span
        style={{
          fontSize: 12.5,
          color: "var(--admin-ink-2)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {txn.transactionDate}
      </span>

      {/* 구분 칩 */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 23,
          padding: "0 9px",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
          width: "fit-content",
          background: isRevenue ? BLUE_TINT : RED_TINT,
          color: isRevenue ? BLUE : RED,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isRevenue ? BLUE : RED_BAR,
          }}
        />
        {isRevenue ? "수익" : "지출"}
      </span>

      {/* 출처 칩 */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 23,
          padding: "0 9px",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
          width: "fit-content",
          background: srcChip.bg,
          color: srcChip.fg,
        }}
      >
        {SOURCE_LABEL[txn.source]}
      </span>

      {/* 분류 */}
      <span
        style={{
          fontSize: 13,
          color: txn.category ? "var(--admin-ink)" : "var(--admin-ink-3)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {txn.category ?? "—"}
      </span>

      {/* 금액 */}
      <span style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: isRevenue ? BLUE : RED,
            whiteSpace: "nowrap",
          }}
        >
          {formatWonSigned(txn.type, txn.amountKrw)}
        </span>
        {showFx && (
          <div
            title={fxText}
            style={{
              fontSize: 11,
              color: "var(--admin-ink-3)",
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fxText}
          </div>
        )}
      </span>

      {/* 메모 */}
      <span
        title={txn.description ?? undefined}
        style={{
          fontSize: 13,
          color: txn.description ? "var(--admin-ink-2)" : "var(--admin-ink-3)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {txn.description ?? "—"}
      </span>

      {/* 삭제 */}
      <span style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onDelete}
          title="삭제"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "transparent",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = RED_TINT)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <AdminIcon name="trashcan" size={16} opacity={0.7} />
        </button>
      </span>
    </div>
  );
};

/* ───────────────────────── 거래 카드 (모바일) ───────────────────────── */
const TxnCard: React.FC<{
  txn: FinanceTransaction;
  first: boolean;
  onDelete: () => void;
}> = ({ txn, first, onDelete }) => {
  const isRevenue = txn.type === "REVENUE";
  const srcChip = SOURCE_CHIP[txn.source];
  const showFx =
    txn.source !== "MANUAL" &&
    txn.originalCurrency === "USD" &&
    txn.originalAmount != null &&
    txn.exchangeRate != null;
  const fxText = showFx
    ? `(${formatUsd(txn.originalAmount as number)} × ₩${(txn.exchangeRate as number).toLocaleString("ko-KR")})`
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        borderTop: first ? "none" : "1px solid var(--admin-border)",
        background: "#fff",
      }}
    >
      {/* 상단: 칩들 + 삭제 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* 구분 칩 */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 23,
              padding: "0 9px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: isRevenue ? BLUE_TINT : RED_TINT,
              color: isRevenue ? BLUE : RED,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isRevenue ? BLUE : RED_BAR,
              }}
            />
            {isRevenue ? "수익" : "지출"}
          </span>
          {/* 출처 칩 */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 23,
              padding: "0 9px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: srcChip.bg,
              color: srcChip.fg,
            }}
          >
            {SOURCE_LABEL[txn.source]}
          </span>
        </div>
        <button
          onClick={onDelete}
          title="삭제"
          style={{
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "transparent",
          }}
        >
          <AdminIcon name="trashcan" size={16} opacity={0.7} />
        </button>
      </div>

      {/* 금액 */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.5,
            color: isRevenue ? BLUE : RED,
          }}
        >
          {formatWonSigned(txn.type, txn.amountKrw)}
        </span>
        {showFx && (
          <span
            style={{
              fontSize: 11,
              color: "var(--admin-ink-3)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fxText}
          </span>
        )}
      </div>

      {/* 하단: 거래일 · 분류 · 메모 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 12.5,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            color: "var(--admin-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>{txn.transactionDate}</span>
          {txn.category && (
            <>
              <span>·</span>
              <span style={{ color: "var(--admin-ink-2)" }}>{txn.category}</span>
            </>
          )}
        </div>
        {txn.description && (
          <div style={{ color: "var(--admin-ink-2)", lineHeight: 1.4 }}>
            {txn.description}
          </div>
        )}
      </div>
    </div>
  );
};

const emptyStyle: React.CSSProperties = {
  padding: 56,
  textAlign: "center",
  color: "var(--admin-ink-3)",
  fontSize: 13,
};

/* ───────────────────────── 수동 등록 모달 ───────────────────────── */
const AddTransactionModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const [type, setType] = useState<FinanceType>("EXPENSE");
  const [amount, setAmount] = useState(""); // 숫자만 보관
  const [transactionDate, setTransactionDate] = useState(todayYmd());
  const [cat, setCat] = useState<string>("마케팅");
  const [customCat, setCustomCat] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(amount.replace(/[^0-9]/g, ""));

  const submit = async () => {
    setErr(null);
    if (!amount || amountNum <= 0) {
      setErr("금액은 0보다 큰 숫자여야 합니다.");
      return;
    }
    if (!transactionDate) {
      setErr("거래일을 선택해주세요.");
      return;
    }
    const category =
      type === "EXPENSE"
        ? cat === "직접입력"
          ? customCat.trim() || null
          : cat
        : null;
    setSaving(true);
    try {
      await createFinanceTransaction({
        type,
        amount: amountNum,
        transactionDate,
        category,
        description: description.trim() || null,
      });
      onCreated();
    } catch {
      setErr("등록에 실패했어요. 다시 시도해주세요.");
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="zg-modal-card"
        style={{
          ["--zg-modal-w" as string]: "480px",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--admin-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            비용 / 수익 추가
          </h2>
          <button
            onClick={onClose}
            style={{ color: "var(--admin-ink-3)", fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* 구분 토글 */}
          <Field label="구분" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["REVENUE", "EXPENSE"] as FinanceType[]).map((t) => {
                const active = type === t;
                const isRev = t === "REVENUE";
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      height: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      border: `1.5px solid ${
                        active
                          ? isRev
                            ? BLUE
                            : RED_BAR
                          : "var(--admin-border)"
                      }`,
                      background: active
                        ? isRev
                          ? BLUE_TINT
                          : RED_TINT
                        : "#fff",
                      color: active
                        ? isRev
                          ? BLUE
                          : RED
                        : "var(--admin-ink-2)",
                    }}
                  >
                    {isRev ? "수익" : "지출"}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 금액 */}
          <Field label="금액 (KRW)" required>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--admin-ink-3)",
                  fontWeight: 600,
                }}
              >
                ₩
              </span>
              <input
                inputMode="numeric"
                value={amount ? amountNum.toLocaleString("ko-KR") : ""}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                style={{ ...modalInput, paddingLeft: 30, fontVariantNumeric: "tabular-nums" }}
              />
            </div>
          </Field>

          {/* 거래일 */}
          <Field label="거래일" required>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              style={modalInput}
            />
          </Field>

          {/* 분류 (지출일 때만) */}
          {type === "EXPENSE" && (
            <Field label="분류">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[...EXPENSE_CATEGORIES, "직접입력"].map((c) => {
                  const active = cat === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        border: `1px solid ${active ? BLUE : "var(--admin-border)"}`,
                        background: active ? BLUE_TINT : "#fff",
                        color: active ? BLUE : "var(--admin-ink-2)",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {cat === "직접입력" && (
                <input
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  placeholder="분류명 직접 입력"
                  style={{ ...modalInput, marginTop: 10 }}
                />
              )}
            </Field>
          )}

          {/* 메모 */}
          <Field label="메모">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="메모 (선택)"
              style={{
                ...modalInput,
                height: "auto",
                padding: 12,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </Field>

          {err && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: RED_TINT,
                color: RED,
                fontSize: 12.5,
              }}
            >
              {err}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--admin-border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button style={btnSecondary} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              ...btnPrimary,
              background: saving ? "#c4c4cc" : "var(--admin-blue)",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ───────────────────────── 삭제 확인 ───────────────────────── */
const DeleteDialog: React.FC<{
  txn: FinanceTransaction;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ txn, onCancel, onConfirm }) => {
  const [busy, setBusy] = useState(false);
  return (
    <Overlay onClose={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="zg-modal-card"
        style={{
          ["--zg-modal-w" as string]: "380px",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          padding: "28px 24px 22px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: RED_TINT,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 16px",
          }}
        >
          <AdminIcon name="trashcan_red" size={22} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>
          이 거래를 삭제할까요?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--admin-ink-2)",
            margin: "0 0 4px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {txn.transactionDate} · {SOURCE_LABEL[txn.source]} ·{" "}
          {formatWonSigned(txn.type, txn.amountKrw)}
          {txn.description ? ` · ${txn.description}` : ""}
        </p>
        <p style={{ fontSize: 12.5, color: "var(--admin-ink-3)", margin: "0 0 20px" }}>
          삭제 후에는 되돌릴 수 없습니다.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...btnSecondary, flex: 1 }}
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            onClick={() => {
              setBusy(true);
              onConfirm();
            }}
            disabled={busy}
            style={{
              ...btnPrimary,
              flex: 1,
              background: busy ? "#c4c4cc" : RED_BAR,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* ───────────────────────── 공통 ───────────────────────── */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(0,0,0,.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    {children}
  </div>
);

const Field: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div>
    <div
      style={{
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--admin-ink-2)",
        marginBottom: 8,
      }}
    >
      {label}
      {required && <span style={{ color: RED_BAR, marginLeft: 3 }}>*</span>}
    </div>
    {children}
  </div>
);

const modalInput: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};

export default FinancePage;
