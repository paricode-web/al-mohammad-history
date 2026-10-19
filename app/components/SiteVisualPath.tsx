"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import gsap from "gsap";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

type PathData = {
  d: string;
  width: number;
  height: number;
  hiddenRect: Rect | null;
};

type Table = {
  ys: number[];
  ls: number[];
  total: number;
};

const SELECTORS = {
  start: '[data-line-anchor="visual-start"]',
  timelineStart: '[data-line-anchor="timeline-start"]',
  timelineEnd: '[data-line-anchor="timeline-connection"]',
  highlightStart: '[data-line-anchor="highlights-connection"]',
  highlightPoints: "[data-line-path-point]",
  timelineDots: "[data-timeline-dot]",
  titleWord: "[data-line-title-word]",
  // فقط موبایل: ابتدا و انتهای ریل هر ردیف تایم‌لاین
  meanderTop: '[data-line-meander="top"]',
  meanderBottom: '[data-line-meander="bottom"]',
};

const DESKTOP_QUERY = "(min-width: 1024px)";
const CORNER_RADIUS = 24;

const HEAD_START = 0.55;
const HEAD_GAIN = 0.45;

const EMPTY: PathData = {
  d: "",
  width: 0,
  height: 0,
  hiddenRect: null,
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function layoutBox(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;

  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  return {
    x,
    y,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function makeCurve(from: Point, to: Point) {
  const middleY = (from.y + to.y) / 2;

  return `C ${from.x} ${middleY}, ${to.x} ${middleY}, ${to.x} ${to.y}`;
}

/**
 * فقط موبایل: از انتهای ریل یک ردیف تا ابتدای ریل ردیف بعد.
 * مسیر: پایین → پیچ گرد → افقی → پیچ گرد → پایین
 * (فرض: نقطه‌ی from از قبل با L به همین نقطه رسیده است)
 */
function makeStep(from: Point, to: Point) {
  const run = Math.abs(to.x - from.x);
  const drop = to.y - from.y;
  const r = Math.min(CORNER_RADIUS, drop / 2, run / 2);

  if (run < 1 || r < 1) return `L ${to.x} ${to.y}`;

  const midY = (from.y + to.y) / 2;
  const dir = to.x > from.x ? 1 : -1;

  return [
    `L ${from.x} ${midY - r}`,
    `Q ${from.x} ${midY} ${from.x + dir * r} ${midY}`,
    `L ${to.x - dir * r} ${midY}`,
    `Q ${to.x} ${midY} ${to.x} ${midY + r}`,
    `L ${to.x} ${to.y}`,
  ].join(" ");
}

function samePath(a: PathData, b: PathData) {
  const ra = a.hiddenRect;
  const rb = b.hiddenRect;

  const sameRect =
    ra === rb ||
    (!!ra &&
      !!rb &&
      ra.x === rb.x &&
      ra.y === rb.y &&
      ra.width === rb.width &&
      ra.height === rb.height);

  return (
    a.d === b.d &&
    a.width === b.width &&
    a.height === b.height &&
    sameRect
  );
}

function lengthAt(table: Table, y: number) {
  const { ys, ls, total } = table;
  const n = ys.length;

  if (n < 2 || total <= 0) return 0;
  if (y <= ys[0]) return 0;
  if (y >= ys[n - 1]) return 1;

  let lo = 0;
  let hi = n - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (ys[mid] <= y) lo = mid;
    else hi = mid;
  }

  const span = ys[hi] - ys[lo];
  const k = span > 0 ? (y - ys[lo]) / span : 0;

  return (ls[lo] + (ls[hi] - ls[lo]) * k) / total;
}

export default function SiteVisualPath({
  children,
}: {
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const tableRef = useRef<Table | null>(null);

  const dotAnimationsRef = useRef(
    new Map<HTMLElement, gsap.core.Tween>()
  );

  const dotProgressRef = useRef<number[]>([]);
  const reduceMotion = useReducedMotion();
  const maskId = `route-mask-${useId().replace(/:/g, "")}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);

  const { scrollY } = useScroll();

  const target = useMotionValue(0);

  // تنظیمات اسپرینگ اصلی حفظ شده‌اند.
  const progress = useSpring(target, {
    stiffness: 130,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  const syncDots = useCallback(
    (value: number) => {
      const container = containerRef.current;
      if (!container) return;

      const dots = Array.from(
        container.querySelectorAll<HTMLElement>(
          SELECTORS.timelineDots
        )
      );

      dots.forEach((dot, index) => {
        const animation = dotAnimationsRef.current.get(dot);
        const start = dotProgressRef.current[index];

        if (reduceMotion) {
          if (animation) animation.progress(1);
          dot.dataset.linePassed = "true";
          return;
        }

        if (!animation || start === undefined) return;

        // دایره دقیقاً براساس پیشرفت همان خط پر می‌شود.
        const localProgress =
          start >= 1
            ? 0
            : clamp((value - start) / Math.max(0.0001, 1 - start), 0, 1);

        animation.progress(localProgress);
        dot.dataset.linePassed = String(localProgress >= 1);
      });
    },
    [reduceMotion]
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;

    const centerOf = (el: Element | null): Point | null => {
      if (!(el instanceof HTMLElement)) return null;

      const box = layoutBox(el, container);

      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      };
    };

    const start = centerOf(container.querySelector(SELECTORS.start));

    const timelineStart = centerOf(
      container.querySelector(SELECTORS.timelineStart)
    );

    const timelineEnd = centerOf(
      container.querySelector(SELECTORS.timelineEnd)
    );

    let hiddenRect: Rect | null = null;
    const titleWord = container.querySelector(SELECTORS.titleWord);

    if (titleWord instanceof HTMLElement) {
      const box = layoutBox(titleWord, container);
      const pad = 3;

      hiddenRect = {
        x: box.x - pad,
        y: box.y - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };
    }

    const highlightPoints = Array.from(
      container.querySelectorAll<HTMLElement>(
        SELECTORS.highlightPoints
      )
    )
      .sort(
        (a, b) =>
          Number(a.dataset.linePathPoint) -
          Number(b.dataset.linePathPoint)
      )
      .map((el) => centerOf(el))
      .filter((p): p is Point => p !== null);

    const firstHighlight =
      highlightPoints[0] ??
      centerOf(container.querySelector(SELECTORS.highlightStart));

    const dots = Array.from(
      container.querySelectorAll<HTMLElement>(
        SELECTORS.timelineDots
      )
    );

    const containerRect = container.getBoundingClientRect();

    const dotYs = dots.map((dot) => {
      const rect = dot.getBoundingClientRect();

      return rect.top + rect.height / 2 - containerRect.top;
    });

    // انکرهای مسیر مارپیچ (فقط موبایل)
    const meanderTops = Array.from(
      container.querySelectorAll(SELECTORS.meanderTop)
    )
      .map((el) => centerOf(el))
      .filter((p): p is Point => p !== null);

    const meanderBottoms = Array.from(
      container.querySelectorAll(SELECTORS.meanderBottom)
    )
      .map((el) => centerOf(el))
      .filter((p): p is Point => p !== null);

    let d = "";

    if (
      !isDesktop &&
      start &&
      firstHighlight &&
      meanderTops.length > 0 &&
      meanderTops.length === meanderBottoms.length
    ) {
      // ── موبایل و تبلت: مسیر مارپیچ ──
      const lastIndex = meanderTops.length - 1;

      const commands = [
        `M ${start.x} ${start.y}`,
        makeCurve(start, meanderTops[0]),
      ];

      for (let i = 0; i <= lastIndex; i++) {
        commands.push(`L ${meanderBottoms[i].x} ${meanderBottoms[i].y}`);

        if (i < lastIndex) {
          commands.push(makeStep(meanderBottoms[i], meanderTops[i + 1]));
        }
      }

      commands.push(makeCurve(meanderBottoms[lastIndex], firstHighlight));

      for (let i = 1; i < highlightPoints.length; i++) {
        commands.push(
          makeCurve(highlightPoints[i - 1], highlightPoints[i])
        );
      }

      d = commands.join(" ");
    } else if (start && timelineStart && timelineEnd && firstHighlight) {
      // ── دسکتاپ: بدون تغییر ──
      const verticalEnd = {
        x: timelineStart.x,
        y: timelineEnd.y,
      };

      const commands = [
        `M ${start.x} ${start.y}`,
        makeCurve(start, timelineStart),
        `L ${verticalEnd.x} ${verticalEnd.y}`,
        makeCurve(verticalEnd, firstHighlight),
      ];

      for (let i = 1; i < highlightPoints.length; i++) {
        commands.push(
          makeCurve(highlightPoints[i - 1], highlightPoints[i])
        );
      }

      d = commands.join(" ");
    }

    const next: PathData = {
      d,
      width,
      height,
      hiddenRect,
    };

    setPathData((prev) => (samePath(prev, next) ? prev : next));

    // بازسازی انیمیشن‌های دایره‌ها پس از اندازه‌گیری layout
    dotAnimationsRef.current.forEach((animation) => animation.kill());
    dotAnimationsRef.current.clear();

    const css = getComputedStyle(document.documentElement);
    const accent =
      css.getPropertyValue("--brand-accent").trim() || "#C5AA76";
    const onAccent =
      css.getPropertyValue("--brand-on-accent").trim() || "#061F38";

    dots.forEach((dot) => {
      const animation = gsap.fromTo(
        dot,
        {
          backgroundColor: getComputedStyle(dot).backgroundColor,
          borderColor: getComputedStyle(dot).borderColor,
          color: getComputedStyle(dot).color,
          boxShadow: "0 0 0 0 rgba(197, 170, 118, 0)",
        },
        {
          backgroundColor: accent,
          borderColor: accent,
          color: onAccent,
          boxShadow: `0 0 0 8px ${hexToRgba(accent, 0.15)}, 0 0 40px ${hexToRgba(accent, 0.35)}`,
          ease: "none",
          paused: true,
        }
      );

      dotAnimationsRef.current.set(dot, animation);
    });

    // مقدار هر دایره روی مسیر، با توجه به موقعیت عمودی آن
    if (tableRef.current) {
      dotProgressRef.current = dotYs.map((y) =>
        lengthAt(tableRef.current!, y)
      );
      syncDots(progress.get());
    } else {
      dotProgressRef.current = [];
    }
  }, [progress, syncDots]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(schedule);

    observer.observe(container);

    container
      .querySelectorAll(
        "article, li, h1, [data-line-anchor], [data-timeline-dot]"
      )
      .forEach((el) => observer.observe(el));

    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);

      dotAnimationsRef.current.forEach((animation) => animation.kill());
      dotAnimationsRef.current.clear();
    };
  }, [measure]);

  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;

    if (!container || !table) return;

    const vh = window.innerHeight;
    const rect = container.getBoundingClientRect();
    const scrollable = rect.height - vh;

    const p =
      scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    const headY = vh * (HEAD_START + HEAD_GAIN * p * p) - rect.top;

    target.set(lengthAt(table, headY));
  }, [target]);

  useMotionValueEvent(scrollY, "change", update);

  useLayoutEffect(() => {
    const path = trackRef.current;

    if (!path || !pathData.d) {
      tableRef.current = null;
      return;
    }

    const total = path.getTotalLength();
    const steps = clamp(Math.ceil(total / 6), 120, 1500);

    const ys: number[] = [];
    const ls: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const length = (total * i) / steps;
      const point = path.getPointAtLength(length);

      ys.push(i === 0 ? point.y : Math.max(point.y, ys[i - 1]));
      ls.push(length);
    }

    tableRef.current = { ys, ls, total };

    const container = containerRef.current;

    if (container) {
      const containerRect = container.getBoundingClientRect();

      const dots = Array.from(
        container.querySelectorAll<HTMLElement>(
          SELECTORS.timelineDots
        )
      );

      dotProgressRef.current = dots.map((dot) => {
        const rect = dot.getBoundingClientRect();
        const y = rect.top + rect.height / 2 - containerRect.top;

        return lengthAt(tableRef.current!, y);
      });
    }

    update();
    syncDots(progress.get());
  }, [pathData.d, progress, syncDots, update]);

  useMotionValueEvent(progress, "change", (value) => {
    const path = trackRef.current;
    const head = headRef.current;
    const table = tableRef.current;

    if (path && head && table) {
      const point = path.getPointAtLength(
        clamp(value, 0, 1) * table.total
      );

      head.setAttribute(
        "transform",
        `translate(${point.x} ${point.y})`
      );

      head.style.opacity =
        value > 0.002 && value < 0.998 ? "1" : "0";
    }

    syncDots(value);
  });

  return (
    <div ref={containerRef} className="relative">
      {children}

      {pathData.d && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
          viewBox={`0 0 ${pathData.width} ${pathData.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={pathData.width}
              height={pathData.height}
            >
              <rect
                x="0"
                y="0"
                width={pathData.width}
                height={pathData.height}
                fill="white"
              />

              {pathData.hiddenRect && (
                <rect
                  x={pathData.hiddenRect.x}
                  y={pathData.hiddenRect.y}
                  width={pathData.hiddenRect.width}
                  height={pathData.hiddenRect.height}
                  fill="black"
                />
              )}
            </mask>
          </defs>

          <g mask={`url(#${maskId})`}>
            <path
              ref={trackRef}
              d={pathData.d}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                stroke: "var(--brand-accent)",
                strokeOpacity: 0.18,
              }}
            />

            <motion.path
              d={pathData.d}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="md:[filter:drop-shadow(0_0_6px_color-mix(in_srgb,var(--brand-accent)_55%,transparent))]"
              style={{
                pathLength: reduceMotion ? 1 : progress,
                stroke: "var(--brand-accent)",
              }}
            />

            {!reduceMotion && (
              <g ref={headRef} style={{ opacity: 0 }}>
                <circle
                  r="9"
                  style={{
                    fill: "var(--brand-accent)",
                    fillOpacity: 0.18,
                  }}
                />
                <circle
                  r="4"
                  style={{ fill: "var(--brand-accent)" }}
                />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
