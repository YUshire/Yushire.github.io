(() => {
  const root = document.documentElement;
  const cursor = document.querySelector('#koiCursor');
  const canvas = document.querySelector('#koiCanvas');
  const sprite = document.querySelector('#koiSprite');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (!cursor || !canvas || !sprite) return;

  // Desynchronised canvases may enter the compositor a little earlier. The
  // option is only a hint and safely falls back in browsers that ignore it.
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!context) return;

  const motion = new KoiMotion(74);
  const texture = document.createElement('canvas');
  texture.width = 304;
  texture.height = 200;
  const textureContext = texture.getContext('2d');
  const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const MESH_STRIPS = 24;

  let ready = false;
  let visible = false;
  let animationFrame = 0;
  let latestPose = null;
  let lastInputAt = 0;
  let lastRipple = 0;
  let rippleTone = false;
  const enabled = () => ready && finePointer.matches;

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.height = 200 * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // Map each image strip onto one continuous curved mesh. The strips share
  // their edge vertices, so the fish bends instead of breaking into pieces.
  function triangle(source, destination) {
    const [s0, s1, s2] = source;
    const [d0, d1, d2] = destination;
    const ux = s1.x - s0.x, uy = s1.y - s0.y;
    const vx = s2.x - s0.x, vy = s2.y - s0.y;
    const determinant = ux * vy - uy * vx;
    const dx1 = d1.x - d0.x, dy1 = d1.y - d0.y;
    const dx2 = d2.x - d0.x, dy2 = d2.y - d0.y;
    const a = (dx1 * vy - dx2 * uy) / determinant;
    const b = (dy1 * vy - dy2 * uy) / determinant;
    const c = (dx2 * ux - dx1 * vx) / determinant;
    const d = (dy2 * ux - dy1 * vx) / determinant;
    const centerX = (d0.x + d1.x + d2.x) / 3;
    const centerY = (d0.y + d1.y + d2.y) / 3;
    context.save();
    context.beginPath();
    destination.forEach((point, index) => {
      const length = Math.hypot(point.x - centerX, point.y - centerY) || 1;
      const x = point.x + (point.x - centerX) / length * .15;
      const y = point.y + (point.y - centerY) / length * .15;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
    context.drawImage(texture, 0, -25, 76, 50);
    context.restore();
  }

  function drawFish(pose, now) {
    context.clearRect(0, 0, 200, 200);
    if (!ready || !pose) return;

    // Movement still comes only from the sampled pointer path. Once the
    // pointer rests, a small wave is blended into the final third of the tail;
    // the head and torso remain completely pinned and do not drift.
    const idle = clamp((now - lastInputAt - 90) / 260, 0, 1);
    const phase = now * .0044;
    function edge(u, side) {
      const distance = (.965 - u) * 76;
      let x, y, angle;
      if (distance < 0) {
        angle = pose.heading;
        x = pose.head.x - Math.cos(angle) * distance;
        y = pose.head.y - Math.sin(angle) * distance;
      } else {
        const position = Math.min(40, distance / motion.length * 40);
        const index = Math.min(39, Math.floor(position));
        const amount = position - index;
        const p = pose.spine[index], q = pose.spine[index + 1];
        x = p.x + (q.x - p.x) * amount;
        y = p.y + (q.y - p.y) * amount;
        angle = p.angle + wrap(q.angle - p.angle) * amount;

        const tailWeight = Math.pow(clamp((distance - 43) / 31, 0, 1), 1.8);
        if (tailWeight > 0 && idle > 0) {
          const wavePhase = phase - tailWeight * .62;
          const offset = Math.sin(wavePhase) * 4.2 * tailWeight * idle;
          x -= Math.sin(angle) * offset;
          y += Math.cos(angle) * offset;
          angle += Math.cos(wavePhase) * .11 * tailWeight * idle;
        }
      }
      return {
        x: x - pose.head.x + 100 - Math.sin(angle) * side * 25,
        y: y - pose.head.y + 100 + Math.cos(angle) * side * 25
      };
    }

    for (let i = 0; i < MESH_STRIPS; i += 1) {
      const u = i / MESH_STRIPS, v = (i + 1) / MESH_STRIPS;
      const a = edge(u, -1), b = edge(v, -1), c = edge(v, 1), d = edge(u, 1);
      triangle([{x:u*76,y:-25},{x:v*76,y:-25},{x:v*76,y:25}], [a,b,c]);
      triangle([{x:u*76,y:-25},{x:v*76,y:25},{x:u*76,y:25}], [a,c,d]);
    }
    cursor.style.transform = `translate3d(${pose.head.x - 100}px,${pose.head.y - 100}px,0)`;
  }

  function ripple(x, y, splash = false) {
    const node = document.createElement('span');
    node.className = `koi-ripple${rippleTone ? ' jade' : ''}${splash ? ' splash' : ''}`;
    rippleTone = !rippleTone;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.setAttribute('aria-hidden', 'true');
    document.body.appendChild(node);
    node.addEventListener('animationend', () => node.remove(), { once: true });
  }

  function animate(now) {
    animationFrame = 0;
    if (!visible || !enabled()) return;
    drawFish(latestPose, now);
    // Keep running while visible to drive the quiet tail-tip motion. Pointer
    // events themselves never perform the expensive fish mesh drawing.
    animationFrame = requestAnimationFrame(animate);
  }

  function ensureAnimation() {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  }

  window.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const input = samples.length ? samples : [event];
    const now = performance.now();

    if (!visible) {
      const first = input[0];
      latestPose = motion.reset(first.clientX, first.clientY);
      visible = true;
      root.classList.add('koi-active', 'koi-visible');
    }

    let moved = false;
    input.forEach(sample => {
      const oldHead = latestPose && latestPose.head;
      latestPose = motion.move(sample.clientX, sample.clientY);
      if (oldHead && Math.hypot(latestPose.head.x - oldHead.x, latestPose.head.y - oldHead.y) > .1) {
        moved = true;
      }
    });

    lastInputAt = now;
    cursor.classList.toggle('is-hovering', Boolean(event.target.closest('a,button')));
    if (moved && latestPose && now - lastRipple > 170) {
      ripple(latestPose.tail.x, latestPose.tail.y);
      lastRipple = now;
    }
    ensureAnimation();
  }, { passive: true });

  function hide() {
    visible = false;
    latestPose = null;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    root.classList.remove('koi-active', 'koi-visible');
    context.clearRect(0, 0, 200, 200);
  }

  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  window.addEventListener('resize', resize, { passive: true });
  finePointer.addEventListener('change', hide);
  window.addEventListener('pointerdown', event => {
    if (enabled() && event.pointerType !== 'touch') {
      ripple(event.clientX, event.clientY, true);
    }
  }, { passive: true });

  function prepare() {
    if (!sprite.naturalWidth) return;
    textureContext.clearRect(0, 0, texture.width, texture.height);
    textureContext.drawImage(sprite, 0, 0, texture.width, texture.height);
    ready = true;
    resize();
  }
  if (sprite.complete) prepare(); else sprite.addEventListener('load', prepare, { once: true });
  sprite.addEventListener('error', hide);
})();
