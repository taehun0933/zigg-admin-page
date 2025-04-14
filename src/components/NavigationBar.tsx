"use client";

// components/NavigationBar.tsx
import React from "react";
import { useRouter } from "next/navigation";

// 개별 navigation 항목 타입 정의
export interface NavItem {
  label: string;
  onClick: () => void;
}

// NavigationBar 컴포넌트 props 타입 정의
interface NavigationBarProps {
  items: NavItem[];
}

const NavigationBar: React.FC<NavigationBarProps> = ({ items }) => {
  const router = useRouter();

  return (
    <nav className="flex justify-between items-center bg-gray-100 p-4 border-b border-gray-300">
      <button
        className="text-xl font-bold"
        onClick={() => {
          router.push("/");
        }}
      >
        ZIGG X Godition Admin Page
      </button>
      <ul className="flex gap-6">
        {items.map((item, index) => (
          <li
            key={index}
            className="cursor-pointer hover:text-blue-500"
            onClick={item.onClick}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default NavigationBar;
