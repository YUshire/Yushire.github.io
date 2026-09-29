const assert = require('node:assert/strict');
const KoiMotion = require('../koi-motion.js');

function circle(direction, steps = 720, radius = 65) {
  const fish = new KoiMotion();
  let signs = [];
  let worstJump = 0;
  let previous;
  for (let i = 0; i <= steps * 2; i++) {
    const angle = direction * i / steps * Math.PI * 2;
    const x = 400 + Math.cos(angle) * radius;
    const y = 300 + Math.sin(angle) * radius;
    const pose = fish.move(x,y);
    assert.equal(pose.head.x, x, 'Head must match pointer X exactly');
    assert.equal(pose.head.y, y, 'Head must match pointer Y exactly');
    if (i > steps) {
      const lateral = -(pose.tail.x-x)*Math.sin(pose.heading)+(pose.tail.y-y)*Math.cos(pose.heading);
      signs.push(lateral);
      if (previous) worstJump = Math.max(worstJump, Math.hypot(pose.tail.x-previous.x,pose.tail.y-previous.y));
      previous = pose.tail;
    }
  }
  assert(signs.every(value => Math.sign(value) === direction), 'Tail must stay on one consistent side during a circle');
  assert(worstJump < 4, 'No jump at the +/- pi heading boundary');
  const stationary = JSON.stringify(fish.pose);
  for (let i=0;i<300;i++) fish.move(fish.pose.head.x, fish.pose.head.y);
  assert.equal(JSON.stringify(fish.pose),stationary,'A stationary pointer must produce a bit-identical pose');
  return { direction, radius, minimumLateral:Math.min(...signs).toFixed(2),maximumLateral:Math.max(...signs).toFixed(2),worstJump:worstJump.toFixed(2),pose:fish.pose };
}
const cw=circle(1),ccw=circle(-1);
const sparse=circle(1,360);
assert(Math.abs(cw.pose.tail.x-sparse.pose.tail.x)<2 && Math.abs(cw.pose.tail.y-sparse.pose.tail.y)<2,'Geometry should not depend on event rate');
const straight=new KoiMotion();
for(let x=0;x<400;x++)straight.move(x,200);
assert.equal(straight.pose.tail.y,200,'Straight travel must not oscillate');
circle(1,720,12);
circle(-1,720,12);
console.log(JSON.stringify({checks:'head locked, consistent circular bend, stationary pose, event-rate stability, straight line and tight circles',cw:{...cw,pose:undefined},ccw:{...ccw,pose:undefined}},null,2));
