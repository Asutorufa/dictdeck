import { motion } from "motion/react";
import { PropsWithChildren } from "react";
import { EASE_SILK } from "@/lib/motion";

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: PropsWithChildren<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_SILK }}
      className="flex w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--dd-color-border-strong)] bg-[var(--dd-color-surface)] px-6 py-14 text-center"
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--dd-color-border)] bg-[var(--dd-color-surface-strong)] text-[var(--dd-color-accent)] shadow-[var(--dd-shadow-xs)]">
          {icon}
        </div>
      )}
      <h3 className="font-serif-display m-0 text-xl font-medium text-[var(--dd-color-text)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--dd-color-muted)]">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          className="app-primary-action mt-5"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
