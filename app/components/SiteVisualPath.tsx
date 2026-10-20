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
  /** هندسه‌ی واقعی مسیر (برای جای سر مسیر) */
  xs: number[];
  ys: number[];
  ls: number[];
  /**
   * نقاط کنترل «اسکرول → طول مسیر». روی موبایل، پیمایش افقی پیچ‌ها از
   * بازه‌ی اسکرول اطراف قرض می‌گیرد تا سر مسیر ناگهان نپرد.
   */
  cy: number[];
  cl: number[];
  total: number;
};

type SegmentState = {
  lens: number[];
  ends: number[];
  total: number;
  active: number;
  partial: number;
  /** آخرین حالتی که روی DOM اعمال شده؛ برای جلوگیری از نوشتن‌های تکراری استایل */
  painted: string[];
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
const MOBILE_MEASURE_DEBOUNCE = 220;

/**
 * موبایل: حداکثر طول هر قطعه (پیکسل).
 * قطعه‌ی فعال در هر فریم دوباره رسم می‌شود، پس هرچه کوتاه‌تر باشد
 * ناحیه‌ی بازرسم‌شده کوچک‌تر و فریم سبک‌تر است.
 */
const MAX_SEGMENT_LENGTH = 140;

/** موبایل: تغییرات پیشروی کمتر از این مقدار (پیکسل) اصلاً رسم نمی‌شوند */
const PARTIAL_EPSILON = 0.5;

/**
 * همگام‌سازی دایره‌ها با نوک خط (دسکتاپ و موبایل):
 * - FILL_WINDOW_PX: از این فاصله قبل از رسیدن نوک به مرکز دایره، پر شدن شروع
 *   می‌شود و دقیقاً وقتی نوک به مرکز رسید کامل است (متغیر --line-fill از ۰ تا ۱).
 * - LEAD_PX: data-line-passed کمی زودتر true می‌شود تا ترنزیشن CSS دایره
 *   عقب‌تر از خط نماند.
 */
const FILL_WINDOW_PX = 36;
const LEAD_PX = 12;

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

const round = (v: number) => Math.round(v * 100) / 100;

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

/**
 * یک منحنی بزیه‌ی مکعبی را به n زیرمنحنی دقیقاً هم‌شکل تقسیم می‌کند.
 * شکل نهایی هیچ تغییری نمی‌کند؛ فقط به قطعه‌های کوتاه‌تر شکسته می‌شود.
 */
function splitCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  n: number
): { c1: Point; c2: Point; to: Point }[] {
  const at = (t: number): Point => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;

    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
  };

  const derivative = (t: number): Point => {
    const u = 1 - t;
    const a = 3 * u * u;
    const b = 6 * u * t;
    const c = 3 * t * t;

    return {
      x: a * (p1.x - p0.x) + b * (p2.x - p1.x) + c * (p3.x - p2.x),
      y: a * (p1.y - p0.y) + b * (p2.y - p1.y) + c * (p3.y - p2.y),
    };
  };

  const parts: { c1: Point; c2: Point; to: Point }[] = [];

  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const dt = (t1 - t0) / 3;

    const q0 = at(t0);
    const q3 = i === n - 1 ? p3 : at(t1);
    const d0 = derivative(t0);
    const d1 = derivative(t1);

    parts.push({
      c1: { x: q0.x + d0.x * dt, y: q0.y + d0.y * dt },
      c2: { x: q3.x - d1.x * dt, y: q3.y - d1.y * dt },
      to: q3,
    });
  }

  return parts;
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
      const cmd = makeCurve(from, to);
      commands.push(cmd);

      const middleY = (from.y + to.y) / 2;
      const c1 = { x: from.x, y: middleY };
      const c2 = { x: to.x, y: middleY };

      // تخمین طول: میانگین وتر و چندضلعی کنترل
      const chord = Math.hypot(to.x - from.x, to.y - from.y);
      const polygon =
        Math.hypot(c1.x - from.x, c1.y - from.y) +
        Math.hypot(c2.x - c1.x, c2.y - c1.y) +
        Math.hypot(to.x - c2.x, to.y - c2.y);
      const estimate = (chord + polygon) / 2;
      const n = Math.max(1, Math.ceil(estimate / MAX_SEGMENT_LENGTH));

      if (n === 1) {
        segments.push(`M ${cursor.x} ${cursor.y} ${cmd}`);
        cursor = to;
        return;
      }

      for (const part of splitCubic(from, c1, c2, to, n)) {
        segments.push(
          `M ${round(cursor.x)} ${round(cursor.y)} C ${round(part.c1.x)} ${round(part.c1.y)}, ${round(part.c2.x)} ${round(part.c2.y)}, ${round(part.to.x)} ${round(part.to.y)}`
        );
        cursor = part.to;
      }

      cursor = to;
    },
    line(to: Point) {
      commands.push(`L ${to.x} ${to.y}`);

      const length = Math.hypot(to.x - cursor.x, to.y - cursor.y);
      const n = Math.max(1, Math.ceil(length / MAX_SEGMENT_LENGTH));
      const origin = cursor;

      for (let i = 1; i <= n; i++) {
        const point =
          i === n
            ? to
            : {
                x: origin.x + ((to.x - origin.x) * i) / n,
                y: origin.y + ((to.y - origin.y) * i) / n,
              };

        segments.push(
          `M ${round(cursor.x)} ${round(cursor.y)} L ${round(point.x)} ${round(point.y)}`
        );
        cursor = point;
      }
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
  const { cy: ys, cl: ls, total } = table;
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

/** درون‌یابی خطی طول مسیر برای یک y روی نمونه‌های یکنواخت */
function interpLength(ys: number[], ls: number[], y: number) {
  const n = ys.length;

  if (y <= ys[0]) return ls[0];
  if (y >= ys[n - 1]) return ls[n - 1];

  let lo = 0;
  let hi = n - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (ys[mid] <= y) lo = mid;
    else hi = mid;
  }

  const span = ys[hi] - ys[lo];
  const k = span > 0 ? (y - ys[lo]) / span : 0;

  return ls[lo] + (ls[hi] - ls[lo]) * k;
}

/** شیبی (dy/dl) که زیر آن نمونه «افقی» حساب می‌شود */
const FLAT_SLOPE = 0.5;
/** بیشترین بازه‌ی اسکرول (px) که هر پیچ از بالا و پایین قرض می‌گیرد */
const MAX_BORROW = 96;

/**
 * مشکل: lengthAt بر اساس y کار می‌کند ولی در پیچ‌های افقی موبایل y ثابت است،
 * پس با ۱px اسکرول سر مسیر صدها پیکسل می‌پرید.
 *
 * راه‌حل: برای هر ردیف افقی، بازه‌ای از اسکرول (حداکثر MAX_BORROW از هر طرف)
 * کنار گذاشته می‌شود و کل مسیر افقی + بخش‌های عمودی کوتاه کنار آن به‌صورت
 * خطی و پیوسته در همان بازه پیموده می‌شود. هندسه‌ی مسیر تغییر نمی‌کند.
 */
function buildScrollControls(ys: number[], ls: number[], borrow: boolean) {
  const n = ys.length;

  if (!borrow || n < 3) {
    return { cy: ys.slice(), cl: ls.slice() };
  }

  // 1) پیدا کردن ردیف‌های افقی [a, b] (اندیس نمونه‌ها)
  const runs: [number, number][] = [];
  let start = -1;

  for (let i = 1; i < n; i++) {
    const dl = ls[i] - ls[i - 1];
    const flat = dl > 0 && (ys[i] - ys[i - 1]) / dl < FLAT_SLOPE;

    if (flat && start < 0) start = i - 1;

    if (!flat && start >= 0) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }

  if (start >= 0) runs.push([start, n - 1]);

  if (runs.length === 0) {
    return { cy: ys.slice(), cl: ls.slice() };
  }

  // 2) پنجره‌ی قرض‌گرفته‌شده برای هر ردیف
  const windows: { lo: number; hi: number; llo: number; lhi: number }[] = [];

  runs.forEach(([a, b], k) => {
    const yA = ys[a];
    const yB = ys[b];

    const prevY = k > 0 ? ys[runs[k - 1][1]] : ys[0];
    const nextY = k < runs.length - 1 ? ys[runs[k + 1][0]] : ys[n - 1];

    const room = Math.min((yA - prevY) / 2, (nextY - yB) / 2);
    const B = clamp(room, 0, MAX_BORROW);

    // جایی برای قرض گرفتن نیست؛ همان رفتار قبلی
    if (B < 1) return;

    const lo = yA - B;
    const hi = yB + B;

    windows.push({
      lo,
      hi,
      llo: interpLength(ys, ls, lo),
      lhi: interpLength(ys, ls, hi),
    });
  });

  // 3) نمونه‌های داخل پنجره حذف و با دو نقطه‌ی کنترل جایگزین می‌شوند
  const pts: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const inside = windows.some((w) => ys[i] > w.lo && ys[i] < w.hi);

    if (!inside) pts.push([ys[i], ls[i]]);
  }

  for (const w of windows) {
    pts.push([w.lo, w.llo], [w.hi, w.lhi]);
  }

  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);

  return { cy: pts.map((p) => p[0]), cl: pts.map((p) => p[1]) };
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
  const headRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<Table | null>(null);

  const dotsRef = useRef<HTMLElement[]>([]);
  const dotProgressRef = useRef<number[]>([]);
  const previousDotStatesRef = useRef<boolean[]>([]);
  const previousFillRef = useRef<number[]>([]);
  const hiddenRectRef = useRef<Rect | null>(null);

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

  // دستگاه موبایل/تبلت است یا نه (فقط یک بار، برای انتخاب تنظیمات فنر)
  const [isMobileDevice] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      !window.matchMedia(DESKTOP_QUERY).matches
  );

  // دسکتاپ: تنظیمات اصلی حفظ شده‌اند.
  // موبایل: فنر کمی سریع‌تر آرام می‌گیرد؛ حس نرمی همان است ولی فریم‌های
  // انتهایی (که فقط کار اضافه برای CPU ضعیف‌اند) کمتر می‌شوند.
  const progress = useSpring(
    target,
    isMobileDevice
      ? { stiffness: 150, damping: 28, mass: 0.5, restDelta: 0.001 }
      : { stiffness: 130, damping: 30, mass: 0.5, restDelta: 0.0005 }
  );

  /**
   * فقط زمانی DOM را تغییر می‌دهد که وضعیت یک نقطه عوض شود.
   */
  const syncDots = useCallback(
    (value: number) => {
      const dots = dotsRef.current;
      const starts = dotProgressRef.current;
      const previous = previousDotStatesRef.current;
      const fills = previousFillRef.current;
      const table = tableRef.current;

      const windowSize = table && table.total > 0 ? FILL_WINDOW_PX / table.total : 0;
      const lead = table && table.total > 0 ? LEAD_PX / table.total : 0;

      for (let i = 0; i < dots.length; i++) {
        const start = starts[i];

        if (start === undefined) continue;

        const passed = reduceMotion || value >= start - lead;

        if (previous[i] !== passed) {
          previous[i] = passed;
          dots[i].dataset.linePassed = String(passed);
        }

        // پر شدن پیوسته: ۰ تا ۱ دقیقاً هم‌پای نزدیک شدن نوک خط
        let fill: number;

        if (reduceMotion) {
          fill = 1;
        } else if (windowSize > 0) {
          const raw = clamp((value - (start - windowSize)) / windowSize, 0, 1);

          // easeOut ملایم تا پر شدن نرم‌تر حس شود
          fill = 1 - Math.pow(1 - raw, 2);
        } else {
          fill = value >= start ? 1 : 0;
        }

        fill = Math.round(fill * 50) / 50;

        if (fills[i] !== fill) {
          fills[i] = fill;
          dots[i].style.setProperty("--line-fill", String(fill));
        }
      }
    },
    [reduceMotion]
  );

  /**
   * موبایل: خط پرشونده از چند قطعه ساخته شده.
   * قطعه‌های رد شده ثابت می‌مانند و در هر فریم فقط قطعه‌ی فعال (کوچک) دوباره رسم می‌شود،
   * نه کل مسیر چند هزار پیکسلی. اجرای روان روی گوشی‌های ضعیف از همین‌جا می‌آید.
   *
   * بهبود: اگر حالت قطعه نسبت به آخرین رسم تغییری نکرده باشد، هیچ استایلی
   * نوشته نمی‌شود (جلوگیری از invalidate بی‌دلیل).
   */
  const paintSegment = useCallback(
    (i: number, mode: "hidden" | "full" | "partial", partial = 0) => {
      const el = segmentRefs.current[i];
      const state = segmentStateRef.current;

      if (!el || !state) return;

      const key = mode === "partial" ? `p${partial.toFixed(1)}` : mode;

      if (state.painted[i] === key) return;

      state.painted[i] = key;

      if (mode === "hidden") {
        el.style.visibility = "hidden";
        return;
      }

      el.style.visibility = "visible";
      el.style.strokeDasharray =
        mode === "full" ? "" : `${partial.toFixed(1)} ${state.lens[i] + 1}`;
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
        Math.abs(partial - state.partial) < PARTIAL_EPSILON
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
    const value = lengthAt(table, headY);

    if (isDesktopRef.current) {
      // دسکتاپ (Lenis قبلاً اسکرول را نرم می‌کند): همان فنر قبلی
      target.set(value);
    } else {
      // موبایل: اسکرول لمسی خودش نرم است؛ فنر فقط تأخیر ~۲۳۰ms اضافه می‌کرد.
      // مقدار مستقیم و بدون انیمیشن نوشته می‌شود تا سر مسیر هم‌گام با محتوا بماند.
      progress.jump(value);
    }
  }, [scrollY, target, progress]);

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
    previousFillRef.current = dots.map(() => -1);

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

  let updateFrame = 0;
  let frame = 0;
  let timer = 0;
  let lastWidth = window.innerWidth;

  const schedule = () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);

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

    // تغییر ارتفاع نوار آدرس موبایل نیاز به اندازه‌گیری مجدد مسیر ندارد.
    if (!isDesktopRef.current && !widthChanged) {
      viewportHeightRef.current = window.innerHeight;

      cancelAnimationFrame(updateFrame);
      updateFrame = requestAnimationFrame(update);

      return;
    }

    schedule();
  };

  measure();

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
    cancelAnimationFrame(updateFrame);
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);

    observer?.disconnect();

    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", schedule);

    dotsRef.current = [];
    dotProgressRef.current = [];
    previousDotStatesRef.current = [];
    previousFillRef.current = [];
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

    hiddenRectRef.current = pathData.hiddenRect;

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
if (process.env.NODE_ENV === "development") {
  console.info("[SiteVisualPath] Mobile segments:", lens.length);
}
      let sum = 0;
      const ends = lens.map((len) => (sum += len));

      segmentStateRef.current = {
        lens,
        ends,
        total: sum,
        active: -2,
        partial: -1,
        painted: new Array(lens.length).fill(""),
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

      const { cy, cl } = buildScrollControls(ys, ls, !pathData.desktop);

      tableRef.current = { xs, ys, ls, cy, cl, total };

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
    pathData.hiddenRect,
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

      // ترنسفورم CSS روی یک المان HTML جدا؛ مرورگر آن را به لایه‌ی GPU می‌برد
      // و با حرکت سر، SVG بلند صفحه دوباره رسم نمی‌شود.
      head.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;

      // SVG قبلاً سر را داخل ناحیه‌ی مخفی‌ی عنوان کلیپ می‌کرد؛ حالا دستی.
      const r = hiddenRectRef.current;
      const inTitle =
        !!r &&
        point.x >= r.x &&
        point.x <= r.x + r.width &&
        point.y >= r.y &&
        point.y <= r.y + r.height;

      const nextOpacity =
        value > 0.002 && value < 0.998 && !inTitle ? "1" : "0";

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
              // موبایل/تبلت: بدون drop-shadow. فیلتر روی قطعه‌ی در حال تغییر
              // در هر فریم دوباره محاسبه می‌شد و روی GPU ضعیف گران‌ترین بخش بود.
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
                  style={{
                    stroke: "var(--brand-accent)",
                    visibility: "hidden",
                  }}
                />
              ))
            )}
          </g>
        </svg>
      )}

      {/* سر مسیر: المان HTML مستقل (لایه‌ی GPU) به‌جای <g> داخل SVG بلند */}
      {pathData.d && !reduceMotion && (
        <div
          ref={headRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-[5] will-change-transform"
          style={{ left: 0, top: 0, width: 0, height: 0, opacity: 0 }}
        >
          <span
            style={{
              position: "absolute",
              left: -9,
              top: -9,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--brand-accent)",
              opacity: 0.18,
            }}
          />

          <span
            style={{
              position: "absolute",
              left: -4,
              top: -4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--brand-accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}
