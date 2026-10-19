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

type Point = {
  x: number;
  y: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PathData = {
  d: string;
  width: number;
  height: number;
  hiddenRect: Rect | null;
};

type Table = {
  xs: number[];
  ys: number[];
  rawYs: number[];
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

function makeStep(from: Point, to: Point) {
  const run = Math.abs(to.x - from.x);
  const drop = to.y - from.y;
  const dir = to.x >= from.x ? 1 : -1;

  const r = Math.min(
    CORNER_RADIUS,
    Math.max(0, drop / 2),
    run / 2
  );

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

/**
 * تبدیل موقعیت عمودی به پیشرفت مسیر با جست‌وجوی دودویی.
 */
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

    if (ys[mid] <= y) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const span = ys[hi] - ys[lo];
  const k = span > 0 ? (y - ys[lo]) / span : 0;

  return (ls[lo] + (ls[hi] - ls[lo]) * k) / total;
}

/**
 * محاسبه موقعیت سر مسیر از جدول مختصات از پیش محاسبه‌شده.
 */
function pointAtProgress(
  table: Table,
  progress: number,
  useRawY = false
): Point {
  const { xs, ys, rawYs, ls, total } = table;
  const n = ls.length;

  const pointYs = useRawY ? rawYs : ys;

  if (n === 0 || total <= 0) {
    return { x: 0, y: 0 };
  }

  const targetLength = clamp(progress, 0, 1) * total;

  if (targetLength <= 0) {
    return { x: xs[0], y: pointYs[0] };
  }

  if (targetLength >= total) {
    return { x: xs[n - 1], y: pointYs[n - 1] };
  }

  let lo = 0;
  let hi = n - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (ls[mid] <= targetLength) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const span = ls[hi] - ls[lo];

  const t =
    span > 0
      ? (targetLength - ls[lo]) / span
      : 0;

  return {
    x: xs[lo] + (xs[hi] - xs[lo]) * t,
    y: pointYs[lo] + (pointYs[hi] - pointYs[lo]) * t,
  };
}

export default function SiteVisualPath({
  children,
}: {
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const mobilePathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const tableRef = useRef<Table | null>(null);

  const dotsRef = useRef<HTMLElement[]>([]);
  const dotProgressRef = useRef<number[]>([]);
  const previousDotStatesRef = useRef<boolean[]>([]);

  const reduceMotion = useReducedMotion();
  const maskId = `route-mask-${useId().replace(/:/g, "")}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);
  const [isDesktop, setIsDesktop] = useState(false);

  const { scrollY } = useScroll();

  const target = useMotionValue(0);

  /**
   * دسکتاپ: تنظیمات Spring قبلی بدون تغییر.
   */
  const progress = useSpring(target, {
    stiffness: 130,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  /**
   * موبایل: Spring جداگانه با حرکت کمی آرام‌تر.
   */
  const mobileProgress = useSpring(target, {
    stiffness: 100,
    damping: 32,
    mass: 0.6,
    restDelta: 0.0005,
  });

  /**
   * به‌روزرسانی وضعیت نقاط تایم‌لاین فقط هنگام تغییر وضعیت هر نقطه.
   */
  const syncDots = useCallback(
    (value: number) => {
      const dots = dotsRef.current;
      const starts = dotProgressRef.current;
      const previous = previousDotStatesRef.current;

      for (let i = 0; i < dots.length; i++) {
        const start = starts[i];

        if (start === undefined) continue;

        const passed = reduceMotion || value >= start;

        if (previous[i] === passed) continue;

        previous[i] = passed;
        dots[i].dataset.linePassed = String(passed);
      }
    },
    [reduceMotion]
  );

  /**
   * اندازه‌گیری عناصر و تولید مسیر SVG.
   */
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

    const start = centerOf(
      container.querySelector(SELECTORS.start)
    );

    const timelineStart = centerOf(
      container.querySelector(SELECTORS.timelineStart)
    );

    const timelineEnd = centerOf(
      container.querySelector(SELECTORS.timelineEnd)
    );

    let hiddenRect: Rect | null = null;

    const titleWord = container.querySelector(
      SELECTORS.titleWord
    );

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
      .filter((point): point is Point => point !== null);

    const firstHighlight =
      highlightPoints[0] ??
      centerOf(
        container.querySelector(SELECTORS.highlightStart)
      );

    const dots = Array.from(
      container.querySelectorAll<HTMLElement>(
        SELECTORS.timelineDots
      )
    );

    dotsRef.current = dots;
    previousDotStatesRef.current = dots.map(() => false);

    const containerRect = container.getBoundingClientRect();

    const dotYs = dots.map((dot) => {
      const rect = dot.getBoundingClientRect();

      return (
        rect.top +
        rect.height / 2 -
        containerRect.top
      );
    });

    const meanderTops = Array.from(
      container.querySelectorAll(SELECTORS.meanderTop)
    )
      .map((el) => centerOf(el))
      .filter((point): point is Point => point !== null);

    const meanderBottoms = Array.from(
      container.querySelectorAll(SELECTORS.meanderBottom)
    )
      .map((el) => centerOf(el))
      .filter((point): point is Point => point !== null);

    let d = "";

    /**
     * مسیر موبایل و تبلت.
     */
    if (
      !desktop &&
      start &&
      firstHighlight &&
      meanderTops.length > 0 &&
      meanderTops.length === meanderBottoms.length
    ) {
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
          commands.push(
            makeStep(
              meanderBottoms[i],
              meanderTops[i + 1]
            )
          );
        }
      }

      commands.push(
        makeCurve(
          meanderBottoms[lastIndex],
          firstHighlight
        )
      );

      for (let i = 1; i < highlightPoints.length; i++) {
        commands.push(
          makeCurve(
            highlightPoints[i - 1],
            highlightPoints[i]
          )
        );
      }

      d = commands.join(" ");
    } else if (
      start &&
      timelineStart &&
      timelineEnd &&
      firstHighlight
    ) {
      /**
       * مسیر دسکتاپ؛ ساختار قبلی حفظ شده است.
       */
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
          makeCurve(
            highlightPoints[i - 1],
            highlightPoints[i]
          )
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

    setPathData((previousPath) =>
      samePath(previousPath, next)
        ? previousPath
        : next
    );

    if (tableRef.current) {
      dotProgressRef.current = dotYs.map((y) =>
        lengthAt(tableRef.current!, y)
      );

      syncDots(
        desktop ? progress.get() : mobileProgress.get()
      );
    } else {
      dotProgressRef.current = [];
    }
  }, [progress, mobileProgress, syncDots]);

  /**
   * تشخیص اندازه صفحه و تعیین حالت دسکتاپ یا موبایل.
   */
  useLayoutEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const updateBreakpoint = () => {
      const nextIsDesktop = media.matches;

      setIsDesktop((previous) =>
        previous === nextIsDesktop
          ? previous
          : nextIsDesktop
      );
    };

    updateBreakpoint();

    media.addEventListener("change", updateBreakpoint);

    return () => {
      media.removeEventListener("change", updateBreakpoint);
    };
  }, []);

  /**
   * اندازه‌گیری مجدد عناصر هنگام تغییر چیدمان.
   */
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
      cancelAnimationFrame(frame);
      observer.disconnect();

      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);

      dotsRef.current = [];
      dotProgressRef.current = [];
      previousDotStatesRef.current = [];
    };
  }, [measure]);

  /**
   * تعیین هدف حرکت خط براساس اسکرول صفحه.
   */
  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;

    if (!container || !table) return;

    const vh = window.innerHeight;
    const rect = container.getBoundingClientRect();

    const scrollable = rect.height - vh;

    const p =
      scrollable > 0
        ? clamp(-rect.top / scrollable, 0, 1)
        : 1;

    const headY =
      vh * (HEAD_START + HEAD_GAIN * p * p) -
      rect.top;

    target.set(lengthAt(table, headY));
  }, [target]);

  useMotionValueEvent(scrollY, "change", update);

  /**
   * به‌روزرسانی انیمیشن موبایل با مقدار Spring مخصوص موبایل.
   *
   * در هر فریم React دوباره render نمی‌شود؛
   * فقط ویژگی‌های لازم SVG به‌روزرسانی می‌شوند.
   */
  const updateMobileVisuals = useCallback(
    (value: number) => {
      if (isDesktop) return;

      const table = tableRef.current;

      if (!table) return;

      const mobilePath = mobilePathRef.current;

      if (mobilePath) {
        mobilePath.style.strokeOpacity = "1";

        if (reduceMotion) {
          mobilePath.style.strokeDashoffset = "0";
        } else {
          const safeProgress = clamp(value, 0, 1);

          mobilePath.style.strokeDashoffset = String(
            table.total * (1 - safeProgress)
          );
        }
      }

      if (!reduceMotion) {
        const head = headRef.current;

        if (head) {
          const point = pointAtProgress(
            table,
            value,
            true
          );

          head.setAttribute(
            "transform",
            `translate(${point.x} ${point.y})`
          );

          head.style.opacity =
            value > 0.002 && value < 0.998
              ? "1"
              : "0";
        }
      }

      syncDots(value);
    },
    [isDesktop, reduceMotion, syncDots]
  );

  /**
   * نکته مهم:
   * موبایل حالا از mobileProgress استفاده می‌کند،
   * نه از target مستقیم.
   */
  useMotionValueEvent(
    mobileProgress,
    "change",
    updateMobileVisuals
  );

  /**
   * پیش‌محاسبه مختصات مسیر.
   * getPointAtLength در هر فریم اسکرول اجرا نمی‌شود.
   */
  useLayoutEffect(() => {
    const path = trackRef.current;

    if (!path || !pathData.d) {
      tableRef.current = null;
      return;
    }

    const total = path.getTotalLength();

    const steps = clamp(
      Math.ceil(total / 6),
      120,
      1500
    );

    const xs: number[] = [];
    const ys: number[] = [];
    const rawYs: number[] = [];
    const ls: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const length = (total * i) / steps;
      const point = path.getPointAtLength(length);

      xs.push(point.x);

      // مختصات یکنواخت برای محاسبات پیشرفت و دسکتاپ
      ys.push(
        i === 0
          ? point.y
          : Math.max(point.y, ys[i - 1])
      );

      // مختصات واقعی برای حرکت سر خط در موبایل
      rawYs.push(point.y);

      ls.push(length);
    }

    tableRef.current = {
      xs,
      ys,
      rawYs,
      ls,
      total,
    };

    /**
     * آماده‌سازی strokeDashoffset در مسیر موبایل.
     */
    const mobilePath = mobilePathRef.current;

    if (!isDesktop && mobilePath) {
      mobilePath.style.strokeDasharray = String(total);

      mobilePath.style.strokeDashoffset = reduceMotion
        ? "0"
        : String(
            total * (1 - clamp(mobileProgress.get(), 0, 1))
          );

      mobilePath.style.strokeOpacity = "1";
    }

    /**
     * محاسبه پیشرفت نقطه‌های تایم‌لاین.
     */
    const container = containerRef.current;

    if (container) {
      const containerRect =
        container.getBoundingClientRect();

      dotProgressRef.current = dotsRef.current.map(
        (dot) => {
          const rect = dot.getBoundingClientRect();

          const y =
            rect.top +
            rect.height / 2 -
            containerRect.top;

          return lengthAt(tableRef.current!, y);
        }
      );
    }

    update();

    if (isDesktop) {
      syncDots(progress.get());
    } else {
      updateMobileVisuals(mobileProgress.get());
    }
  }, [
    pathData.d,
    isDesktop,
    reduceMotion,
    progress,
    mobileProgress,
    syncDots,
    update,
    updateMobileVisuals,
  ]);

  /**
   * دسکتاپ:
   * انیمیشن قبلی با progress و Spring اصلی حفظ می‌شود.
   */
  useMotionValueEvent(progress, "change", (value) => {
    if (!isDesktop) return;

    const head = headRef.current;
    const table = tableRef.current;

    if (head && table) {
      const point = pointAtProgress(table, value);

      head.setAttribute(
        "transform",
        `translate(${point.x} ${point.y})`
      );

      head.style.opacity =
        value > 0.002 && value < 0.998
          ? "1"
          : "0";
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
            {/* مسیر کم‌رنگ ثابت */}
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

            {isDesktop ? (
              /**
               * دسکتاپ: motion.path و تنظیمات قبلی.
               */
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
            ) : (
              /**
               * موبایل و تبلت: کنترل رسم خط با strokeDashoffset.
               */
              <path
                ref={mobilePathRef}
                d={pathData.d}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="md:[filter:drop-shadow(0_0_6px_color-mix(in_srgb,var(--brand-accent)_55%,transparent))]"
                style={{
                  stroke: "var(--brand-accent)",
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  strokeOpacity: 0,
                }}
              />
            )}

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
                  style={{
                    fill: "var(--brand-accent)",
                  }}
                />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}