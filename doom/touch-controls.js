(() => {
  const canvas = document.querySelector('#canvas');
  const controller = document.querySelector('.touch-controller');
  if (!canvas || !controller || !window.PointerEvent) return;

  const bindings = {
    up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    fire: { key: 'Control', code: 'ControlLeft', keyCode: 17, location: 1 },
    use: { key: ' ', code: 'Space', keyCode: 32 },
    run: { key: 'Shift', code: 'ShiftLeft', keyCode: 16, location: 1 }
  };

  const activePointers = new Map();
  const activeKeys = new Map();

  const emitKey = (type, binding) => {
    const modifiers = {
      ctrlKey: binding.code === 'ControlLeft',
      shiftKey: binding.code === 'ShiftLeft'
    };
    const event = new KeyboardEvent(type, {
      key: binding.key,
      code: binding.code,
      keyCode: binding.keyCode,
      which: binding.keyCode,
      location: binding.location || 0,
      bubbles: true,
      cancelable: true,
      repeat: false,
      ...modifiers
    });
    canvas.dispatchEvent(event);
  };

  const press = (pointerId, button) => {
    const binding = bindings[button.dataset.control];
    if (!binding || activePointers.has(pointerId)) return;

    activePointers.set(pointerId, { button, binding });
    const count = activeKeys.get(binding.code) || 0;
    activeKeys.set(binding.code, count + 1);
    button.classList.add('is-pressed');
    button.setAttribute('aria-pressed', 'true');
    if (count === 0) emitKey('keydown', binding);
  };

  const release = pointerId => {
    const active = activePointers.get(pointerId);
    if (!active) return;

    activePointers.delete(pointerId);
    const count = (activeKeys.get(active.binding.code) || 1) - 1;
    if (count <= 0) {
      activeKeys.delete(active.binding.code);
      active.button.classList.remove('is-pressed');
      active.button.setAttribute('aria-pressed', 'false');
      emitKey('keyup', active.binding);
    } else {
      activeKeys.set(active.binding.code, count);
    }
  };

  const releaseAll = () => {
    for (const pointerId of [...activePointers.keys()]) release(pointerId);
  };

  controller.querySelectorAll('.touch-key').forEach(button => {
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      canvas.focus({ preventScroll: true });
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch (error) {
        // Synthetic test events have no browser-owned active pointer.
      }
      press(event.pointerId, button);
    });

    button.addEventListener('pointermove', event => {
      if (!activePointers.has(event.pointerId)) return;
      const rect = button.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        release(event.pointerId);
      }
    });

    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => {
        event.preventDefault();
        release(event.pointerId);
      });
    }

    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
    });
  });

  window.addEventListener('pointerup', event => release(event.pointerId));
  window.addEventListener('pointercancel', event => release(event.pointerId));
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });
})();
