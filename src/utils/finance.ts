import { FinanceType } from "@/apis/finance";

// ₩ + 천단위 콤마, 음수 처리
export const formatWon = (n: number): string =>
  "₩" + Math.round(n).toLocaleString("ko-KR");

// 수익 +, 지출 −
export const formatWonSigned = (type: FinanceType, n: number): string =>
  (type === "REVENUE" ? "+" : "−") + formatWon(Math.abs(n));

export const formatUsd = (n: number): string =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
