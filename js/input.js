// input.js — keyboard + on-screen touch controls, unified into one Input object.
'use strict';

const Input = {
  keys: {},
  axis: null, // set by virtual joystick when active
  actionPressed: false,  // edge-triggered "steal / pickup" (E / Space)
  actionHeld: false,
  barkPressed: false,

  keyMap: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    action: ['KeyE', 'Space'],
    bark: ['KeyB'],
    pause: ['Escape'],
    mute: ['KeyM']
  },

  isDown(name) {
    const codes = this.keyMap[name];
    return codes.some(c => this.keys[c]);
  },

  init(callbacks) {
    window.addEventListener('keydown', (e) => {
      if (this.keyMap.action.includes(e.code)) {
        if (!this.keys[e.code]) this.actionPressed = true;
        this.actionHeld = true;
      }
      if (this.keyMap.bark.includes(e.code) && !this.keys[e.code]) this.barkPressed = true;
      if (this.keyMap.pause.includes(e.code) && !this.keys[e.code]) callbacks.onPause && callbacks.onPause();
      if (this.keyMap.mute.includes(e.code) && !this.keys[e.code]) callbacks.onMute && callbacks.onMute();
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (this.keyMap.action.includes(e.code)) this.actionHeld = false;
    });

    window.addEventListener('blur', () => { this.keys = {}; this.actionHeld = false; });

    this._initTouch(callbacks);
  },

  consumeAction() { const v = this.actionPressed; this.actionPressed = false; return v; },
  consumeBark() { const v = this.barkPressed; this.barkPressed = false; return v; },

  _initTouch(callbacks) {
    const stick = document.getElementById('joystick');
    const knob = document.getElementById('joystickKnob');
    if (!stick) return;
    let dragging = false;
    let originX = 0, originY = 0;
    const maxR = 42;

    const setAxis = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, maxR);
      const nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 0;
      knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
      const mag = Utils.clamp(clamped / maxR, 0, 1);
      this.axis = len > 4 ? { x: nx * mag, y: ny * mag } : { x: 0, y: 0 };
    };

    const start = (clientX, clientY) => {
      dragging = true;
      const rect = stick.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    };
    const move = (clientX, clientY) => {
      if (!dragging) return;
      setAxis(clientX - originX, clientY - originY);
    };
    const end = () => {
      dragging = false;
      knob.style.transform = 'translate(0px, 0px)';
      this.axis = { x: 0, y: 0 };
    };

    stick.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const t = [...e.touches].find(() => true);
      if (t) move(t.clientX, t.clientY);
    }, { passive: false });
    window.addEventListener('touchend', end);
    stick.addEventListener('mousedown', (e) => start(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);

    const bindHold = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => { e.preventDefault(); onDown(); };
      const up = (e) => { e.preventDefault(); onUp && onUp(); };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
    };
    bindHold('btnAction', () => { this.actionPressed = true; this.actionHeld = true; }, () => { this.actionHeld = false; });
    bindHold('btnBark', () => { this.barkPressed = true; });
    bindHold('btnSprint', () => { this.keys['ShiftLeft'] = true; }, () => { this.keys['ShiftLeft'] = false; });
  }
};
