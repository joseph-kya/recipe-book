// Critically damped spring in Apple's terms (response + damping ratio).
// It always starts from the current value and velocity, so any turn can be
// grabbed, reversed or retargeted mid-flight without a jump.

export function makeSpring({ response = 0.42, damping = 1 } = {}) {
  const k = (2 * Math.PI / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  return { k, c };
}

export function animateSpring({ from, to, velocity = 0, spring, onUpdate, onDone }) {
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  const STEP = 1 / 240;

  const frame = (now) => {
    let dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    while (dt > 0) {
      const h = Math.min(STEP, dt);
      const a = -spring.k * (x - to) - spring.c * v;
      v += a * h;
      x += v * h;
      dt -= h;
    }
    if (Math.abs(x - to) < 0.0015 && Math.abs(v) < 0.02) {
      onUpdate(to);
      onDone();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop() {
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
