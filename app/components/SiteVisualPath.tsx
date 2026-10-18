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

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

type PathData = {
  d: string;
  width: number;
  height: number;
  hiddenRect: Rect | null;
};

/** جدول نمونه‌برداری مسیر: برای هر طول، مقدار y متناظر */
type Table = { ys: number[]; ls: number[]; total: number };

const SELECTORS = {
  start: '[data-line-anchor="visual-start"]',
  timelineStart: '[data-line-anchor="timeline-start"]',
  timelineEnd: '[data-line-anchor="timeline-connection"]',
  highlightStart: '[data-line-anchor="highlights-connection"]',
  highlightPoints: "[data-line-path-point]",
  titleWord: "[data-line-title-word]",
};

/**
 * سرِ خط کجای صفحه‌ی نمایش باشد؟
 * ابتدا ۵۵٪ ارتفاع صفحه؛ هر چه به انتهای سایت نزدیک‌تر شویم تا ۱۰۰٪ پایین می‌رود
 * تا در آخر صفحه خط کامل کشیده شده باشد.
 */
const HEAD_START = 0.55;
const HEAD_GAIN = 0.45;

const EMPTY: PathData = { d: "", width: 0, height: 0, hiddenRect: null };

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

/** موقعیت المان نسبت به container، بدون اثر transform (انیمیشن کارت‌ها روی مسیر اثر نمی‌گذارد) */
function layoutBox(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;

  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

function makeCurve(from: Point, to: Point) {
  const middleY = (from.y + to.y) / 2;

  return `C ${from.x} ${middleY}, ${to.x} ${middleY}, ${to.x} ${to.y}`;
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
    a.d === b.d && a.width === b.width && a.height === b.height && sameRect
  );
}

/** y (نسبت به container) را به نسبت طول مسیر (۰ تا ۱) تبدیل می‌کند */
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

export default function SiteVisualPath({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const tableRef = useRef<Table | null>(null);

  const reduceMotion = useReducedMotion();
  const maskId = `route-mask-${useId().replace(/:/g, "")}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);

  const { scrollY } = useScroll();

  // مقدار هدف از روی اسکرول؛ اسپرینگ حرکت را نرم می‌کند ولی همیشه با اسکرول هم‌گام می‌ماند
  const target = useMotionValue(0);
  const progress = useSpring(target, {
    stiffness: 130,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  /* ---------- اندازه‌گیری مسیر (فقط با تغییر layout، نه با هر اسکرول) ---------- */
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const centerOf = (el: Element | null): Point | null => {
      if (!(el instanceof HTMLElement)) return null;
      const box = layoutBox(el, container);

      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };

    const start = centerOf(container.querySelector(SELECTORS.start));
    const timelineStart = centerOf(
      container.querySelector(SELECTORS.timelineStart)
    );
    const timelineEnd = centerOf(
      container.querySelector(SELECTORS.timelineEnd)
    );

    // ناحیه‌ای که خط پشت کلمه‌ی عنوان مخفی می‌شود
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
      container.querySelectorAll<HTMLElement>(SELECTORS.highlightPoints)
    )
      .sort(
        (a, b) =>
          Number(a.dataset.linePathPoint) - Number(b.dataset.linePathPoint)
      )
      .map((el) => centerOf(el))
      .filter((p): p is Point => p !== null);

    const firstHighlight =
      highlightPoints[0] ??
      centerOf(container.querySelector(SELECTORS.highlightStart));

    let d = "";

    if (start && timelineStart && timelineEnd && firstHighlight) {
      const verticalEnd = { x: timelineStart.x, y: timelineEnd.y };

      const commands = [
        `M ${start.x} ${start.y}`,
        makeCurve(start, timelineStart),
        `L ${verticalEnd.x} ${verticalEnd.y}`,
        makeCurve(verticalEnd, firstHighlight),
      ];

      for (let i = 1; i < highlightPoints.length; i++) {
        commands.push(makeCurve(highlightPoints[i - 1], highlightPoints[i]));
      }

      d = commands.join(" ");
    }

    const next: PathData = { d, width, height, hiddenRect };

    setPathData((prev) => (samePath(prev, next) ? prev : next));
  }, []);

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
      .querySelectorAll("article, li, h1, [data-line-anchor]")
      .forEach((el) => observer.observe(el));

    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [measure]);

  /* ---------- هم‌گام‌سازی طول خط با اسکرول ---------- */
  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;
    if (!container || !table) return;

    const vh = window.innerHeight;
    const rect = container.getBoundingClientRect();
    const scrollable = rect.height - vh;

    // پیشروی در کل سایت: ۰ در ابتدا، ۱ وقتی انتهای سایت به پایین صفحه رسید
    const p = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    // y سرِ خط نسبت به container
    const headY = vh * (HEAD_START + HEAD_GAIN * p * p) - rect.top;

    target.set(lengthAt(table, headY));
  }, [target]);

  useMotionValueEvent(scrollY, "change", update);

  // ساخت جدول (y ← طول) هر بار که مسیر عوض شد
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
    update();
  }, [pathData.d, update]);

  // نقطه‌ی درخشان روی سرِ خط
  useMotionValueEvent(progress, "change", (value) => {
    const path = trackRef.current;
    const head = headRef.current;
    const table = tableRef.current;

    if (!path || !head || !table) return;

    const point = path.getPointAtLength(clamp(value, 0, 1) * table.total);

    head.setAttribute("transform", `translate(${point.x} ${point.y})`);
    head.style.opacity = value > 0.002 && value < 0.998 ? "1" : "0";
  });

  return (
    <div ref={containerRef} className="relative">
      {children}

      {pathData.d && (
        <svg
          aria-hidden="true"
          // z-5: بالاتر از پس‌زمینه‌ی سکشن‌ها، پایین‌تر از کارت‌ها و دایره‌های تایم‌لاین (z-10)
          className="pointer-events-none absolute inset-0 z-[5] hidden h-full w-full overflow-visible lg:block"
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
            {/* مسیر کم‌رنگ پایه */}
            <path
              ref={trackRef}
              d={pathData.d}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ stroke: "var(--brand-accent)", strokeOpacity: 0.18 }}
            />

            {/* مسیر پرشونده با اسکرول */}
            <motion.path
              d={pathData.d}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pathLength: reduceMotion ? 1 : progress,
                stroke: "var(--brand-accent)",
                filter:
                  "drop-shadow(0 0 6px color-mix(in srgb, var(--brand-accent) 55%, transparent))",
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
                <circle r="4" style={{ fill: "var(--brand-accent)" }} />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
