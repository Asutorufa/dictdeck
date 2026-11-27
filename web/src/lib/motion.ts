import type { Transition, Variants } from "motion/react";

export const EASE_SILK: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 440,
  damping: 32,
  mass: 0.8,
};

export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
  mass: 0.9,
};

export const SPRING_DECK: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 26,
};

export const TRANSITION_SILK: Transition = {
  duration: 0.32,
  ease: EASE_SILK,
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: EASE_SILK },
  },
};

export const pageEnterVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE_SILK },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};
