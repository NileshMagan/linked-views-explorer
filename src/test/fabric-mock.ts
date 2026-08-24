/**
 * A recording stand-in for fabric.js.
 *
 * fabric draws to a real 2D context, which jsdom does not provide. Replacing
 * it is also the right seam: what matters is *what the component asks fabric
 * to do* — how many markers, at which coordinates, carrying which id — not the
 * pixels fabric would have produced.
 */

export class FakeObject {
  props: Record<string, unknown>;

  constructor(props: Record<string, unknown> = {}) {
    this.props = { ...props };
  }

  set(key: string | Record<string, unknown>, value?: unknown) {
    if (typeof key === "string") this.props[key] = value;
    else Object.assign(this.props, key);
    return this;
  }

  get(key: string) {
    return this.props[key];
  }
}

export class FakeGroup extends FakeObject {
  children: FakeObject[];

  constructor(children: FakeObject[], props: Record<string, unknown> = {}) {
    super(props);
    this.children = children;
  }

  getObjects() {
    return this.children;
  }
}

export class FakeCanvas {
  objects: FakeObject[] = [];
  listeners: Record<string, Array<(event: unknown) => void>> = {};
  disposed = false;
  renderCount = 0;

  on(name: string, handler: (event: unknown) => void) {
    (this.listeners[name] ||= []).push(handler);
  }

  off(name: string, handler: (event: unknown) => void) {
    this.listeners[name] = (this.listeners[name] || []).filter(
      (existing) => existing !== handler
    );
  }

  /** Test-only: drives a fabric event as if the user had moved the pointer. */
  emit(name: string, event: unknown) {
    (this.listeners[name] || []).forEach((handler) => handler(event));
  }

  add(object: FakeObject) {
    this.objects.push(object);
  }

  clear() {
    this.objects = [];
  }

  getObjects() {
    return this.objects;
  }

  renderAll() {
    this.renderCount += 1;
  }

  dispose() {
    this.disposed = true;
  }
}

/** Every canvas constructed during a test, newest last. */
export const __instances: FakeCanvas[] = [];

export const fabric = {
  Canvas: function () {
    const canvas = new FakeCanvas();
    __instances.push(canvas);
    return canvas;
  } as unknown as new (...args: unknown[]) => FakeCanvas,
  Circle: FakeObject,
  Text: FakeObject,
  Group: FakeGroup,
};

/** The most recently constructed canvas — the one under test. */
export const latestScene = (): FakeCanvas => __instances[__instances.length - 1];

export const resetFabricMock = () => {
  __instances.length = 0;
};
