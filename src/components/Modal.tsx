import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  sizeMode: "SMALL" | "MIDDLE" | "LARGE";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  sizeMode,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = {
    SMALL: "md:w-1/3",
    MIDDLE: "md:w-1/2",
    LARGE: "md:w-2/3",
  }[sizeMode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose} // 바깥쪽 클릭 시 닫힘
    >
      <div
        className={`bg-white rounded-lg shadow-lg w-11/12 ${widthClass}`}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b border-gray-300 p-4">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 모달 내용 */}
        <div
          className="p-4 overflow-y-auto max-h-[80vh]"
          style={{
            scrollbarWidth: "none",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
