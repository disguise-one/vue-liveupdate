import { onMounted, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { SubscriptionValue } from '..';

/**
 * A composable that observes the visibility of an element and freezes/thaws subscriptions based on its visibility.
 * This is useful for optimizing performance by pausing updates when the element is not visible.
 * It uses the Intersection Observer API to detect visibility changes.
 * 
 * @param elem The element to observe for visibility changes
 * @param subscriptions The subscriptions to freeze & thaw when visibility changes
 * @returns void
 */
export function useSubscriptionVisibility(
  elem: Ref<HTMLElement | null>,
  subscriptions: Record<string, SubscriptionValue>
) {
  let observer: IntersectionObserver;

  onMounted(() => {
    if (!elem.value) {
      console.warn('Element is not defined');
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        Object.values(subscriptions).forEach((subscription) => {
          if (entry.isIntersecting) {
            subscription.thaw();
          } else {
            subscription.freeze();
          }
        });
      });
    });

    observer.observe(elem.value);
  });

  // Before unmounting, unobserve the element to prevent spurious callbacks
  onBeforeUnmount(() => {
    if (observer && elem.value) {
      observer.unobserve(elem.value);
    }
  });
}
