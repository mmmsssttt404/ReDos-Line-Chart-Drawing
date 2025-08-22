// worker.js - 单点测试放在 Worker 中运行，避免阻塞 UI
self.onmessage = (e) => {
  const { pattern, prefix, middle, suffix, n } = e.data;
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch (err) {
    self.postMessage({ n, time: NaN, error: "正则编译错误: " + err.message });
    return;
  }

  const attack = (prefix || "") + (middle || "").repeat(n) + (suffix || "");
  const t0 = performance.now();
  try {
    regex.test(attack);
  } catch (_) {
    // 忽略匹配异常
  }
  const t1 = performance.now();

  self.postMessage({ n, time: t1 - t0 });
};
