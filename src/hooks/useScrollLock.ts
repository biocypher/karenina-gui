import { useRef, useCallback } from 'react';

/**
 * Lock type determines the timing strategy for unlocking scroll
 * - 'immediate': Uses requestAnimationFrame for fast transitions
 * - 'delayed': Uses setTimeout with a delay for slower components
 */
type LockType = 'immediate' | 'delayed';

interface ScrollLockOptions {
  /** Delay in milliseconds when using 'delayed' lock type (default: 150) */
  delayMs?: number;
}

/**
 * Hook to manage body scroll locking with position restoration.
 *
 * This hook provides a reusable way to lock the body scroll position
 * during transitions, then restore it afterward. It handles saving the
 * current scroll position, fixing the body in place, and restoring
 * the scroll position when unlocked.
 *
 * @param options - Configuration options for scroll locking behavior
 * @returns Object containing lock and unlock functions
 *
 * @example
 * ```tsx
 * const { lock, unlock } = useScrollLock();
 *
 * const handleTransition = () => {
 *   lock();
 *   // ... perform transition
 *   unlock('delayed'); // Use delayed unlock for complex components
 * };
 * ```
 */
export function useScrollLock(options: ScrollLockOptions = {}) {
  const { delayMs = 150 } = options;
  const scrollPositionRef = useRef<number>(0);

  /**
   * Lock the body scroll by saving current position and fixing body in place
   */
  const lock = useCallback(() => {
    // Save current scroll position
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;

    // Lock scroll position by fixing body in place
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = '100%';
  }, []);

  /**
   * Unlock the body scroll and restore saved position
   *
   * @param lockType - Timing strategy: 'immediate' uses rAF, 'delayed' uses setTimeout
   */
  const unlock = useCallback(
    (lockType: LockType = 'immediate') => {
      const unlockScroll = () => {
        // Unlock scroll by clearing body styles
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        // Restore scroll position
        const scrollY = scrollPositionRef.current;
        window.scrollTo(0, scrollY);
      };

      if (lockType === 'delayed') {
        // Use setTimeout for slower components (e.g., ComparisonView)
        setTimeout(unlockScroll, delayMs);
      } else {
        // Use requestAnimationFrame for fast transitions (e.g., SummaryView)
        requestAnimationFrame(() => {
          requestAnimationFrame(unlockScroll);
        });
      }
    },
    [delayMs]
  );

  return { lock, unlock };
}
