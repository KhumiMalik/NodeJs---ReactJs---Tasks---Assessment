import { eventBus } from './event-bus.js';
import { recordTaskCompletedActivity } from './listeners/record-task-activity.listener.js';
import { TASK_COMPLETED } from './task-completed.event.js';

let registered = false;

/** Wires listeners to events. Safe to call more than once (e.g. one app per test file). */
export function registerEventListeners(): void {
  if (registered) return;
  registered = true;

  eventBus.on(TASK_COMPLETED, recordTaskCompletedActivity);
}
