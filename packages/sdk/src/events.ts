type Listener<T extends unknown[]> = (...args: T) => void

export class EventEmitter<EventMap extends Record<string, unknown[]>> {
  private listeners = new Map<keyof EventMap, Set<Listener<unknown[]>>>()

  on<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener as Listener<unknown[]>)
    return this
  }

  off<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void): this {
    this.listeners.get(event)?.delete(listener as Listener<unknown[]>)
    return this
  }

  once<K extends keyof EventMap>(event: K, listener: (...args: EventMap[K]) => void): this {
    const wrapped = (...args: EventMap[K]) => {
      listener(...args)
      this.off(event, wrapped)
    }
    return this.on(event, wrapped)
  }

  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...(args as unknown[])))
  }

  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
