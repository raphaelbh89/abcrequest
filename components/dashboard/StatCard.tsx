"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowRight, Sparkles } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  href: string;
  colorTheme: "emerald" | "red" | "amber" | "blue";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  colorTheme,
}: StatCardProps) {
  const themeStyles = {
    emerald: {
      accentLine: "from-emerald-500 via-teal-500 to-cyan-500",
      glowBg: "group-hover:bg-emerald-50/80",
      iconGlow: "bg-emerald-50 text-emerald-600 border-emerald-200",
      numberColor: "text-emerald-700",
      hoverBorder: "hover:border-emerald-300",
      linkText: "text-emerald-600 group-hover:text-emerald-700",
    },
    red: {
      accentLine: "from-rose-500 via-red-500 to-orange-500",
      glowBg: "group-hover:bg-rose-50/80",
      iconGlow: "bg-rose-50 text-rose-600 border-rose-200",
      numberColor: "text-rose-700",
      hoverBorder: "hover:border-rose-300",
      linkText: "text-rose-600 group-hover:text-rose-700",
    },
    amber: {
      accentLine: "from-amber-500 via-yellow-500 to-orange-500",
      glowBg: "group-hover:bg-amber-50/80",
      iconGlow: "bg-amber-50 text-amber-600 border-amber-200",
      numberColor: "text-amber-700",
      hoverBorder: "hover:border-amber-300",
      linkText: "text-amber-600 group-hover:text-amber-700",
    },
    blue: {
      accentLine: "from-sky-500 via-indigo-500 to-cyan-500",
      glowBg: "group-hover:bg-sky-50/80",
      iconGlow: "bg-sky-50 text-sky-600 border-sky-200",
      numberColor: "text-sky-700",
      hoverBorder: "hover:border-sky-300",
      linkText: "text-sky-600 group-hover:text-sky-700",
    },
  }[colorTheme];

  return (
    <Link
      href={href}
      className={`group relative glass-panel rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden border border-slate-200/80 ${themeStyles.hoverBorder} hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-1 bg-white/90`}
    >
      {/* Top Accent Gradient Bar */}
      <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${themeStyles.accentLine} opacity-90 group-hover:opacity-100 group-hover:h-[3px] transition-all`} />

      {/* Ambient background glow on hover */}
      <div className={`absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${themeStyles.glowBg}`} />

      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {title}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${themeStyles.numberColor}`}>
                {value}
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border backdrop-blur-md transition-transform duration-300 group-hover:scale-110 shadow-xs ${themeStyles.iconGlow}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs font-medium">
        <span className="text-slate-400 group-hover:text-slate-600 transition-colors text-[11px]">
          Bấm để chuyển tiếp
        </span>
        <span className={`inline-flex items-center gap-1 font-bold text-xs transition-all group-hover:translate-x-0.5 ${themeStyles.linkText}`}>
          Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
