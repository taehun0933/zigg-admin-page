import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZIGG Admin",
  description: "ZIGG X Godition 관리자 페이지",
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 브라우저 자동번역이 텍스트 노드를 <font>로 감싸 React removeChild 크래시를
  // 일으킴 — lang="ko"만으론 번역기 강제 실행을 못 막아 translate="no"로 차단
  return (
    <html lang="ko" translate="no">
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
