type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Simple typed event bus for inter-addon and addon-core communication
 */
export class AddonEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler as EventHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Subscribe to an event, trigger only once
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler = (data) => {
      this.off(event, wrapper);
      return handler(data as T);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<T = unknown>(event: string, data?: T): Promise<void> {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    for (const handler of eventHandlers) {
      await handler(data);
    }
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}
