// Critically damped spring in Apple's terms (response + damping ratio).
// It always starts from the current value and velocity, so any turn can be
// grabbed, reversed or retargeted mid-flight without a jump.

export function makeSpring({ response = 0.42, damping = 1 } = {}) {
  const k = (2 * Math.PI / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  return { k, c };
}

export function animateSpring({ from, to, velocity = 0, spring, onUpdate, onDone,
  restDelta = 0.004, restSpeed = 0.05 }) {
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let stopped = false;
  const STEP = 1 / 240;

  const frame = (now) => {
    if (stopped) return;
    let dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    while (dt > 0) {
      const h = Math.min(STEP, dt);
      const a = -spring.k * (x - to) - spring.c * v;
      v += a * h;
      x += v * h;
      dt -= h;
    }
    // 0.4% of a turn is under one degree: invisible, so stop there rather than idle in the tail.
    if (Math.abs(x - to) < restDelta && Math.abs(v) < restSpeed) {
      x = to;
      v = 0;
      onUpdate(to);
      if (!stopped) onDone();
      return;
    }
    onUpdate(x);
    if (!stopped) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      return { value: x, velocity: v };
    },
    get value() {
      return x;
    },
    get velocity() {
      return v;
    },
  };
}

// Apple's momentum projection (Designing Fluid Interfaces), snappier rate.
export function project(velocity, rate = 0.99) {
  return ((velocity / 1000) * rate) / (1 - rate);
}

export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Recover the finger-space displacement when catching a live edge rebound.
// Applying resistance to the already-resisted screen offset would jump on grab.
export function unRubberband(offset, dimension, constant = 0.55) {
  const safeOffset = Math.min(Math.abs(offset), dimension * 0.99);
  return Math.sign(offset) * safeOffset * dimension / (constant * (dimension - safeOffset));
}

// The spring moves screen pixels, so pass the finger velocity through the same
// resistance slope as its position (the derivative of rubberband).
export function rubberbandVelocity(overshoot, velocity, dimension, constant = 0.55) {
  return velocity * constant * (dimension / (dimension + constant * Math.abs(overshoot))) ** 2;
}
