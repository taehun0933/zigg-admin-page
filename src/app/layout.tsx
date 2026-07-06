import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZIGG Admin",
  description: "ZIGG X Godition 관리자 페이지",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 컨텐츠는 한국어인데 lang="en"이면 브라우저 자동번역이 개입해
  // React DOM 조작과 충돌(removeChild 크래시)할 수 있어 ko로 명시
  return (
    <html lang="ko">
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
