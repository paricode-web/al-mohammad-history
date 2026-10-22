"use client";

import {
  useCallback,
  useEffect,
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

type Table = {
  ys: number[];
  ls: number[];
  total: number;
};

type ElementRef<T> = {
  current: T | null;
};

const SELECTORS = {
  start: '[data-line-anchor="visual-start"]',
  timelineStart: '[data-line-anchor="timeline-start"]',
  timelineEnd: '[data-line-anchor="timeline-connection"]',
  highlightStart: '[data-line-anchor="highlights-connection"]',
  highlightPoints: "[data-line-path-point]",
  timelineDots: "[data-timeline-dot]",
  titleWord: "[data-line-title-word]",
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

// رفع مورد ۱۰ (SSR): جلوگیری از هشدار useLayoutEffect روی سرور
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * موقعیت المان نسبت به padding-edge کانتینر root.
 * رفع مورد ۴: border والدهای میانی (clientLeft/clientTop) هم حساب می‌شود.
 */
function layoutBox(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;

  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;

    const parent = node.offsetParent as HTMLElement | null;

    if (parent && parent !== root) {
      x += parent.clientLeft;
      y += parent.clientTop;
    }

    node = parent;
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

function makeStep(from: Point, to: Point) {
  const run = Math.abs(to.x - from.x);
  const drop = to.y - from.y;
  const dir = to.x >= from.x ? 1 : -1;

  const r = Math.min(CORNER_RADIUS, Math.max(0, drop / 2), run / 2);

  if (run < 1 || drop < 1 || r < 1) {
    return `L ${to.x} ${to.y}`;
  }

  const midY = (from.y + to.y) / 2;
  const k = 0.5522847498;

  const firstCornerX = from.x + dir * r;
  const secondCornerX = to.x - dir * r;

  return [
    `L ${from.x} ${midY - r}`,
    `C ${from.x} ${midY - r + k * r},
       ${firstCornerX - dir * k * r} ${midY},
       ${firstCornerX} ${midY}`,
    `L ${secondCornerX} ${midY}`,
    `C ${secondCornerX + dir * k * r} ${midY},
       ${to.x} ${midY + r - k * r},
       ${to.x} ${midY + r}`,
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

/**
 * این کامپوننت فقط در دسکتاپ mount می‌شود.
 * تمام منطق اسکرول، حرکت خط و نقطه‌ی متحرک در همین بخش است.
 */
function DesktopPathAnimation({
  d,
  containerRef,
  trackRef,
}: {
  d: string;
  containerRef: ElementRef<HTMLDivElement>;
  trackRef: ElementRef<SVGPathElement>;
}) {
  const headRef = useRef<SVGGElement>(null);
  const tableRef = useRef<Table | null>(null);

  const dotsRef = useRef<HTMLElement[]>([]);
  const dotProgressRef = useRef<number[]>([]);
  // رفع مورد ۱: undefined یعنی «هنوز هیچ وضعیتی روی DOM ثبت نشده»
  const previousDotStatesRef = useRef<(boolean | undefined)[]>([]);

  // ارتفاع پایدار viewport؛ با باز و بسته شدن نوار آدرس مرورگر تغییر نمی‌کند
  const viewportHeightRef = useRef(0);

  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const target = useMotionValue(0);

  const progress = useSpring(target, {
    stiffness: 130,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  const syncDots = useCallback(
    (value: number) => {
      const dots = dotsRef.current;
      const starts = dotProgressRef.current;
      const previous = previousDotStatesRef.current;

      for (let i = 0; i < dots.length; i++) {
        const start = starts[i];

        if (start === undefined) continue;

        const passed = reduceMotion ? true : value >= start;

        if (previous[i] === passed) continue;

        previous[i] = passed;
        dots[i].dataset.linePassed = String(passed);
      }
    },
    [reduceMotion]
  );

  // رفع مورد ۲: منطق جابه‌جایی head جدا شد تا بعد از measure هم صدا زده شود
  const placeHead = useCallback(
    (value: number) => {
      const path = trackRef.current;
      const head = headRef.current;
      const table = tableRef.current;

      if (!path || !head || !table) return;

      const point = path.getPointAtLength(
        clamp(value, 0, 1) * table.total
      );

      head.setAttribute("transform", `translate(${point.x} ${point.y})`);

      head.style.opacity =
        value > 0.002 && value < 0.998 ? "1" : "0";
    },
    [trackRef]
  );

  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;

    if (!container || !table) return;

    const vh = viewportHeightRef.current || window.innerHeight;
    const rect = container.getBoundingClientRect();
    const scrollable = rect.height - vh;

    const p =
      scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    const headY = vh * (HEAD_START + HEAD_GAIN * p * p) - rect.top;

    target.set(lengthAt(table, headY));
  }, [containerRef, target]);

  useMotionValueEvent(scrollY, "change", update);

  // ارتفاع viewport فقط وقتی عرض عوض شود (resize واقعی/چرخش صفحه) دوباره خوانده می‌شود
  useEffect(() => {
    let lastWidth = window.innerWidth;
    viewportHeightRef.current = document.documentElement.clientHeight;

    const onResize = () => {
      if (window.innerWidth === lastWidth) return;

      lastWidth = window.innerWidth;
      viewportHeightRef.current = document.documentElement.clientHeight;
      update();
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [update]);

  useIsomorphicLayoutEffect(() => {
    const path = trackRef.current;
    const container = containerRef.current;

    if (!path || !container || !d) {
      tableRef.current = null;
      return;
    }

    const total = path.getTotalLength();
    const steps = clamp(Math.ceil(total / 8), 100, 1000);

    const ys: number[] = [];
    const ls: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const length = (total * i) / steps;
      const point = path.getPointAtLength(length);

      ys.push(i === 0 ? point.y : Math.max(point.y, ys[i - 1]));
      ls.push(length);
    }

    const table: Table = { ys, ls, total };
    tableRef.current = table;

    dotsRef.current = Array.from(
      container.querySelectorAll<HTMLElement>(SELECTORS.timelineDots)
    );

    // رفع مورد ۱: وضعیت قبلی پاک می‌شود تا syncDots همه‌ی dot ها را دوباره روی DOM بنویسد
    previousDotStatesRef.current = dotsRef.current.map(() => undefined);

    // رفع مورد ۴: همان سیستم مختصاتی که برای مسیر استفاده می‌شود (layoutBox)
    dotProgressRef.current = dotsRef.current.map((dot) => {
      const box = layoutBox(dot, container);
      const y = box.y + box.height / 2;

      return lengthAt(table, y);
    });

    if (!viewportHeightRef.current) {
      viewportHeightRef.current = document.documentElement.clientHeight;
    }

    update();

    // بعد از هر بازسازی مسیر (اولین mount، resize، layout shift) بدون انیمیشن
    // به مقدار واقعی می‌پریم تا head و خط عقب نمانند
    progress.jump(target.get());

    const current = progress.get();

    placeHead(current);
    syncDots(current);
  }, [
    d,
    containerRef,
    trackRef,
    progress,
    target,
    placeHead,
    syncDots,
    update,
  ]);

  useMotionValueEvent(progress, "change", (value) => {
    placeHead(value);
    syncDots(value);
  });

  return (
    <>
      {/* درخشش بدون فیلتر: یک path ضخیم‌تر و کم‌رنگ به‌جای drop-shadow */}
      <motion.path
        d={d}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          pathLength: reduceMotion ? 1 : progress,
          stroke: "var(--brand-accent)",
          strokeOpacity: 0.16,
        }}
      />

      <motion.path
        d={d}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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

          <circle r="4" style={{ fill: "var(--brand-accent)" }} />
        </g>
      )}
    </>
  );
}

export default function SiteVisualPath({
  children,
}: {
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);

  const maskId = `route-mask-${useId().replace(/:/g, "")}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);
  const [isDesktop, setIsDesktop] = useState(false);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;

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
      container.querySelectorAll<HTMLElement>(SELECTORS.highlightPoints)
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

    if (!desktop) {
      // رفع مورد ۵: موبایل شاخه‌ی جدا دارد و هرگز به هندسه‌ی دسکتاپ fallback نمی‌شود
      const hasMeanders =
        meanderTops.length > 0 &&
        meanderTops.length === meanderBottoms.length;

      if (
        process.env.NODE_ENV !== "production" &&
        meanderTops.length !== meanderBottoms.length
      ) {
        console.warn(
          `[SiteVisualPath] تعداد meander بالا (${meanderTops.length}) و پایین (${meanderBottoms.length}) برابر نیست.`
        );
      }

      if (start && firstHighlight && hasMeanders) {
        const lastIndex = meanderTops.length - 1;

        const commands = [
          `M ${start.x} ${start.y}`,
          makeCurve(start, meanderTops[0]),
        ];

        for (let i = 0; i <= lastIndex; i++) {
          commands.push(
            `L ${meanderBottoms[i].x} ${meanderBottoms[i].y}`
          );

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
      }
    } else if (start && timelineStart && timelineEnd && firstHighlight) {
      // هندسه‌ی مسیر دسکتاپ بدون تغییر حفظ شده است.
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
  }, []);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const handleChange = () => {
      setIsDesktop(media.matches);
      measure();
    };

    handleChange();
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [measure]);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    // رفع مورد ۷: بعد از unmount دیگر frame جدید گرفته نمی‌شود
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(schedule);
    observer.observe(container);

    container
      .querySelectorAll(
        [
          "article",
          "li",
          "h1",
          "[data-line-anchor]",
          "[data-timeline-dot]",
          "[data-line-meander]",
        ].join(", ")
      )
      .forEach((el) => observer.observe(el));

    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [measure]);

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

          <g mask={pathData.hiddenRect ? `url(#${maskId})` : undefined}>
            {/* خط ثابت؛ روی موبایل طلایی و روی دسکتاپ کم‌رنگ */}
            <path
              ref={trackRef}
              d={pathData.d}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="[stroke-opacity:1] lg:[stroke-opacity:0.18]"
              style={{
                stroke: "var(--brand-accent)",
              }}
            />

            {/* منطق انیمیشن فقط در دسکتاپ فعال می‌شود */}
            {isDesktop && (
              <DesktopPathAnimation
                d={pathData.d}
                containerRef={containerRef}
                trackRef={trackRef}
              />
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
