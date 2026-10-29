"use client";

import { motion } from "motion/react";
import { ArrowUpRight, CheckCircle2, Clock3, Layers3 } from "lucide-react";

export function HeroDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[520px]"
    >
      <div className="absolute -inset-8 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.075] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Access overview</p>
            <p className="mt-1 text-lg font-extrabold text-white">Wholesale workspace</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1.5 text-xs font-bold text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Active catalog
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <Layers3 size={18} className="text-blue-300" />
            <p className="mt-5 text-2xl font-extrabold tracking-tight text-white">24+</p>
            <p className="mt-1 text-xs text-slate-400">Access configurations</p>
          </div>
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <Clock3 size={18} className="text-emerald-300" />
            <p className="mt-5 text-2xl font-extrabold tracking-tight text-white">15 min</p>
            <p className="mt-1 text-xs text-slate-400">Typical review window</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">Partner tier example</p>
              <p className="mt-1 text-base font-extrabold text-white">AI Workflow Pro</p>
            </div>
            <ArrowUpRight size={20} className="text-blue-300" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-3xl font-black tracking-[-0.05em] text-white">$18.40</span>
              <span className="ml-1 text-xs text-slate-400">USD / unit</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <CheckCircle2 size={14} /> Verified
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "76%" }}
              transition={{ duration: 1, delay: 0.65 }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
