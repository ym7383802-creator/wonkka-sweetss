import { motion } from "motion/react";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { useStore } from "@/src/context/StoreContext";

interface ReservationNoticeViewProps {
  onContinue: () => void;
  onBack: () => void;
}

export default function ReservationNoticeView({
  onContinue,
  onBack,
}: ReservationNoticeViewProps) {
  const { content } = useStore();
  const { reservation, business } = content;

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#211a15] text-[#f6f1ea] flex flex-col">
      {/* Dessert-themed atmospheric background */}
      <div className="absolute inset-0 z-0">
        <img
          src={reservation.backgroundImage}
          alt="Wonka Sweets artisanal desserts"
          className="h-full w-full object-cover object-center scale-105 opacity-45"
          referrerPolicy="no-referrer"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#1c1510]/85 via-[#211a15]/75 to-[#1a130e]/92"
        />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#e7dccb] transition-colors hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <span className="font-display text-lg font-bold tracking-tight text-[#f6f1ea] whitespace-nowrap shrink-0 sm:text-xl">
          {business.brandName}
        </span>

        <div className="w-14 sm:w-16" aria-hidden="true" />
      </header>

      {/* Centered Editorial Notice Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-[#f6f1ea] text-[#211a15] shadow-2xl border border-[#c4a27a]/35 p-7 sm:p-12 md:p-14"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center border border-[#c4a27a]/50 bg-[#efe8de] text-[#8c673e]">
              <CalendarClock className="h-5 w-5" />
            </div>

            <div dir="rtl" lang="ar" className="w-full space-y-4">
              <h1 className="font-display text-3xl font-bold leading-snug tracking-tight text-[#211a15] sm:text-4xl">
                {reservation.titleAr}
              </h1>

              <div className="mx-auto h-px w-16 bg-[#c4a27a]" aria-hidden="true" />

              <p className="mx-auto max-w-xl text-lg leading-relaxed font-medium text-[#3b2f26] sm:text-xl sm:leading-loose">
                {reservation.bodyAr}
              </p>
            </div>

            <p className="mt-6 max-w-lg text-xs leading-relaxed text-[#6b5b4e] sm:text-sm">
              {reservation.subtextEn}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 w-full sm:w-auto"
            >
              <button
                type="button"
                dir="rtl"
                lang="ar"
                onClick={onContinue}
                className="w-full sm:min-w-[240px] bg-[#c4a27a] px-8 py-4 text-base font-bold text-[#241b14] transition-all hover:brightness-105 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#211a15] cursor-pointer"
              >
                {reservation.ctaAr}
              </button>
            </motion.div>

            <p className="mt-6 text-xs text-[#7b6b5e]">
              {business.brandName} · {business.owner} · {business.location}
            </p>
            <p className="mt-1 text-xs font-medium text-[#5c4e43] tabular-nums">
              Working Hours: {business.workingHours || "5:00 PM – 12:00 AM"}
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
