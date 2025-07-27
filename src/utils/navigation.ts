import { NavItem } from "@/components/NavigationBar";

// 공통 네비게이션 아이템을 생성하는 함수
export const navigationItems = (router: any, handleLogout: () => void): NavItem[] => [
  {
    label: "오디션 관리",
    onClick: () => router.push("/audition"),
  },
  {
    label: "공지사항 관리",
    onClick: () => router.push("/announcement"),
  },
  {
    label: "게시판 관리",
    onClick: () => router.push("/board"),
  },
  {
    label: "로그아웃",
    onClick: handleLogout,
  },
]; 