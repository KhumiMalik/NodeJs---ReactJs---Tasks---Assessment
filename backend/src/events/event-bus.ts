import { env } from '../config/env.js';
import { TASK_COMPLETED, type TaskCompletedEvent } from './task-completed.event.js';

/** Maps each event name to its payload type. */
interface EventMap {
  [TASK_COMPLETED]: TaskCompletedEvent;
}

type EventName = keyof EventMap;
type Listener<E extends EventName> = (payload: EventMap[E]) => void | Promise<void>;

const listeners: { [E in EventName]: Listener<E>[] } = {
  [TASK_COMPLETED]: [],
};

/**
 * A minimal in-process, typed event bus.
 *
 * Unlike Node's EventEmitter, `emit` waits for async listeners, so the HTTP
 * response is sent only after side effects (such as the activity record) exist
 * and the client can refetch them immediately. Each listener's errors are
 * caught and logged: a failing side effect never fails the operation that
 * triggered it.
 */
export const eventBus = {
  on<E extends EventName>(event: E, listener: Listener<E>): void {
    listeners[event].push(listener);
  },

  async emit<E extends EventName>(event: E, payload: EventMap[E]): Promise<void> {
    await Promise.all(
      listeners[event].map(async (listener) => {
        try {
          await listener(payload);
        } catch (error) {
          if (env.NODE_ENV !== 'test') {
            console.error(`Listener for "${event}" failed:`, error);
          }
        }
      }),
    );
  },
};
