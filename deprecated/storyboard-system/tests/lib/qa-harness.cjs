/**
 * QA 脚本统一骨架：硬超时 + 分步超时 + 失败不挂死。
 *
 * 背景：此前多个探针脚本会整轮挂死几十分钟且毫无输出（Playwright 等待 + 管道缓冲），
 * 导致排查只能靠猜。本模块强制约束：
 *   - 全局硬超时：到点立刻 process.exit，不留孤儿浏览器
 *   - 分步超时：单步超时记为 FAIL 并继续，不阻塞后续检查
 *   - 即时输出：每条直接写 stdout 并同步落盘，避免管道缓冲吞掉进度
 */
const fs = require('fs');
const path = require('path');

class Harness {
  constructor({ globalMs = 240000, stepMs = 15000, logPath = null } = {}) {
    this.globalMs = globalMs;
    this.stepMs = stepMs;
    this.logPath = logPath;
    this.results = [];
    this._lines = [];
    this._timer = null;
    this._hard = null;
  }

  start() {
    this._hard = setTimeout(() => {
      this._emit('HARD TIMEOUT: 全局超时，强制退出（排查卡点时请调小 globalMs）');
      this._flush();
      process.exit(2);
    }, this.globalMs);
    // 不阻止事件循环退出
    if (this._hard.unref) this._hard.unref();
    return this;
  }

  stop() { if (this._hard) clearTimeout(this._hard); }

  _emit(line) {
    this._lines.push(line);
    try { process.stdout.write(line + '\n'); } catch (_) {}
  }

  _flush() {
    if (!this.logPath) return;
    try {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.writeFileSync(this.logPath, this._lines.join('\n'));
    } catch (_) {}
  }

  say(msg) { this._emit(String(msg)); }

  record(name, pass, detail) {
    const tag = pass ? 'PASS' : 'FAIL';
    this.results.push({ name, pass, detail });
    this._emit(`${tag} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 300) : ''}`);
    this._flush();
  }

  skip(name, reason) {
    this.results.push({ name, pass: false, skipped: true, reason });
    this._emit(`SKIP ${name} :: ${String(reason).slice(0, 200)}`);
    this._flush();
  }

  /** 单步超时保护：超时即判 FAIL 继续走，绝不让整轮卡死在一处。 */
  async step(label, fn, ms = this.stepMs) {
    const t0 = Date.now();
    try {
      const value = await Promise.race([
        Promise.resolve().then(fn),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`STEP TIMEOUT ${ms}ms`)), ms)),
      ]);
      return { ok: true, value, ms: Date.now() - t0 };
    } catch (err) {
      this.results.push({ name: label, pass: false, error: err.message });
      this._emit(`FAIL ${label} :: ${err.message.slice(0, 200)}`);
      this._flush();
      return { ok: false, error: err, ms: Date.now() - t0 };
    }
  }

  async finish() {
    this.stop();
    const failed = this.results.filter(r => !r.pass).length;
    const total = this.results.length;
    this._emit(`\nRESULT ${total - failed}/${total}`);
    this._flush();
    return { failed, total, results: this.results };
  }
}

module.exports = { Harness };
