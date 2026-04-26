import '@testing-library/jest-dom/vitest';

// Recharts (via ResponsiveContainer) relies on ResizeObserver, which jsdom omits.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

if (typeof HTMLDialogElement !== 'undefined') {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function showModal() {
      Object.defineProperty(this, 'open', { value: true, configurable: true });
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function close() {
      Object.defineProperty(this, 'open', { value: false, configurable: true });
      this.removeAttribute('open');
    },
  });
}
