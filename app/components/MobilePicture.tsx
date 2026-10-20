"use client";

import type { ImgHTMLAttributes } from "react";

/**
 * تصویر بهینه فقط برای موبایل/تبلت (زیر ۱۰۲۴px).
 * دسکتاپ دقیقاً همان فایل اصلی را مثل قبل می‌گیرد؛ موبایل نسخه‌ی کوچک‌شده‌ی
 * WebP را از optimizer خود Next می‌گیرد. اگر آن نسخه بارگذاری نشد، خودکار
 * به فایل اصلی برمی‌گردد.
 */
const MOBILE_WIDTHS = [640, 750, 828, 1080];

function mobileSrcSet(src: string) {
  return MOBILE_WIDTHS.map(
    (w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`
  ).join(", ");
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  /** اندازه‌ی نمایش روی موبایل نسبت به عرض صفحه */
  sizes?: string;
  priority?: boolean;
};

export default function MobilePicture({
  src,
  sizes = "100vw",
  priority = false,
  alt = "",
  decoding = "async",
  loading,
  onError,
  ...rest
}: Props) {
  return (
    <picture>
      <source
        media="(max-width: 1023.98px)"
        srcSet={mobileSrcSet(src)}
        sizes={sizes}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...rest}
        src={src}
        alt={alt}
        decoding={decoding}
        loading={priority ? "eager" : (loading ?? "lazy")}
        fetchPriority={priority ? "high" : undefined}
        onError={(e) => {
          // نسخه‌ی بهینه‌ی موبایل در دسترس نبود: به فایل اصلی برگرد
          e.currentTarget.parentElement
            ?.querySelectorAll("source")
            .forEach((s) => s.remove());
          onError?.(e);
        }}
      />
    </picture>
  );
}
