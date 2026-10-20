"use client";

import type { ImgHTMLAttributes, CSSProperties } from "react";

const MOBILE_WIDTHS = [640, 750, 828, 1080];

function mobileSrcSet(src: string) {
  return MOBILE_WIDTHS.map(
    (w) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`
  ).join(", ");
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  sizes?: string;
  priority?: boolean;
  aspectRatio?: string;
};

export default function MobilePicture({
  src,
  sizes = "100vw",
  priority = false,
  alt = "",
  decoding = "async",
  loading,
  onError,
  aspectRatio,
  style,
  ...rest
}: Props) {
  const imageStyle: CSSProperties = {
    ...style,
    ...(aspectRatio
      ? {
          width: "100%",
          height: "100%",
          objectFit: "cover" as const,
        }
      : {}),
  };

  return (
    <picture
      style={
        aspectRatio
          ? {
              display: "block",
              width: "100%",
              aspectRatio,
              overflow: "hidden",
            }
          : undefined
      }
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
        style={imageStyle}
        onError={(e) => {
          e.currentTarget.parentElement
            ?.querySelectorAll("source")
            .forEach((source) => source.remove());

          onError?.(e);
        }}
      />
    </picture>
  );
}