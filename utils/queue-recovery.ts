import type { SyncQueueItem } from '@/types/sync';

/** Include blocked descendants so a person can inspect or discard them first. */
export function recoveryItems(queue: SyncQueueItem[]) {
  const blocked = new Set(queue.filter((item) => item.status === 'DEAD').map((item) => item.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of queue) if (item.dependsOn && blocked.has(item.dependsOn) && !blocked.has(item.id)) {
      blocked.add(item.id);
      changed = true;
    }
  }
  return queue.filter((item) => blocked.has(item.id));
}
