import React from "react";

interface PageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}

const PageShell: React.FC<PageShellProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  maxWidth = 1320,
}) => (
  <div style={{ padding: "28px 32px 60px", maxWidth, margin: "0 auto" }}>
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 12,
              color: "var(--admin-ink-3)",
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: "8px 0 0",
            letterSpacing: -0.6,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: "var(--admin-ink-2)",
              margin: "6px 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export default PageShell;

export const adminCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--admin-border)",
  borderRadius: 14,
};

export const btnPrimary: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  borderRadius: 10,
  background: "var(--admin-blue)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const btnSecondary: React.CSSProperties = {
  height: 38,
  padding: "0 14px",
  borderRadius: 10,
  background: "#fff",
  border: "1px solid var(--admin-border)",
  color: "var(--admin-ink)",
  fontWeight: 600,
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const inputStyle: React.CSSProperties = {
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
