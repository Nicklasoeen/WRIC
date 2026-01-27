import React from "react";

type WidgetSize = "sm" | "md" | "lg" | "xl";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  size?: WidgetSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
  sm: "md:row-span-1",
  md: "md:row-span-2",
  lg: "md:col-span-2 md:row-span-2",
  xl: "md:col-span-2 md:row-span-3",
};

export function WidgetCard({
  title,
  subtitle,
  size = "sm",
  children,
  footer,
  className = "",
}: WidgetCardProps) {
  return (
    <section
      className={`relative flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/80 ${sizeClasses[size]} ${className}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            Widget
          </span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      {footer ? (
        <footer className="mt-2 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export function StatPill({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {value}
        </span>
        {trend ? (
          <span
            className={`text-xs font-medium ${
              trend.positive ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MiniBarChart() {
  const values = [40, 60, 30, 80, 55, 70, 45];
  return (
    <div className="flex h-20 items-end gap-1.5">
      {values.map((v, idx) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          className="flex-1 rounded-full bg-indigo-100 dark:bg-indigo-900/70"
          style={{ height: `${v}%` }}
        />
      ))}
    </div>
  );
}

export function MiniLineChart() {
  const values = [30, 40, 25, 60, 55, 80, 65];
  return (
    <div className="relative h-20 overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-50 to-slate-50 dark:from-indigo-900/30 dark:to-slate-900/50">
      <svg
        viewBox="0 0 100 40"
        className="h-full w-full stroke-[1.8]"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="url(#lineGradient)"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={values
            .map((v, i) => `${(i / (values.length - 1)) * 100},${40 - v * 0.3}`)
            .join(" ")}
        />
      </svg>
    </div>
  );
}

