"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * 배너 이미지 편집기 (웹)
 * - 9:5.16 가로 캔버스에 원본 이미지를 배치
 * - 비율이 안 맞아 생기는 양옆/위아래 여백을 흰색 대신 "배경색"으로 채움
 *   · 기본값: 이미지 가장자리 색 자동 추출(예: 청록 배경)
 *   · 색상 직접 선택 + 스포이드(이미지 클릭)로 샘플링
 * - "꽉 채우기(크롭)" 모드도 지원
 * - 확정 시 캔버스를 JPEG File 로 내보냄
 */

type FitMode = "contain" | "cover";

interface Props {
  open: boolean;
  /** 새로 고른 파일(File) 또는 기존 배너 URL(string) */
  source: File | string | null;
  targetAspect: number; // 예: 9 / 5.16
  minWidth: number; // 예: 1500
  mime?: string; // 기본 image/jpeg
  quality?: number; // 0~1
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const PREVIEW_W = 900;

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 이미지 좌/우/상/하 가장자리 픽셀 평균색 추출 → 여백 채울 기본 배경색 */
function detectEdgeColor(img: HTMLImageElement): string {
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const samples: [number, number][] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const y = Math.min(h - 1, Math.round((h - 1) * (i / steps)));
      samples.push([0, y]);
      samples.push([w - 1, y]);
      const x = Math.min(w - 1, Math.round((w - 1) * (i / steps)));
      samples.push([x, 0]);
      samples.push([x, h - 1]);
    }
    let r = 0,
      g = 0,
      b = 0;
    for (const [x, y] of samples) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      r += d[0];
      g += d[1];
      b += d[2];
    }
    const n = samples.length;
    return rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  } catch {
    // CORS 등으로 픽셀 접근 불가 시 흰색
    return "#ffffff";
  }
}

const BannerImageEditor: React.FC<Props> = ({
  open,
  source,
  targetAspect,
  minWidth,
  mime = "image/jpeg",
  quality = 0.92,
  onCancel,
  onConfirm,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fit, setFit] = useState<FitMode>("contain");
  const [eyedropper, setEyedropper] = useState(false);
  const [tainted, setTainted] = useState(false); // CORS로 픽셀 접근 불가
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 이미지 로드
  useEffect(() => {
    if (!open || !source) return;
    setLoading(true);
    setTainted(false);
    let objectUrl: string | null = null;
    const image = new Image();
    const onload = () => {
      setImg(image);
      // 가장자리 색 자동 추출 → 기본 배경색
      const edge = detectEdgeColor(image);
      setBgColor(edge);
      setLoading(false);
    };
    image.onload = onload;
    image.onerror = () => {
      setLoading(false);
      alert("이미지를 불러오지 못했습니다.");
    };
    if (typeof source === "string") {
      // 원격 이미지는 same-origin 프록시를 통해 로드 → canvas 오염 방지
      image.crossOrigin = "anonymous";
      image.src = `/api/image-proxy?url=${encodeURIComponent(source)}`;
    } else {
      objectUrl = URL.createObjectURL(source);
      image.src = objectUrl;
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, source]);

  // 출력 해상도 계산
  const computeOut = useCallback(
    (natW: number, natH: number) => {
      const outW = Math.max(minWidth, natW, Math.round(natH * targetAspect));
      const outH = Math.round(outW / targetAspect);
      return { outW, outH };
    },
    [minWidth, targetAspect],
  );

  // 캔버스에 그리기 (preview 해상도)
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cw, ch);
      if (!img) return;
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const scale =
        fit === "cover"
          ? Math.max(cw / natW, ch / natH)
          : Math.min(cw / natW, ch / natH);
      const dw = natW * scale;
      const dh = natH * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    },
    [bgColor, fit, img],
  );

  // preview 다시 그리기
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = PREVIEW_W;
    const ch = Math.round(PREVIEW_W / targetAspect);
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (ctx) draw(ctx, cw, ch);
  }, [open, draw, targetAspect, img]);

  // 스포이드: 캔버스 클릭 위치 색 추출
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eyedropper) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const d = ctx.getImageData(x, y, 1, 1).data;
      setBgColor(rgbToHex(d[0], d[1], d[2]));
    } catch {
      setTainted(true);
      alert("이 이미지는 색 추출이 제한됩니다. 색상을 직접 선택해주세요.");
    }
    setEyedropper(false);
  };

  const handleConfirm = async () => {
    if (!img) return;
    setExporting(true);
    try {
      const { outW, outH } = computeOut(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      draw(ctx, outW, outH);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), mime, quality),
      );
      if (!blob) throw new Error("이미지 생성 실패");
      const ext = mime === "image/png" ? "png" : "jpg";
      const file = new File([blob], `banner_edited.${ext}`, { type: mime });
      onConfirm(file);
    } catch (err: any) {
      console.error(err);
      if (String(err?.name) === "SecurityError" || /tainted/i.test(String(err?.message))) {
        alert("원격 이미지라 내보내기가 제한됩니다. 원본 파일을 다시 선택해 편집해주세요.");
      } else {
        alert(err?.message ?? "이미지 내보내기에 실패했습니다.");
      }
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      onClick={onCancel}
    >
      <div
        className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold">배너 이미지 편집</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* 미리보기 캔버스 */}
          <div className="relative overflow-hidden rounded-xl ring-1 ring-gray-200">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="block w-full"
              style={{ cursor: eyedropper ? "crosshair" : "default" }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-500">
                불러오는 중…
              </div>
            )}
          </div>

          {/* 컨트롤 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 채우기 모드 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">채우기</span>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setFit("contain")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    fit === "contain" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  여백 배경색
                </button>
                <button
                  type="button"
                  onClick={() => setFit("cover")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    fit === "cover" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  꽉 채우기(크롭)
                </button>
              </div>
            </div>

            {/* 배경색 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">배경색</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={fit === "cover"}
                className="h-8 w-10 cursor-pointer rounded border border-gray-300 disabled:opacity-40"
                title="배경색 선택"
              />
              <span className="font-mono text-xs uppercase text-gray-500">{bgColor}</span>
              <button
                type="button"
                onClick={() => setEyedropper((v) => !v)}
                disabled={fit === "cover" || tainted}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${
                  eyedropper
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
                title="이미지에서 색 추출"
              >
                💧 스포이드
              </button>
            </div>
          </div>

          {eyedropper && (
            <p className="text-xs text-blue-600">
              이미지에서 채울 배경색으로 쓸 부분을 클릭하세요.
            </p>
          )}
          {tainted && (
            <p className="text-xs text-amber-600">
              원격 이미지라 색 자동 추출/스포이드가 제한됩니다. 색상을 직접 선택하거나 원본 파일을
              다시 올려주세요.
            </p>
          )}
          <p className="text-xs text-gray-500">
            결과물은 9:5.16 비율로 저장됩니다. ‘여백 배경색’ 모드는 비어있는 양옆/위아래를 선택한
            색으로 채웁니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onCancel}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!img || exporting}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? "적용 중…" : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannerImageEditor;
