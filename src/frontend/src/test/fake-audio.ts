/**
 * jsdom implements neither media playback nor metadata loading. This fake
 * element fires `loadedmetadata` when a source is assigned so the upload
 * duration probe resolves, and mirrors the play/pause events the music player
 * listens for. `paused` is a real writable field here, which is what lets the
 * player's `toggle` branch on it the way a browser would.
 */
export class FakeAudio {
  private listeners = new Map<string, Set<EventListener>>();
  currentTime = 0;
  duration = 180;
  volume = 1;
  preload = "";
  paused = true;
  private source = "";

  get src(): string {
    return this.source;
  }

  set src(value: string) {
    this.source = value;
    if (value) {
      queueMicrotask(() => this.dispatch("loadedmetadata"));
    }
  }

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  removeAttribute() {
    this.source = "";
  }

  play() {
    this.paused = false;
    this.dispatch("play");
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatch("pause");
  }

  private dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}
