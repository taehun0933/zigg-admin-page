import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZIGG Admin",
  description: "ZIGG X Godition 관리자 페이지",
};

// 브라우저 자동번역(구글 번역)이 텍스트 노드를 <font>로 감싸면 React가
// 원래 노드를 removeChild/insertBefore 하다 NotFoundError로 크래시함.
// 번역은 허용하되 크래시만 무해하게 흡수 (facebook/react#11538 공식 워크어라운드)
const domPatchScript = `
if (typeof Node === 'function' && Node.prototype) {
  var origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) { return child; }
    return origRemoveChild.apply(this, arguments);
  };
  var origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return origInsertBefore.call(this, newNode, null);
    }
    return origInsertBefore.apply(this, arguments);
  };
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: domPatchScript }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
