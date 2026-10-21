// Deliberately non-deterministic: uses Math.random (forbidden).
export default {
  render(ctx, t, api) {
    api.box({ x: 400 + Math.random() * 400, y: 400, w: 200, h: 200, fill: 'accent' });
  },
};
