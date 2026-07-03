"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, {
  adminCardStyle,
  btnPrimary,
  btnSecondary,
  inputStyle,
} from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  AdminFeedbackItem,
  AdminTerms,
  FeedbackItemCategory,
  createAdminFeedbackItem,
  createAdminTerms,
  deleteAdminFeedbackItem,
  deleteAdminTerms,
  getAdminFeedbackItems,
  getAdminTermsList,
  updateAdminFeedbackItem,
  updateAdminTerms,
} from "@/apis/asset";

const CATEGORIES: { key: FeedbackItemCategory; label: string }[] = [
  { key: "RAP", label: "랩" },
  { key: "VOCAL", label: "보컬" },
  { key: "DANCE", label: "댄스" },
];

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
};

type Tab = "terms" | "feedback";

/* ================= 약관 탭 ================= */

interface TermsFormState {
  termsId: number | null; // null이면 신규
  title: string;
  content: string;
  isRequired: boolean;
  displayOrder: number;
}

const emptyTermsForm = (order: number): TermsFormState => ({
  termsId: null,
  title: "",
  content: "",
  isRequired: true,
  displayOrder: order,
});

const TermsTab: React.FC = () => {
  const [terms, setTerms] = useState<AdminTerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TermsFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminTermsList()
      .then((list) => setTerms(list ?? []))
      .catch(() => setError("약관 목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.content.trim()) {
      alert("제목과 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      if (form.termsId === null) {
        await createAdminTerms({
          title: form.title.trim(),
          content: form.content,
          isRequired: form.isRequired,
          displayOrder: form.displayOrder,
        });
      } else {
        await updateAdminTerms(form.termsId, {
          title: form.title.trim(),
          content: form.content,
          isRequired: form.isRequired,
          displayOrder: form.displayOrder,
        });
      }
      setForm(null);
      load();
    } catch {
      alert("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: AdminTerms) => {
    if (!window.confirm(`'${t.title}' 약관을 삭제할까요?`)) return;
    try {
      await deleteAdminTerms(t.termsId);
      load();
    } catch {
      alert("삭제에 실패했어요.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {form && (
        <div style={{ ...adminCardStyle, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {form.termsId === null ? "새 약관 작성" : `약관 편집 #${form.termsId}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="약관 제목 (예: 이용 약관)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              style={{
                ...inputStyle,
                height: 320,
                padding: 12,
                resize: "vertical",
                lineHeight: 1.6,
                fontFamily: "inherit",
              }}
              placeholder={"약관 본문을 입력하세요.\n\n제1조 목적\n..."}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                />
                필수 동의 항목
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                노출 순서
                <input
                  type="number"
                  style={{ ...inputStyle, width: 80, height: 34 }}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setForm(null)} disabled={saving}>
                취소
              </button>
              <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!form && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            style={btnPrimary}
            onClick={() => setForm(emptyTermsForm(terms.length + 1))}
          >
            + 새 약관 작성
          </button>
        </div>
      )}

      <div className="zg-table-scroll" style={{ ...adminCardStyle }}>
        <div className="zg-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 90px 90px 110px 110px",
              padding: "12px 22px",
              borderBottom: "1px solid var(--admin-border)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--admin-ink-3)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span>순서</span>
            <span>제목</span>
            <span>필수 여부</span>
            <span>수정일</span>
            <span />
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
          {!loading && !error && terms.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              등록된 약관이 없습니다. 새 약관을 작성해 보세요.
            </div>
          )}

          {!loading &&
            !error &&
            terms.map((t, i) => (
              <div
                key={t.termsId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr 90px 90px 110px 110px",
                  padding: "14px 22px",
                  borderTop: i ? "1px solid var(--admin-border)" : "none",
                  alignItems: "center",
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--admin-ink-2)" }}>
                  {t.displayOrder}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--admin-ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setForm({
                      termsId: t.termsId,
                      title: t.title,
                      content: t.content,
                      isRequired: t.isRequired,
                      displayOrder: t.displayOrder,
                    })
                  }
                  title="클릭해서 편집"
                >
                  {t.title}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.isRequired ? "var(--admin-blue)" : "var(--admin-ink-3)",
                  }}
                >
                  {t.isRequired ? "필수" : "선택"}
                </span>
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  {formatDate(t.updatedAt)}
                </span>
                <span />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    onClick={() =>
                      setForm({
                        termsId: t.termsId,
                        title: t.title,
                        content: t.content,
                        isRequired: t.isRequired,
                        displayOrder: t.displayOrder,
                      })
                    }
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-blue)" }}
                  >
                    편집
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    style={{ fontSize: 12, fontWeight: 600, color: "#cc3333" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/* ================= 피드백 항목 탭 ================= */

const FeedbackTab: React.FC = () => {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNames, setNewNames] = useState<Record<FeedbackItemCategory, string>>({
    RAP: "",
    VOCAL: "",
    DANCE: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminFeedbackItems()
      .then((list) => setItems(list ?? []))
      .catch(() => setError("피드백 항목을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (category: FeedbackItemCategory) => {
    const name = newNames[category].trim();
    if (!name) return;
    try {
      const count = items.filter((it) => it.category === category).length;
      await createAdminFeedbackItem({ category, name, displayOrder: count + 1 });
      setNewNames((prev) => ({ ...prev, [category]: "" }));
      load();
    } catch {
      alert("항목 추가에 실패했어요.");
    }
  };

  const handleRename = async (item: AdminFeedbackItem) => {
    const name = editingName.trim();
    if (!name || name === item.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateAdminFeedbackItem(item.feedbackItemId, { name });
      setEditingId(null);
      load();
    } catch {
      alert("항목 수정에 실패했어요.");
    }
  };

  const handleDelete = async (item: AdminFeedbackItem) => {
    if (!window.confirm(`'${item.name}' 항목을 삭제할까요?`)) return;
    try {
      await deleteAdminFeedbackItem(item.feedbackItemId);
      load();
    } catch {
      alert("항목 삭제에 실패했어요.");
    }
  };

  if (loading)
    return (
      <div style={{ ...adminCardStyle, padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  if (error)
    return (
      <div style={{ ...adminCardStyle, padding: 40, textAlign: "center", color: "#cc3333", fontSize: 13 }}>
        {error}
      </div>
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
        alignItems: "start",
      }}
    >
      {CATEGORIES.map(({ key, label }) => {
        const categoryItems = items.filter((it) => it.category === key);
        return (
          <div key={key} style={{ ...adminCardStyle, padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: 12, color: "var(--admin-ink-3)", fontVariantNumeric: "tabular-nums" }}>
                {categoryItems.length}개
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {categoryItems.length === 0 && (
                <div style={{ padding: "16px 0", fontSize: 13, color: "var(--admin-ink-3)", textAlign: "center" }}>
                  등록된 항목이 없습니다.
                </div>
              )}
              {categoryItems.map((item, i) => (
                <div
                  key={item.feedbackItemId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 2px",
                    borderTop: i ? "1px solid var(--admin-border)" : "none",
                    fontSize: 13,
                  }}
                >
                  {editingId === item.feedbackItemId ? (
                    <>
                      <input
                        style={{ ...inputStyle, height: 32, fontSize: 13 }}
                        value={editingName}
                        autoFocus
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(item);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => handleRename(item)}
                        style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-blue)", flexShrink: 0 }}
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-ink-3)", flexShrink: 0 }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: 500, color: "var(--admin-ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(item.feedbackItemId);
                          setEditingName(item.name);
                        }}
                        style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-blue)", flexShrink: 0 }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        style={{ fontSize: 12, fontWeight: 600, color: "#cc3333", flexShrink: 0 }}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                style={{ ...inputStyle, height: 36, fontSize: 13 }}
                placeholder="새 항목 이름"
                value={newNames[key]}
                onChange={(e) => setNewNames((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd(key)}
              />
              <button
                style={{ ...btnSecondary, height: 36, flexShrink: 0 }}
                onClick={() => handleAdd(key)}
              >
                추가
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ================= 페이지 ================= */

const AssetPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const [tab, setTab] = useState<Tab>("terms");

  if (!ready) return null;

  const tabButton = (key: Tab, label: string): React.CSSProperties => ({
    height: 36,
    padding: "0 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    background: tab === key ? "var(--admin-blue)" : "#fff",
    color: tab === key ? "#fff" : "var(--admin-ink-2)",
    border: tab === key ? "none" : "1px solid var(--admin-border)",
  });

  return (
    <AdminShell>
      <PageShell
        eyebrow="자산관리"
        title="약관 · 피드백 항목 관리"
        subtitle="앱에서 사용하는 약관과 카테고리별(랩/보컬/댄스) 피드백 항목을 관리합니다."
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button style={tabButton("terms", "약관")} onClick={() => setTab("terms")}>
            약관
          </button>
          <button style={tabButton("feedback", "피드백 항목")} onClick={() => setTab("feedback")}>
            피드백 항목
          </button>
        </div>

        {tab === "terms" ? <TermsTab /> : <FeedbackTab />}
      </PageShell>
    </AdminShell>
  );
};

export default AssetPage;
