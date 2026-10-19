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

// فقط موبایل: حداقل تغییری که ارزش بازنقاشی دارد (به پیکسل)
const MOBILE_MIN_DELTA = 0.25;

const EMPTY: PathData = {
  d: "",
  width: 0,
  height: 0,
  hiddenRect: null,
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

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
 * مسیر موبایل با پیچ‌های نرم.
 * شکل مسیر دسکتاپ تغییری نمی‌کند.
 */
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
 * تبدیل مختصات عمودی به پیشرفت مسیر با جست‌وجوی دودویی.
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
 * به دست آوردن موقعیت سر مسیر بدون فراخوانی SVG در هر فریم.
 *
 * rawYs برای حرکت روی مختصات واقعی منحنی موبایل استفاده می‌شود.
 * دسکتاپ همچنان از محاسبه‌ی قبلی استفاده می‌کند.
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
  const t = span > 0 ? (targetLength - ls[lo]) / span : 0;

  return {
    x: xs[lo] + (xs[hi] - xs[lo]) * t,
    y: pointYs[lo] + (pointYs[hi] - pointYs[lo]) * t,
  };
}

/**
 * وضعیت آخرین مقادیری که روی DOM نوشته شده‌اند (فقط موبایل).
 * با این کار از نوشتن‌های تکراری و بازنقاشی بی‌اثر جلوگیری می‌شود.
 */
type MobileDomState = {
  offset: number;
  headX: number;
  headY: number;
  headOpacity: string;
};

const freshMobileState = (): MobileDomState => ({
  offset: NaN,
  headX: NaN,
  headY: NaN,
  headOpacity: "",
});

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

  // فقط موبایل
  const mobileStateRef = useRef<MobileDomState>(freshMobileState());
  const vhRef = useRef(0);
  const vhWidthRef = useRef(0);

  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const maskId = `route-mask-${uid}`;
  const clipId = `route-clip-${uid}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);
  const [isDesktop, setIsDesktop] = useState(false);

  const { scrollY } = useScroll();

  // دسکتاپ و موبایل هرکدام target مستقل دارند تا Spring بلااستفاده
  // در هر فریم اجرا نشود.
  const target = useMotionValue(0);
  const mobileTarget = useMotionValue(0);

  /**
   * دسکتاپ: تنظیمات اصلی و قبلی بدون تغییر.
   */
  const progress = useSpring(target, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  /**
   * موبایل و تبلت: Spring مستقل با حرکت آرام‌تر (بدون تغییر).
   */
  const mobileProgress = useSpring(mobileTarget, {
    stiffness: 100,
    damping: 32,
    mass: 0.6,
    restDelta: 0.0005,
  });

  /**
   * تغییر DOM فقط زمانی انجام می‌شود که وضعیت یک نقطه عوض شود.
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
   * اندازه‌گیری عناصر صفحه و ساخت مسیر SVG.
   */
  const measure = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;

    // موبایل: ارتفاع ویوپورت فقط وقتی عرض عوض شود (چرخش صفحه) ثبت می‌شود.
    // نوار آدرس مرورگر موبایل هنگام اسکرول ارتفاع را تغییر می‌دهد و اگر
    // مستقیم خوانده شود، نوک خط مدام می‌پرد.
    if (
      !desktop &&
      (!vhRef.current || vhWidthRef.current !== window.innerWidth)
    ) {
      vhRef.current = window.innerHeight;
      vhWidthRef.current = window.innerWidth;
    }

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
      .filter((point): point is Point => point !== null);

    const firstHighlight =
      highlightPoints[0] ??
      centerOf(container.querySelector(SELECTORS.highlightStart));

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

      return rect.top + rect.height / 2 - containerRect.top;
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
            makeStep(meanderBottoms[i], meanderTops[i + 1])
          );
        }
      }

      commands.push(
        makeCurve(meanderBottoms[lastIndex], firstHighlight)
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

    setPathData((prev) =>
      samePath(prev, next) ? prev : next
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
   * تشخیص breakpoint؛ بدون دسترسی به window هنگام SSR.
   */
  useLayoutEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const updateBreakpoint = () => {
      setIsDesktop((previous) =>
        previous === media.matches ? previous : media.matches
      );
    };

    updateBreakpoint();
    media.addEventListener("change", updateBreakpoint);

    return () => {
      media.removeEventListener("change", updateBreakpoint);
    };
  }, []);

  /**
   * مشاهده تغییر ابعاد صفحه و عناصر.
   */
  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let frame = 0;
    let lastWidth = window.innerWidth;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    // موبایل: باز و بسته شدن نوار آدرس هنگام اسکرول رویداد resize
    // می‌فرستد که فقط ارتفاع را عوض می‌کند. اندازه‌گیری و ساخت دوباره‌ی
    // جدول مسیر برای آن لازم نیست. تغییر واقعی چیدمان را ResizeObserver
    // می‌گیرد. دسکتاپ مثل قبل عمل می‌کند.
    const onResize = () => {
      const desktop = window.matchMedia(DESKTOP_QUERY).matches;

      if (!desktop && window.innerWidth === lastWidth) return;

      lastWidth = window.innerWidth;
      schedule();
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

    window.addEventListener("resize", onResize);
    window.addEventListener("load", schedule);

    document.fonts?.ready.then(schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", schedule);

      dotsRef.current = [];
      dotProgressRef.current = [];
      previousDotStatesRef.current = [];
    };
  }, [measure]);

  /**
   * محاسبه موقعیت هدف خط براساس اسکرول.
   * دسکتاپ و موبایل هرکدام به target خودشان می‌نویسند.
   */
  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;

    if (!container || !table) return;

    // موبایل: ارتفاع ثابت (نه innerHeight متغیر)
    const vh = isDesktop
      ? window.innerHeight
      : vhRef.current || window.innerHeight;

    const rect = container.getBoundingClientRect();
    const scrollable = rect.height - vh;

    const p =
      scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 1;

    const headY =
      vh * (HEAD_START + HEAD_GAIN * p * p) - rect.top;

    const value = lengthAt(table, headY);

    if (isDesktop) {
      target.set(value);
    } else {
      mobileTarget.set(value);
    }
  }, [isDesktop, target, mobileTarget]);

  useMotionValueEvent(scrollY, "change", update);

  /**
   * به‌روزرسانی مسیر موبایل با مقدار mobileProgress.
   * فقط وقتی مقدار واقعاً تغییر کرده به DOM نوشته می‌شود تا
   * بازنقاشی‌های بی‌اثر حذف شوند.
   */
  const updateMobileVisuals = useCallback(
    (value: number) => {
      if (isDesktop) return;

      const table = tableRef.current;

      if (!table) return;

      const state = mobileStateRef.current;
      const mobilePath = mobilePathRef.current;

      if (mobilePath) {
        const offset = reduceMotion
          ? 0
          : table.total * (1 - clamp(value, 0, 1));

        const changed =
          offset !== state.offset &&
          (Number.isNaN(state.offset) ||
            Math.abs(offset - state.offset) >= MOBILE_MIN_DELTA ||
            offset === 0 ||
            offset === table.total);

        if (changed) {
          state.offset = offset;
          mobilePath.style.strokeDashoffset = offset.toFixed(2);
        }
      }

      if (!reduceMotion) {
        const head = headRef.current;

        if (head) {
          const point = pointAtProgress(table, value, true);

          if (
            Number.isNaN(state.headX) ||
            Math.abs(point.x - state.headX) >= MOBILE_MIN_DELTA ||
            Math.abs(point.y - state.headY) >= MOBILE_MIN_DELTA
          ) {
            state.headX = point.x;
            state.headY = point.y;

            head.setAttribute(
              "transform",
              `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`
            );
          }

          const opacity =
            value > 0.002 && value < 0.998 ? "1" : "0";

          if (state.headOpacity !== opacity) {
            state.headOpacity = opacity;
            head.style.opacity = opacity;
          }
        }
      }

      syncDots(value);
    },
    [isDesktop, reduceMotion, syncDots]
  );

  /**
   * موبایل: Spring مستقل.
   */
  useMotionValueEvent(
    mobileProgress,
    "change",
    updateMobileVisuals
  );

  /**
   * پیش‌محاسبه جدول مختصات مسیر.
   * getPointAtLength فقط زمان ایجاد یا تغییر مسیر اجرا می‌شود.
   */
  useLayoutEffect(() => {
    const path = trackRef.current;

    if (!path || !pathData.d) {
      tableRef.current = null;
      return;
    }

    const total = path.getTotalLength();
    const steps = clamp(Math.ceil(total / 6), 120, 1500);

    const xs: number[] = [];
    const ys: number[] = [];
    const rawYs: number[] = [];
    const ls: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const length = (total * i) / steps;
      const point = path.getPointAtLength(length);

      xs.push(point.x);

      // Y یکنواخت برای محاسبه پیشرفت و حفظ رفتار دسکتاپ
      ys.push(
        i === 0
          ? point.y
          : Math.max(point.y, ys[i - 1])
      );

      // Y واقعی برای حرکت سر خط روی پیچ‌های موبایل
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

    // مسیر یا المان عوض شده؛ کش مقادیر نوشته‌شده نامعتبر است.
    mobileStateRef.current = freshMobileState();

    /**
     * مقداردهی اولیه مسیر موبایل.
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
     * محاسبه پیشرفت نقاط تایم‌لاین.
     */
    const container = containerRef.current;

    if (container) {
      const containerRect = container.getBoundingClientRect();

      dotProgressRef.current = dotsRef.current.map((dot) => {
        const rect = dot.getBoundingClientRect();
        const y =
          rect.top + rect.height / 2 - containerRect.top;

        return lengthAt(tableRef.current!, y);
      });
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
   * دسکتاپ: همان انیمیشن Spring قبلی.
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
        value > 0.002 && value < 0.998 ? "1" : "0";
    }

    syncDots(value);
  });

  /**
   * موبایل: به‌جای mask (که یک سطح آفلاین به اندازه‌ی کل صفحه می‌سازد)
   * از clipPath با قانون evenodd استفاده می‌شود. خروجی تصویری یکسان است
   * اما هزینه‌ی رندر خیلی کمتر است.
   */
  const clipD = (() => {
    const { width: w, height: h, hiddenRect: r } = pathData;

    let d = `M0 0H${w}V${h}H0Z`;

    if (r) {
      d += ` M${r.x} ${r.y}H${r.x + r.width}V${r.y + r.height}H${r.x}Z`;
    }

    return d;
  })();

  return (
    <div ref={containerRef} className="relative">
      {children}

      {pathData.d && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
          viewBox={`0 0 ${pathData.width} ${pathData.height}`}
          preserveAspectRatio="none"
          // موبایل: لایه‌ی جداگانه تا بازنقاشی خط، متن‌ها و عکس‌های زیرش
          // را دوباره رسم نکند.
          style={isDesktop ? undefined : { willChange: "transform" }}
        >
          <defs>
            {isDesktop ? (
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
            ) : (
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <path clipRule="evenodd" d={clipD} />
              </clipPath>
            )}
          </defs>

          <g
            mask={isDesktop ? `url(#${maskId})` : undefined}
            clipPath={isDesktop ? undefined : `url(#${clipId})`}
          >
            {/* مسیر زمینه */}
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
              /*
               * دسکتاپ:
               * motion.path، pathLength و Spring قبلی حفظ شده‌اند.
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
              /*
               * موبایل:
               * رسم تدریجی مسیر با strokeDashoffset و mobileProgress.
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
