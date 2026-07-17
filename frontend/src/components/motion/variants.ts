// Motion Variants for Framer Motion
// Central source of truth for all animations

// ============================================
// Duration Constants
// ============================================

export const DURATION = {
  instant: 0,
  fast: 0.1,
  normal: 0.15,
  medium: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

// ============================================
// Easing Constants
// ============================================

export const EASING = {
  linear: [0, 0, 1, 1],
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  smooth: [0.16, 1, 0.3, 1],
} as const;

// ============================================
// Fade Variants
// ============================================

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.normal, ease: EASING.smooth },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const fadeInRight = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

// ============================================
// Scale Variants
// ============================================

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: DURATION.normal, ease: EASING.smooth },
};

export const scaleInSmall = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: DURATION.fast, ease: EASING.smooth },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { type: 'spring', stiffness: 500, damping: 25 },
};

// ============================================
// Slide Variants
// ============================================

export const slideInLeft = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const slideInRight = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const slideInUp = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const slideInDown = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

// ============================================
// Card Variants
// ============================================

export const cardHover = {
  rest: {
    y: 0,
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    transition: { duration: DURATION.fast, ease: EASING.easeOut },
  },
  hover: {
    y: -2,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    transition: { duration: DURATION.fast, ease: EASING.easeOut },
  },
};

export const cardTap = {
  scale: 0.98,
  transition: { duration: DURATION.instant },
};

export const cardStagger = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: DURATION.medium,
      ease: EASING.smooth,
    },
  }),
};

// ============================================
// Table Row Variants
// ============================================

export const tableRow = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: DURATION.normal },
};

export const tableRowStagger = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: DURATION.normal,
      ease: EASING.smooth,
    },
  }),
};

// ============================================
// Modal Variants
// ============================================

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.fast },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
  transition: { duration: DURATION.normal, ease: EASING.smooth },
};

export const modalSlide = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

// ============================================
// Sidebar Variants
// ============================================

export const sidebarExpand = {
  initial: { width: 72 },
  animate: { width: 280 },
  exit: { width: 72 },
  transition: { duration: DURATION.normal, ease: EASING.smooth },
};

export const sidebarItem = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: DURATION.fast },
};

export const sidebarGroup = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: DURATION.normal },
};

// ============================================
// Button Variants
// ============================================

export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  transition: { duration: DURATION.instant },
};

// ============================================
// Toast Variants
// ============================================

export const toastEnter = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.9 },
  transition: { duration: DURATION.medium, ease: EASING.smooth },
};

export const toastSlide = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
  transition: { duration: DURATION.normal },
};

// ============================================
// Tooltip Variants
// ============================================

export const tooltip = {
  initial: { opacity: 0, y: 4, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.95 },
  transition: { duration: DURATION.fast, ease: EASING.easeOut },
};

// ============================================
// Page Transition Variants
// ============================================

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: DURATION.slow, ease: EASING.smooth },
};

export const pageTransitionFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.medium },
};

// ============================================
// Stagger Container Variants
// ============================================

export const staggerContainer = (staggerChildren: number = 0.05, delayChildren: number = 0.1) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASING.smooth },
  },
};

// ============================================
// List Item Variants
// ============================================

export const listItem = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: DURATION.normal },
};

// ============================================
// Accordion Variants
// ============================================

export const accordion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: DURATION.normal, ease: EASING.smooth },
};

// ============================================
// Dropdown Variants
// ============================================

export const dropdown = {
  initial: { opacity: 0, y: -4, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.95 },
  transition: { duration: DURATION.fast, ease: EASING.easeOut },
};

// ============================================
// Skeleton Variants
// ============================================

export const skeletonPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// Shake Animation (for errors)
// ============================================

export const shake = {
  animate: {
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

// ============================================
// Pulse Animation (for attention)
// ============================================

export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.3,
    },
  },
};

// ============================================
// Spin Animation
// ============================================

export const spin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// Export all variants
// ============================================

export const variants = {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  scaleInSmall,
  popIn,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  cardHover,
  cardTap,
  cardStagger,
  tableRow,
  tableRowStagger,
  modalOverlay,
  modalContent,
  modalSlide,
  sidebarExpand,
  sidebarItem,
  sidebarGroup,
  buttonHover,
  toastEnter,
  toastSlide,
  tooltip,
  pageTransition,
  pageTransitionFade,
  staggerContainer,
  staggerItem,
  listItem,
  accordion,
  dropdown,
  skeletonPulse,
  shake,
  pulse,
  spin,
} as const;

export default variants;
