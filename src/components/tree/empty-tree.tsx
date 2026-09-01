"use client";

import { CtaButton } from "@/components/cta-button";

export function EmptyTree({
  hasSubject,
  compact,
  onCreateNode,
  onAddMaterial,
  onCreateSubject,
}: {
  hasSubject: boolean;
  compact?: boolean;
  onCreateNode: () => void;
  onAddMaterial: () => void;
  onCreateSubject?: () => void;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center px-4 py-8 text-center"
          : "flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center"
      }
    >
      <EmptyIllustration />
      <h1 className="font-heading mt-6 text-[28px] font-bold">Tạo ô đầu tiên</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-ink/55">
        Cây do bạn dựng. PDF vào thư viện để mở khi học, app không bẻ file thành cây.
      </p>
      <div className="mt-8 w-full max-w-[320px] space-y-3">
        <CtaButton icon="none" onClick={onCreateNode}>
          Tạo ô trên cây
        </CtaButton>
        {!hasSubject && onCreateSubject && (
          <button
            type="button"
            onClick={onCreateSubject}
            className="w-full text-[14px] font-semibold text-ink/70 underline underline-offset-4"
          >
            Thêm môn trước
          </button>
        )}
        <button
          type="button"
          onClick={onAddMaterial}
          className="w-full text-[14px] font-semibold text-ink/70 underline underline-offset-4"
        >
          Thêm tài liệu
        </button>
      </div>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 260 140" className="w-[240px] text-ink" fill="none" aria-hidden>
      <path
        d="M20 88 C70 88, 70 40, 120 40 S170 108, 240 92"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="28" y="68" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M46 77 v18 M37 86 h18" stroke="currentColor" strokeWidth="1.6" />
      <rect x="108" y="22" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M126 48 c0-7 10-11 10-18 c6 4 8 12 2 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="196" y="70" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M214 82 l3 7 8 1 -6 5 2 8 -7-4 -7 4 2-8 -6-5 8-1 z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="86" cy="56" r="2" fill="currentColor" />
      <circle cx="168" cy="64" r="2" fill="currentColor" />
      <path d="M74 108 h6 M77 105 v6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M186 48 h6 M189 45 v6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
