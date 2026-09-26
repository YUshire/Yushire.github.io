/* Spatial following: the head is pinned to the pointer; the spine follows
 * the recent path by distance, never by a clock or a periodic wave. */
(function (scope) {
  const TAU = Math.PI * 2;
  const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  class KoiMotion {
    constructor(length = 74) {
      this.length = length;
      this.history = [];
      this.heading = 0;
      this.pose = null;
    }

    reset(x, y) {
      this.history = [{ x, y }];
      this.heading = 0;
      return this.buildPose();
    }

    pointBehind(distance) {
      const path = this.history;
      for (let i = path.length - 1; i > 0; i -= 1) {
        const newer = path[i];
        const older = path[i - 1];
        const length = Math.hypot(newer.x - older.x, newer.y - older.y);
        if (length >= distance && length > 0) {
          const t = distance / length;
          return { x: newer.x + (older.x - newer.x) * t, y: newer.y + (older.y - newer.y) * t };
        }
        distance -= length;
      }
      const first = path[0];
      const next = path[1];
      const angle = next ? Math.atan2(next.y - first.y, next.x - first.x) : this.heading;
      return { x: first.x - Math.cos(angle) * distance, y: first.y - Math.sin(angle) * distance };
    }

    move(x, y) {
      if (!this.history.length) return this.reset(x, y);
      const last = this.history[this.history.length - 1];
      const distance = Math.hypot(x - last.x, y - last.y);
      if (distance < .001) return this.pose;
      if (distance > 300) return this.reset(x, y);
      this.history.push({ x, y });

      // Retain a bounded distance of history, independent of event frequency.
      let retained = 0;
      for (let i = this.history.length - 1; i > 0; i -= 1) {
        retained += Math.hypot(this.history[i].x - this.history[i - 1].x, this.history[i].y - this.history[i - 1].y);
        if (retained > this.length * 3) {
          this.history.splice(0, i - 1);
          break;
        }
      }
      const behind = this.pointBehind(7);
      this.heading = Math.atan2(y - behind.y, x - behind.x);
      return this.buildPose();
    }

    buildPose() {
      const head = this.history[this.history.length - 1];
      const spine = [{ ...head, angle: this.heading }];
      const count = 40;
      const step = this.length / count;
      let angle = this.heading;
      for (let i = 1; i <= count; i += 1) {
        const distance = (i - .5) * step;
        const ahead = this.pointBehind(Math.max(0, distance - 4));
        const behind = this.pointBehind(distance + 4);
        const tangent = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
        // Keep the head firm and distribute the turn smoothly into the tail.
        const headWeight = clamp((distance - 8) / 20, 0, 1);
        const target = this.heading + clamp(wrap(tangent - this.heading), -1.15, 1.15) * headWeight;
        angle += clamp(wrap(target - angle), -.07, .07);
        const previous = spine[i - 1];
        spine.push({ x: previous.x - Math.cos(angle) * step, y: previous.y - Math.sin(angle) * step, angle });
      }
      this.pose = { head: { ...head }, heading: this.heading, spine, tail: { ...spine[count] } };
      return this.pose;
    }
  }

  scope.KoiMotion = KoiMotion;
  if (typeof module !== 'undefined' && module.exports) module.exports = KoiMotion;
})(globalThis);
