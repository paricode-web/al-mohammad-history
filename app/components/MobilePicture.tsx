"use client";

import type { ImgHTMLAttributes } from "react";

const MOBILE_WIDTHS = [640, 750, 828, 1080];

function mobileSrcSet(src: string) {
  return MOBILE_WIDTHS.map(
    (w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`
  ).join(", ");
}

type Props = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src: string;
  sizes?: string;
  priority?: boolean;
  frameClassName?: string;
};

export default function MobilePicture({
  src,
  sizes = "100vw",
  priority = false,
  alt = "",
  decoding = "async",
  loading,
  onError,
  className = "",
  frameClassName = "",
  ...rest
}: Props) {
  return (
    <picture
      className={`block w-full ${frameClassName}`}
    >
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
        className={className}
        onError={(e) => {
          e.currentTarget.parentElement
            ?.querySelectorAll("source")
            .forEach((s) => s.remove());

          onError?.(e);
        }}
      />
    </picture>
  );
}