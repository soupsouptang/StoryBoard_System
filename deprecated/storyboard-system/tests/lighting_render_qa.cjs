/* Lighting 2.5D Renderer 投影数学测试 */
const assert = require('assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/lighting-render.js'), 'utf8'), sandbox);
const R = sandbox.FrameForgeLightingRender;
assert.ok(R, 'FrameForgeLightingRender 应挂到沙箱全局');

// 1. 原点投影
const [ox, oy] = R.project25d(0, 0, 0);
assert.ok(Math.abs(ox) < 1e-10 && Math.abs(oy) < 1e-10, '原点应投影到原点');

// 2. 纯 x 方向
const [ax, ay] = R.project25d(100, 0, 0);
assert.ok(ax > 0, 'x+ 应向右');
assert.ok(ay > 0, 'x+ 在 2.5D 应略向下（俯角）');

// 3. 纯 y 方向（纵深）
const [bx, by] = R.project25d(0, 100, 0);
assert.ok(bx < 0, 'y+ 在 45° 水平旋转下应向左');
assert.ok(by > 0, 'y+ 应向下');

// 4. 纯 z 方向（高度）
const [cx, cy] = R.project25d(0, 0, 100);
assert.ok(Math.abs(cx) < 1e-10, 'z 不影响水平位置');
assert.ok(cy < 0, 'z+ 应向上（屏幕 y 减小）');

// 5. x 和 y 在 2.5D 中对称（45° 旋转）
const [dx] = R.project25d(100, 0, 0);
const [ex] = R.project25d(0, 100, 0);
assert.ok(Math.abs(dx + ex) < 1e-10, 'x 和 y 的水平投影应大小相等方向相反');

// 6. 2D 投影不退化
const [fx, fy] = R.project2d(100, 200, 50);
assert.strictEqual(fx, 100);
assert.strictEqual(fy, 200, '2D 投影忽略 z');

// 7. zoom 缩放
const [gx, gy] = R.project25d(100, 100, 100, 2);
const [hx, hy] = R.project25d(100, 100, 100, 1);
assert.ok(Math.abs(gx - hx * 2) < 1e-10 && Math.abs(gy - hy * 2) < 1e-10, 'zoom=2 应放大一倍');

// 8. getObjectHeight 默认值
assert.strictEqual(R.getObjectHeight({ type: 'actor', properties: {} }), 170);
assert.strictEqual(R.getObjectHeight({ type: 'camera', properties: {} }), 130);
assert.strictEqual(R.getObjectHeight({ type: 'architecture', properties: {} }), 280);
assert.strictEqual(R.getObjectHeight({ type: 'actor', properties: { height: 180 } }), 180);

// 9. objectScreenBounds 覆盖对象
const bounds = R.objectScreenBounds({
  transform: { position: { x: 0, y: 0, z: 0 }, scale: { x: 100, y: 100, z: 1 } },
  type: 'actor', properties: {},
}, '2d', 1);
assert.ok(bounds.width > 0 && bounds.height > 0, '包围盒应有正宽高');

console.log('PASS 2.5D projection math, zoom, object height, screen bounds');
