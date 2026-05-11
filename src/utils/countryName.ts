const displayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(["ko"], { type: "region" })
    : null;

export function countryNameKo(code: string | null | undefined): string {
  if (!code) return "-";
  const upper = code.trim().toUpperCase();
  if (!upper) return "-";
  try {
    return displayNames?.of(upper) || upper;
  } catch {
    return upper;
  }
}
