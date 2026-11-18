'use strict';

// Timings are fractions so both short classroom drafts and full films use the same beats.
const Direction = (() => {
  function growthCutDurations() {
    return [3,4,3,4,3,4,3,4,3,4,4,5];
  }

  function ease(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function familyWeights(count, phase) {
    if (count < 2) return [1];
    if (count === 2) {
      const child = ease((phase - .32) / .38);
      return [1 - child, child];
    }
    if (phase < .29) {
      const second = ease((phase - .20) / .09);
      return [1 - second, second, 0];
    }
    if (phase < .59) {
      const trio = ease((phase - .45) / .14) / 3;
      return [trio, 1 - 2 * trio, trio];
    }
    const child = ease((phase - .61) / .16);
    return [(1 - child) / 3, (1 - child) / 3, (1 + 2 * child) / 3];
  }

  function voiceSlots(project, timeline) {
    const hold = Math.min(project.tailSeconds ?? 4, project.endingDuration - 1);
    return timeline.scenes.map(scene => {
      const key = scene.kind === 'grade' ? 'grade' + scene.index : scene.kind;
      let start = scene.start;
      let end = scene.start + scene.duration;
      if (project.directed && project.includeFamily) {
        if (key === 'grade5') end -= 3;
        if (key === 'family') start -= 3;
      }
      if (key === 'ending' && project.directed) end -= hold;
      return {key, title:scene.title, start, end};
    });
  }

  // Backward displacement, in units of the distance between the two eyes.
  // Keep the centre of the lips anchored and lift the existing mouth corners and cheeks.
  function smileOffset(x, y) {
    const side = Math.abs(x);
    if (side > .9 || Math.abs(y) > .45) return [0, 0];
    const corner = Math.exp(-((side - .34) ** 2 / .024 + y * y / .020));
    const cheek = Math.exp(-((side - .54) ** 2 / .048 + (y + .14) ** 2 / .032));
    const rim = ease((.90 - side) / .18) * ease((.45 - Math.abs(y)) / .12);
    return [Math.sign(x) * (.042 * corner + .009 * cheek) * rim, -(.085 * corner + .029 * cheek) * rim];
  }
  return {ease, familyWeights, voiceSlots, smileOffset, growthCutDurations};
})();
if (typeof module !== 'undefined') module.exports = Direction;
