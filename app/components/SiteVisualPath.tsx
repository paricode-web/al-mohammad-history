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
  desktop: boolean;
  /** فقط موبایل/تبلت: مسیر به قطعه‌های کوچک تقسیم می‌شود */
  segments: string[];
};

type Table = {
  xs: number[];
  ys: number[];
  ls: number[];
  total: number;
};

type SegmentState = {
  lens: number[];
  ends: number[];
  total: number;
  active: number;
  partial: number;
};

type Metrics = { top: number; height: number };

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

/** موبایل: چند تغییر لایه‌ی پشت‌سرهم یک بار اندازه‌گیری می‌شوند */
const MOBILE_MEASURE_DEBOUNCE = 120;

const EMPTY: PathData = {
  d: "",
  width: 0,
  height: 0,
  hiddenRect: null,
  desktop: true,
  segments: [],
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
 * مسیر موبایل با پیچ‌های نرم (هندسه‌ی دقیقاً مثل قبل).
 * به‌جای یک رشته‌ی بلند، آرایه‌ای از فرمان‌ها برمی‌گرداند تا هر فرمان
 * بتواند یک قطعه‌ی مستقل در موبایل باشد.
 */
function stepParts(from: Point, to: Point): { cmd: string; to: Point }[] {
  const run = Math.abs(to.x - from.x);
  const drop = to.y - from.y;
  const dir = to.x >= from.x ? 1 : -1;

  const r = Math.min(CORNER_RADIUS, Math.max(0, drop / 2), run / 2);

  if (run < 1 || drop < 1 || r < 1) {
    return [{ cmd: `L ${to.x} ${to.y}`, to }];
  }

  const midY = (from.y + to.y) / 2;
  const k = 0.5522847498;

  const firstCornerX = from.x + dir * r;
  const secondCornerX = to.x - dir * r;

  return [
    {
      cmd: `L ${from.x} ${midY - r}`,
      to: { x: from.x, y: midY - r },
    },
    {
      cmd: `C ${from.x} ${midY - r + k * r}, ${firstCornerX - dir * k * r} ${midY}, ${firstCornerX} ${midY}`,
      to: { x: firstCornerX, y: midY },
    },
    {
      cmd: `L ${secondCornerX} ${midY}`,
      to: { x: secondCornerX, y: midY },
    },
    {
      cmd: `C ${secondCornerX + dir * k * r} ${midY}, ${to.x} ${midY + r - k * r}, ${to.x} ${midY + r}`,
      to: { x: to.x, y: midY + r },
    },
    {
      cmd: `L ${to.x} ${to.y}`,
      to,
    },
  ];
}

/** مسیر کامل (d) + قطعه‌های جدا (برای موبایل) را با هم می‌سازد */
function createPathBuilder(start: Point) {
  const commands = [`M ${start.x} ${start.y}`];
  const segments: string[] = [];
  let cursor = start;

  const add = (cmd: string, to: Point) => {
    commands.push(cmd);
    segments.push(`M ${cursor.x} ${cursor.y} ${cmd}`);
    cursor = to;
  };

  return {
    curve(from: Point, to: Point) {
      add(makeCurve(from, to), to);
    },
    line(to: Point) {
      add(`L ${to.x} ${to.y}`, to);
    },
    step(from: Point, to: Point) {
      for (const part of stepParts(from, to)) add(part.cmd, part.to);
    },
    result() {
      return { d: commands.join(" "), segments };
    },
  };
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
    a.desktop === b.desktop &&
    sameRect
  );
}

/**
 * مستطیل بیرونی + سوراخ مستطیلی (با evenodd).
 * جایگزین سبک mask در موبایل: نتیجه‌ی ظاهری همان است ولی بافر خارج از صفحه‌ی عظیم نمی‌سازد.
 */
function clipWithHole(width: number, height: number, hole: Rect) {
  const { x, y, width: w, height: h } = hole;

  return `M0 0H${width}V${height}H0Z M${x} ${y}H${x + w}V${y + h}H${x}Z`;
}

/** کارهای سنگین را در زمان بیکاری مرورگر اجرا می‌کند (با جایگزین برای مرورگرهای قدیمی) */
function runWhenIdle(cb: () => void) {
  if (
    typeof window.requestIdleCallback === "function" &&
    typeof window.cancelIdleCallback === "function"
  ) {
    const id = window.requestIdleCallback(cb, { timeout: 250 });

    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(cb, 80);

  return () => window.clearTimeout(id);
}

/**
 * تبدیل مختصات عمودی به پیشرفت مسیر.
 * جست‌وجوی دودویی انجام می‌شود؛ نیازی به پیمایش کل جدول نیست.
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

    if (ys[mid] <= y) lo = mid;
    else hi = mid;
  }

  const span = ys[hi] - ys[lo];
  const k = span > 0 ? (y - ys[lo]) / span : 0;

  return (ls[lo] + (ls[hi] - ls[lo]) * k) / total;
}

/**
 * موقعیت سر مسیر را از جدول از پیش محاسبه‌شده به دست می‌آورد.
 * برخلاف getPointAtLength، این تابع در هر فریم به SVG مراجعه نمی‌کند.
 */
function pointAtProgress(table: Table, progress: number): Point {
  const { xs, ys, ls, total } = table;
  const n = ls.length;

  if (n === 0 || total <= 0) {
    return { x: 0, y: 0 };
  }

  const targetLength = clamp(progress, 0, 1) * total;

  if (targetLength <= 0) {
    return { x: xs[0], y: ys[0] };
  }

  if (targetLength >= total) {
    return { x: xs[n - 1], y: ys[n - 1] };
  }

  let lo = 0;
  let hi = n - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (ls[mid] <= targetLength) lo = mid;
    else hi = mid;
  }

  const span = ls[hi] - ls[lo];
  const t = span > 0 ? (targetLength - ls[lo]) / span : 0;

  return {
    x: xs[lo] + (xs[hi] - xs[lo]) * t,
    y: ys[lo] + (ys[hi] - ys[lo]) * t,
  };
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

  const dotsRef = useRef<HTMLElement[]>([]);
  const dotProgressRef = useRef<number[]>([]);
  const previousDotStatesRef = useRef<boolean[]>([]);

  // --- فقط برای بهینه‌سازی موبایل ---
  const desktopMqRef = useRef<MediaQueryList | null>(null);
  const isDesktopRef = useRef(true);
  const metricsRef = useRef<Metrics>({ top: 0, height: 0 });
  const viewportHeightRef = useRef(0);
  const headOpacityRef = useRef("0");
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);
  const segmentStateRef = useRef<SegmentState | null>(null);

  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const maskId = `route-mask-${uid}`;
  const clipId = `route-clip-${uid}`;

  const [pathData, setPathData] = useState<PathData>(EMPTY);

  const { scrollY } = useScroll();
  const target = useMotionValue(0);

  // تنظیمات اصلی حفظ شده‌اند.
  const progress = useSpring(target, {
    stiffness: 130,
    damping: 30,
    mass: 0.5,
    restDelta: 0.0005,
  });

  /**
   * فقط زمانی DOM را تغییر می‌دهد که وضعیت یک نقطه عوض شود.
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
   * موبایل: خط پرشونده از چند قطعه ساخته شده.
   * قطعه‌های رد شده ثابت می‌مانند و در هر فریم فقط قطعه‌ی فعال (کوچک) دوباره رسم می‌شود،
   * نه کل مسیر چند هزار پیکسلی. اجرای روان روی گوشی‌های ضعیف از همین‌جا می‌آید.
   */
  const paintSegment = useCallback(
    (i: number, mode: "hidden" | "full" | "partial", partial = 0) => {
      const el = segmentRefs.current[i];
      const state = segmentStateRef.current;

      if (!el || !state) return;

      if (mode === "hidden") {
        el.style.visibility = "hidden";
        return;
      }

      el.style.visibility = "visible";
      el.style.strokeDasharray =
        mode === "full" ? "" : `${partial} ${state.lens[i] + 1}`;
    },
    []
  );

  const applySegments = useCallback(
    (value: number, force = false) => {
      const state = segmentStateRef.current;

      if (!state) return;

      const { ends, lens, total } = state;
      const n = ends.length;

      if (n === 0 || total <= 0) return;

      const length = (reduceMotion ? 1 : clamp(value, 0, 1)) * total;

      // اولین قطعه‌ای که انتهایش به طول فعلی رسیده
      let active = -1;

      if (length > 0) {
        let lo = 0;
        let hi = n - 1;

        while (lo < hi) {
          const mid = (lo + hi) >> 1;

          if (ends[mid] >= length) hi = mid;
          else lo = mid + 1;
        }

        active = lo;
      }

      const previous = state.active;
      const partial = active >= 0 ? length - (ends[active] - lens[active]) : 0;

      // فقط وقتی قطعه‌ی فعال همان است و تغییر بسیار ریز است، کاری نکن
      if (
        !force &&
        active === previous &&
        Math.abs(partial - state.partial) < 0.1
      ) {
        return;
      }

      const from = force ? 0 : Math.max(0, Math.min(previous, active));
      const to = force ? n - 1 : Math.min(n - 1, Math.max(previous, active));

      for (let i = from; i <= to; i++) {
        if (i < active) {
          paintSegment(i, "full");
        } else if (i > active) {
          paintSegment(i, "hidden");
        } else if (partial < 0.25) {
          paintSegment(i, "hidden");
        } else if (partial >= lens[i] - 0.05) {
          paintSegment(i, "full");
        } else {
          paintSegment(i, "partial", partial);
        }
      }

      state.active = active;
      state.partial = partial;
    },
    [paintSegment, reduceMotion]
  );

  const update = useCallback(() => {
    const container = containerRef.current;
    const table = tableRef.current;

    if (!container || !table) return;

    let vh: number;
    let top: number;
    let height: number;

    if (isDesktopRef.current) {
      // دسکتاپ: دقیقاً مثل قبل
      vh = window.innerHeight;

      const rect = container.getBoundingClientRect();

      top = rect.top;
      height = rect.height;
    } else {
      // موبایل: بدون خواندن layout در هر فریم اسکرول (جلوگیری از reflow اجباری)
      vh = viewportHeightRef.current || window.innerHeight;

      const metrics = metricsRef.current;

      top = metrics.top - scrollY.get();
      height = metrics.height;
    }

    const scrollable = height - vh;

    const p = scrollable > 0 ? clamp(-top / scrollable, 0, 1) : 1;

    const headY = vh * (HEAD_START + HEAD_GAIN * p * p) - top;

    target.set(lengthAt(table, headY));
  }, [scrollY, target]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const mq = (desktopMqRef.current ??= window.matchMedia(DESKTOP_QUERY));
    const isDesktop = mq.matches;

    isDesktopRef.current = isDesktop;
    viewportHeightRef.current = window.innerHeight;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const containerRect = container.getBoundingClientRect();

    metricsRef.current = {
      top: containerRect.top + window.scrollY,
      height: containerRect.height,
    };

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
          Number(a.dataset.linePathPoint) - Number(b.dataset.linePathPoint)
      )
      .map((el) => centerOf(el))
      .filter((p): p is Point => p !== null);

    const firstHighlight =
      highlightPoints[0] ??
      centerOf(container.querySelector(SELECTORS.highlightStart));

    const dots = Array.from(
      container.querySelectorAll<HTMLElement>(SELECTORS.timelineDots)
    );

    dotsRef.current = dots;
    previousDotStatesRef.current = dots.map(() => false);

    const dotYs = dots.map((dot) => {
      const rect = dot.getBoundingClientRect();

      return rect.top + rect.height / 2 - containerRect.top;
    });

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
    let segments: string[] = [];

    if (
      !isDesktop &&
      start &&
      firstHighlight &&
      meanderTops.length > 0 &&
      meanderTops.length === meanderBottoms.length
    ) {
      const lastIndex = meanderTops.length - 1;
      const builder = createPathBuilder(start);

      builder.curve(start, meanderTops[0]);

      for (let i = 0; i <= lastIndex; i++) {
        builder.line(meanderBottoms[i]);

        if (i < lastIndex) {
          builder.step(meanderBottoms[i], meanderTops[i + 1]);
        }
      }

      builder.curve(meanderBottoms[lastIndex], firstHighlight);

      for (let i = 1; i < highlightPoints.length; i++) {
        builder.curve(highlightPoints[i - 1], highlightPoints[i]);
      }

      ({ d, segments } = builder.result());
    } else if (start && timelineStart && timelineEnd && firstHighlight) {
      const verticalEnd = {
        x: timelineStart.x,
        y: timelineEnd.y,
      };

      const builder = createPathBuilder(start);

      builder.curve(start, timelineStart);
      builder.line(verticalEnd);
      builder.curve(verticalEnd, firstHighlight);

      for (let i = 1; i < highlightPoints.length; i++) {
        builder.curve(highlightPoints[i - 1], highlightPoints[i]);
      }

      ({ d, segments } = builder.result());
    }

    const next: PathData = {
      d,
      width,
      height,
      hiddenRect,
      desktop: isDesktop,
      segments: isDesktop ? [] : segments,
    };

    setPathData((prev) => (samePath(prev, next) ? prev : next));

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
    let timer = 0;
    let lastWidth = window.innerWidth;

    const schedule = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);

      // دسکتاپ: مثل قبل | موبایل: چند تغییر پشت‌سرهم یک اندازه‌گیری
      if (isDesktopRef.current) {
        frame = requestAnimationFrame(measure);
        return;
      }

      timer = window.setTimeout(() => {
        frame = requestAnimationFrame(measure);
      }, MOBILE_MEASURE_DEBOUNCE);
    };

    const onResize = () => {
      const width = window.innerWidth;
      const widthChanged = width !== lastWidth;

      lastWidth = width;

      // موبایل: بالا/پایین رفتن نوار آدرس هنگام اسکرول فقط ارتفاع دید را عوض می‌کند.
      // اندازه‌گیری مجدد کل صفحه لازم نیست و باعث گیر کردن اسکرول می‌شد.
      if (!isDesktopRef.current && !widthChanged) {
        viewportHeightRef.current = window.innerHeight;
        update();
        return;
      }

      schedule();
    };

    measure();

    // مرورگرهای خیلی قدیمی ResizeObserver ندارند؛ در آن حالت فقط resize و load کافی است.
    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);

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
        .forEach((el) => observer?.observe(el));
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer?.disconnect();

      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", schedule);

      dotsRef.current = [];
      dotProgressRef.current = [];
      previousDotStatesRef.current = [];
    };
  }, [measure, update]);

  useMotionValueEvent(scrollY, "change", update);

  /**
   * ساخت جدول مختصات مسیر + اطلاعات قطعه‌های موبایل.
   * دسکتاپ: مثل قبل و همان لحظه.
   * موبایل: قطعه‌ها همیشه فوری (ارزان)؛ جدول نمونه‌برداری بار اول فوری و دفعات بعد
   * در زمان بیکاری، و با نمونه‌برداری کم‌تراکم‌تر.
   */
  useLayoutEffect(() => {
    const path = trackRef.current;

    if (!path || !pathData.d) {
      tableRef.current = null;
      segmentStateRef.current = null;
      return;
    }

    if (pathData.desktop) {
      segmentStateRef.current = null;
    } else {
      segmentRefs.current.length = pathData.segments.length;

      const lens = pathData.segments.map(
        (_, i) => segmentRefs.current[i]?.getTotalLength() ?? 0
      );

      let sum = 0;
      const ends = lens.map((len) => (sum += len));

      segmentStateRef.current = {
        lens,
        ends,
        total: sum,
        active: -2,
        partial: -1,
      };

      applySegments(progress.get(), true);
    }

    const build = () => {
      const el = trackRef.current;
      if (!el) return;

      const total = el.getTotalLength();
      const divisor = pathData.desktop ? 6 : 10;
      const steps = clamp(Math.ceil(total / divisor), 120, 1500);

      const xs: number[] = [];
      const ys: number[] = [];
      const ls: number[] = [];

      for (let i = 0; i <= steps; i++) {
        const length = (total * i) / steps;
        const point = el.getPointAtLength(length);

        xs.push(point.x);

        // حفظ رفتار قبلی برای محاسبه پیشرفت بر اساس محور Y
        ys.push(i === 0 ? point.y : Math.max(point.y, ys[i - 1]));

        ls.push(length);
      }

      tableRef.current = { xs, ys, ls, total };

      const container = containerRef.current;

      if (container) {
        const containerRect = container.getBoundingClientRect();

        dotProgressRef.current = dotsRef.current.map((dot) => {
          const rect = dot.getBoundingClientRect();
          const y = rect.top + rect.height / 2 - containerRect.top;

          return lengthAt(tableRef.current!, y);
        });
      }

      update();
      syncDots(progress.get());
    };

    if (pathData.desktop || tableRef.current === null) {
      build();
      return;
    }

    return runWhenIdle(build);
  }, [
    pathData.d,
    pathData.desktop,
    pathData.segments,
    applySegments,
    progress,
    syncDots,
    update,
  ]);

  /**
   * دیگر در هر فریم getPointAtLength فراخوانی نمی‌شود.
   * موقعیت سر مسیر از جدول مختصات محاسبه می‌شود.
   */
  useMotionValueEvent(progress, "change", (value) => {
    const head = headRef.current;
    const table = tableRef.current;

    if (head && table) {
      const point = pointAtProgress(table, value);

      head.setAttribute("transform", `translate(${point.x} ${point.y})`);

      const nextOpacity = value > 0.002 && value < 0.998 ? "1" : "0";

      if (headOpacityRef.current !== nextOpacity) {
        headOpacityRef.current = nextOpacity;
        head.style.opacity = nextOpacity;
      }
    }

    syncDots(value);

    if (!reduceMotion) applySegments(value);
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
            {pathData.desktop ? (
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
              pathData.hiddenRect && (
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <path
                    clipRule="evenodd"
                    d={clipWithHole(
                      pathData.width,
                      pathData.height,
                      pathData.hiddenRect
                    )}
                  />
                </clipPath>
              )
            )}
          </defs>

          <g
            mask={pathData.desktop ? `url(#${maskId})` : undefined}
            clipPath={
              !pathData.desktop && pathData.hiddenRect
                ? `url(#${clipId})`
                : undefined
            }
          >
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

            {pathData.desktop ? (
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
              pathData.segments.map((segment, i) => (
                <path
                  key={i}
                  ref={(el) => {
                    segmentRefs.current[i] = el;
                  }}
                  d={segment}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="md:[filter:drop-shadow(0_0_6px_color-mix(in_srgb,var(--brand-accent)_55%,transparent))]"
                  style={{
                    stroke: "var(--brand-accent)",
                    visibility: "hidden",
                  }}
                />
              ))
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

                <circle r="4" style={{ fill: "var(--brand-accent)" }} />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
