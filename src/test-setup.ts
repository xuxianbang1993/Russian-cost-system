import '@testing-library/jest-dom/vitest';

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
