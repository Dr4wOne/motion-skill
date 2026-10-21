// Deliberately broken: overflow, low contrast, outside the safe area.
export default {
  render(ctx, t, api) {
    api.text('This sentence is far too long to ever fit inside such a tiny box', { x: 200, y: 200, w: 300, h: 60, role: 'body' });
    api.text('Low contrast text', { x: 200, y: 500, w: 900, role: 'body', color: '#2a2a33' });
    api.text('Edge', { x: 10, y: 10, w: 400, role: 'body' });
  },
};
