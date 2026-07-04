"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      const body = {
        title: form.title.trim(),
        content: form.content,
        isRequired: form.isRequired,
        displayOrder: form.displayOrder,
      };
      if (form.termsId === null) {
        const created = await createAdminTerms(body);
        setTerms((prev) =>
          [...prev, created].sort((a, b) => a.displayOrder - b.displayOrder)
        );
      } else {
        const updated = await updateAdminTerms(form.termsId, body);
        setTerms((prev) =>
          prev
            .map((t) => (t.termsId === updated.termsId ? updated : t))
            .sort((a, b) => a.displayOrder - b.displayOrder)
        );
      }
      setForm(null);
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
      setTerms((prev) => prev.filter((it) => it.termsId !== t.termsId));
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

/* 카테고리별 절제된 액센트 — 동일 채도 0.14 / 명도 0.62, hue만 변경 (oklch) */
const FB_ACCENTS: Record<FeedbackItemCategory, { accent: string; tint: string }> = {
  RAP: { accent: "oklch(0.62 0.14 258)", tint: "oklch(0.62 0.14 258 / 0.09)" },
  VOCAL: { accent: "oklch(0.62 0.14 320)", tint: "oklch(0.62 0.14 320 / 0.09)" },
  DANCE: { accent: "oklch(0.62 0.14 175)", tint: "oklch(0.62 0.14 175 / 0.09)" },
};

/* 좁은 화면(≤640px) 또는 hover 없는 터치 환경 — 액션을 항상 노출 */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px), (hover: none)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/* ---- 아이콘 (24 viewBox, stroke 2, round cap/join) ---- */
const FbIcon: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const PencilIcon = () => (
  <FbIcon>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </FbIcon>
);
const TrashIcon = () => (
  <FbIcon>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </FbIcon>
);
const CheckIcon = () => (
  <FbIcon>
    <path d="M20 6 9 17l-5-5" />
  </FbIcon>
);
const CloseIcon = () => (
  <FbIcon>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </FbIcon>
);
const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <FbIcon size={size}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </FbIcon>
);
const GripIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
    <circle cx={9} cy={6} r={1.6} />
    <circle cx={15} cy={6} r={1.6} />
    <circle cx={9} cy={12} r={1.6} />
    <circle cx={15} cy={12} r={1.6} />
    <circle cx={9} cy={18} r={1.6} />
    <circle cx={15} cy={18} r={1.6} />
  </svg>
);

/* ---- 아이콘 버튼 (기본 무채색, hover 시에만 색 노출) ---- */
type IconTone = "default" | "danger" | "accent";

const FbIconBtn: React.FC<{
  label: string;
  tone?: IconTone;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, tone = "default", accent, onClick, children }) => {
  const [h, setH] = useState(false);
  let color = "var(--admin-ink-3)";
  let background = "transparent";
  if (h) {
    if (tone === "danger") {
      color = "var(--admin-red-ink)";
      background = "var(--admin-red-tint)";
    } else if (tone === "accent") {
      color = accent ?? "var(--admin-ink)";
      background = "#fff";
    } else {
      color = "var(--admin-ink)";
      background = "#fff";
    }
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        background,
        boxShadow: h ? "0 1px 2px rgba(17,17,26,.08)" : "none",
        transition: "all .12s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
};

/* ---- 개별 항목 행 (평상시 이름만, hover/좁은 화면에서 액션 노출) ---- */
const FbItemRow: React.FC<{
  item: AdminFeedbackItem;
  accent: string;
  narrow: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (name: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ item, accent, narrow, editing, onStartEdit, onCommit, onCancel, onDelete }) => {
  const [hover, setHover] = useState(false);
  const [val, setVal] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const show = hover || narrow;

  useEffect(() => {
    if (editing) {
      setVal(item.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, item.name]);

  if (editing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px",
          borderRadius: 10,
          background: "var(--admin-bg)",
          boxShadow: `inset 0 0 0 1.5px ${accent}`,
        }}
      >
        <input
          ref={inputRef}
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit(val);
            if (e.key === "Escape") onCancel();
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: 32,
            border: 0,
            background: "transparent",
            fontSize: 14,
            fontWeight: 500,
            outline: "none",
            color: "var(--admin-ink)",
            padding: "0 2px",
          }}
        />
        <FbIconBtn label="저장" tone="accent" accent={accent} onClick={() => onCommit(val)}>
          <CheckIcon />
        </FbIconBtn>
        <FbIconBtn label="취소" onClick={onCancel}>
          <CloseIcon />
        </FbIconBtn>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={onStartEdit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 8px",
        borderRadius: 10,
        background: hover ? "var(--admin-bg)" : "transparent",
        transition: "background .12s",
        cursor: "default",
      }}
    >
      <span
        style={{
          width: 14,
          color: "var(--admin-ink-3)",
          opacity: hover && !narrow ? 1 : 0,
          transition: "opacity .12s",
          cursor: "grab",
          flexShrink: 0,
          display: narrow ? "none" : "flex",
        }}
      >
        <GripIcon />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--admin-ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.name}
      </span>
      <div style={{ display: "flex", gap: 2, opacity: show ? 1 : 0, transition: "opacity .12s", flexShrink: 0 }}>
        <FbIconBtn label="수정" onClick={onStartEdit}>
          <PencilIcon />
        </FbIconBtn>
        <FbIconBtn label="삭제" tone="danger" onClick={onDelete}>
          <TrashIcon />
        </FbIconBtn>
      </div>
    </div>
  );
};

/* ---- 카테고리 카드 ---- */
const FbCategoryCard: React.FC<{
  categoryKey: FeedbackItemCategory;
  label: string;
  items: AdminFeedbackItem[];
  narrow: boolean;
  onAdd: (name: string) => void;
  onRename: (item: AdminFeedbackItem, name: string) => void;
  onDelete: (item: AdminFeedbackItem) => void;
}> = ({ categoryKey, label, items, narrow, onAdd, onRename, onDelete }) => {
  const { accent, tint } = FB_ACCENTS[categoryKey];
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const n = draft.trim();
    if (!n) return;
    onAdd(n);
    setDraft("");
  };

  return (
    <div style={{ ...adminCardStyle, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 14px" }}>
        <span style={{ width: 5, height: 18, borderRadius: 3, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>{label}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 700,
            color: accent,
            background: tint,
            padding: "3px 9px",
            borderRadius: 999,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {items.length}
        </span>
      </div>
      <div style={{ height: 1, background: "var(--admin-border)" }} />

      {/* 목록 */}
      <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 1, minHeight: 60 }}>
        {items.length === 0 && (
          <div style={{ padding: "22px 0", fontSize: 13, color: "var(--admin-ink-3)", textAlign: "center" }}>
            등록된 항목이 없습니다.
          </div>
        )}
        {items.map((item) => (
          <FbItemRow
            key={item.feedbackItemId}
            item={item}
            accent={accent}
            narrow={narrow}
            editing={editingId === item.feedbackItemId}
            onStartEdit={() => setEditingId(item.feedbackItemId)}
            onCommit={(name) => {
              onRename(item, name);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
            onDelete={() => onDelete(item)}
          />
        ))}
      </div>

      {/* 추가 */}
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--admin-border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 42,
            padding: "0 6px 0 12px",
            borderRadius: 11,
            background: "var(--admin-bg)",
            boxShadow: focused ? `inset 0 0 0 1.5px ${accent}` : "inset 0 0 0 1px var(--admin-border)",
            transition: "box-shadow .12s",
          }}
        >
          <span style={{ color: focused ? accent : "var(--admin-ink-3)", display: "flex", flexShrink: 0, transition: "color .12s" }}>
            <PlusIcon size={16} />
          </span>
          <input
            value={draft}
            placeholder="새 항목 추가"
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              border: 0,
              background: "transparent",
              fontSize: 14,
              outline: "none",
              color: "var(--admin-ink)",
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              height: 30,
              padding: "0 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              transition: "all .12s",
              background: draft.trim() ? accent : "transparent",
              color: draft.trim() ? "#fff" : "var(--admin-ink-3)",
              cursor: draft.trim() ? "pointer" : "default",
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedbackTab: React.FC = () => {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const narrow = useNarrow();

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

  const handleAdd = async (category: FeedbackItemCategory, rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    try {
      const count = items.filter((it) => it.category === category).length;
      const created = await createAdminFeedbackItem({ category, name, displayOrder: count + 1 });
      setItems((prev) => [...prev, created]);
    } catch {
      alert("항목 추가에 실패했어요.");
    }
  };

  const handleRename = async (item: AdminFeedbackItem, rawName: string) => {
    const name = rawName.trim();
    if (!name || name === item.name) return;
    try {
      const updated = await updateAdminFeedbackItem(item.feedbackItemId, { name });
      setItems((prev) =>
        prev.map((it) => (it.feedbackItemId === item.feedbackItemId ? updated : it))
      );
    } catch {
      alert("항목 수정에 실패했어요.");
    }
  };

  const handleDelete = async (item: AdminFeedbackItem) => {
    if (!window.confirm(`'${item.name}' 항목을 삭제할까요?`)) return;
    try {
      await deleteAdminFeedbackItem(item.feedbackItemId);
      setItems((prev) => prev.filter((it) => it.feedbackItemId !== item.feedbackItemId));
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          fontSize: 12.5,
          color: "var(--admin-ink-3)",
          flexWrap: "wrap",
        }}
      >
        <span>총 {items.length}개 항목</span>
        <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--admin-ink-3)", flexShrink: 0 }} />
        <span>
          {narrow ? "항목을 더블탭하면 바로 편집" : "항목 위에 마우스를 올리면 수정·삭제 · 더블클릭으로 바로 편집"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {CATEGORIES.map(({ key, label }) => (
          <FbCategoryCard
            key={key}
            categoryKey={key}
            label={label}
            narrow={narrow}
            items={items.filter((it) => it.category === key)}
            onAdd={(name) => handleAdd(key, name)}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
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
