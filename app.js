/************** 工具：长文本换行（副标题用） **************/
function wrapLines(text, maxLen = 80) {
  if (!text) return [""];
  const lines = [];
  for (let i = 0; i < text.length; i += maxLen) lines.push(text.slice(i, i + maxLen));
  return lines;
}

/************** 解析攻击串输入 **************
 * 支持两种形式：
 *  1) 仅重复段：   ":"*100000
 *  2) 带前后缀：   " " + ":"*100000 + "\n1\n"
 * 忽略具体数字，运行时按 N 生成。
 ****************************************************/
function parseAttackBase(attackBase) {
  const full = attackBase.trim();

  // 仅重复段
  const onlyMid = /^"(.*)"\*\d+$/;
  const mOnly = full.match(onlyMid);
  if (mOnly) return { prefix: "", middle: mOnly[1], suffix: "" };

  // 前 + 中*次数 + 后
  const regex = /^(.*)?\s*\+\s*"(.*)"\*\d+\s*(?:\+\s*(.*))?$/;
  const m = full.match(regex);
  if (!m) {
    throw new Error(
      '攻击串格式错误，应类似：\n" " + ":"*100000 + "\\n1\\n"\n或\n":"*100000'
    );
  }
  // 支持转义（如 "\n"、"\u0000"）
  const prefix = m[1] ? eval(m[1]) : "";
  const middle = m[2];
  const suffix = m[3] ? eval(m[3]) : "";
  return { prefix, middle, suffix };
}

/************** 回归：线性 y=a+b x **************/
function linearRegression(xs, ys) {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  const meanY = sumY / n;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (a + b * xs[i])) ** 2, 0);
  const r2 = 1 - ssRes / (ssTot || 1);
  return { a, b, r2 };
}

/************** 回归：二次 y=a+b x+c x^2 **************/
function quadraticRegression(xs, ys) {
  const n = xs.length;
  let X = 0, Y = 0, X2 = 0, X3 = 0, X4 = 0, XY = 0, X2Y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    X += x; Y += y; X2 += x * x; X3 += x * x * x; X4 += x * x * x * x;
    XY += x * y; X2Y += x * x * y;
  }
  // 高斯消元解 3x3
  const A = [[n, X, X2], [X, X2, X3], [X2, X3, X4]];
  const B = [Y, XY, X2Y];
  function solve(A, B) {
    const m = 3;
    for (let i = 0; i < m; i++) {
      let p = i;
      for (let j = i + 1; j < m; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      [A[i], A[p]] = [A[p], A[i]]; [B[i], B[p]] = [B[p], B[i]];
      for (let j = i + 1; j < m; j++) {
        const f = A[j][i] / A[i][i];
        for (let k = i; k < m; k++) A[j][k] -= f * A[i][k];
        B[j] -= f * B[i];
      }
    }
    const x = Array(m).fill(0);
    for (let i = m - 1; i >= 0; i--) {
      let s = B[i];
      for (let j = i + 1; j < m; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x; // [a,b,c]
  }
  const [a, b, c] = solve(A, B);
  return { a, b, c };
}

/************** 回归：指数 y=a·e^(b x) => ln y=ln a + b x **************/
function expRegression(xs, ys) {
  const xs2 = [], ys2 = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] > 0) { xs2.push(xs[i]); ys2.push(Math.log(ys[i])); }
  }
  if (xs2.length < 2) return null;
  const { a: lnA, b, r2 } = linearRegression(xs2, ys2);
  return { a: Math.exp(lnA), b, r2 };
}

/************** 数字显示格式 **************/
function fmtNum(num, digits = 3) {
  if (!Number.isFinite(num)) return 'NaN';
  // 大范围差异时用科学计数法更清晰
  return Math.abs(num) >= 10000 ? num.toExponential(2) : num.toFixed(digits);
}

/************** 自定义插件：在点上绘制耗时 **************/
const PointLabelsPlugin = {
  id: 'pointLabels',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const { ctx, chartArea } = chart;
    const ds = chart.data.datasets?.[0];
    const meta = chart.getDatasetMeta(0);
    if (!ds || !meta || meta.hidden) return;

    const color = pluginOptions?.color || '#111';
    const font  = pluginOptions?.font  || '12px system-ui, Arial';

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const top = chartArea.top + 6;
    const bottom = chartArea.bottom - 2;

    meta.data.forEach((el, i) => {
      const v = Number(ds.data[i]);
      if (!Number.isFinite(v)) return;
      const { x, y } = el.getProps(['x', 'y'], true);
      const yy = Math.min(Math.max(y - 6, top), bottom);
      ctx.fillText(`${v.toFixed(2)} ms`, x, yy);
    });

    ctx.restore();
  }
};
Chart.register(PointLabelsPlugin);

/************** 并发执行：把每个 N 交给 Worker **************/
async function runReDoSConcurrent({ pattern, attackBase, maxLen, step, concurrency }) {
  const parts = parseAttackBase(attackBase);
  const tasks = [];
  for (let n = 1; n <= maxLen; n += step) tasks.push(n);

  const results = {};
  const maxWorkers = Math.max(1, Math.min(concurrency | 0, 32));
  let active = 0, idx = 0;

  return new Promise((resolve) => {
    function pump() {
      if (idx >= tasks.length && active === 0) {
        resolve(results);
        return;
      }
      while (active < maxWorkers && idx < tasks.length) {
        const n = tasks[idx++];
        active++;
        const worker = new Worker(new URL('worker.js', window.location.href));
        worker.onmessage = (e) => {
          const { n, time, error } = e.data;
          if (error) {
            console.error(`N=${n} 错误：`, error);
            results[n] = NaN;
          } else {
            results[n] = time;
          }
          active--; worker.terminate(); pump();
        };
        worker.postMessage({ pattern, ...parts, n });
      }
    }
    pump();
  });
}

/************** 主流程 **************/
window.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('chart').getContext('2d');
  let chart = null;

  document.getElementById('run').addEventListener('click', async () => {
    const pattern = document.getElementById('regex').value.trim();
    const attackBase = document.getElementById('attack').value.trim();
    const maxLen = parseInt(document.getElementById('maxlen').value, 10);
    const step = parseInt(document.getElementById('step').value, 10);
    const concurrency = parseInt(document.getElementById('concurrency').value, 10);
    const fitType = document.getElementById('fitType').value;

    if (!pattern) return alert('请输入正则表达式');
    if (!attackBase) return alert('请输入攻击串输入');
    if (!(maxLen > 0) || !(step > 0)) return alert('最大长度/步长须为正整数');

    let results;
    try {
      results = await runReDoSConcurrent({ pattern, attackBase, maxLen, step, concurrency });
    } catch (e) {
      console.error(e);
      alert('运行失败：' + e.message);
      return;
    }

    const xs = Object.keys(results).map(n => +n).sort((a,b)=>a-b);
    const ys = xs.map(n => results[n]);

    // 公式文本（拟合）
    const titleText = `Regex: ${pattern}`;
    const subtitleLines = wrapLines(`Attack: ${attackBase}`, 88);
    const datasets = [{
      label: '耗时 (ms)',
      data: ys,
      borderColor: 'red',
      backgroundColor: 'red',
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false,
      tension: 0.2
    }];

    let formulaLines = [];

    if (fitType === 'linear') {
      const { a, b, r2 } = linearRegression(xs, ys);
      const fitY = xs.map(x => a + b * x);
      datasets.push({ label: '线性拟合', data: fitY, borderColor: '#1f78b4', pointRadius: 0, fill: false, tension: 0 });
      formulaLines = [`y = ${fmtNum(a)} + ${fmtNum(b)}·x`, `R² = ${fmtNum(r2, 4)}`];
    } else if (fitType === 'quadratic') {
      const { a, b, c } = quadraticRegression(xs, ys);
      const fitY = xs.map(x => a + b * x + c * x * x);
      datasets.push({ label: '二次拟合', data: fitY, borderColor: '#33a02c', pointRadius: 0, fill: false, tension: 0 });
      formulaLines = [`y = ${fmtNum(c)}·x² + ${fmtNum(b)}·x + ${fmtNum(a)}`];
    } else if (fitType === 'exponential') {
      const r = expRegression(xs, ys);
      if (r) {
        const fitY = xs.map(x => r.a * Math.exp(r.b * x));
        datasets.push({ label: '指数拟合', data: fitY, borderColor: '#6a3d9a', pointRadius: 0, fill: false, tension: 0 });
        formulaLines = [`y = ${fmtNum(r.a)}·e^(${fmtNum(r.b)}·x)`, `R² = ${fmtNum(r.r2, 4)}`];
      }
    }

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels: xs, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: titleText,
            align: 'start',
            font: { size: 14, weight: 'bold' },
            padding: { top: 6, bottom: 4 }
          },
          subtitle: {
            display: true,
            text: [...subtitleLines, ...formulaLines],
            align: 'start',
            font: { size: 12 },
            padding: { bottom: 6 }
          },
          legend: { labels: { boxWidth: 12 } },
          pointLabels: { color: '#111', font: '12px system-ui, Arial' } // 点数字配置
        },
        layout: { padding: { top: 6 } },
        scales: {
          x: { title: { display: true, text: '字符串长度 (N)' } },
          y: { title: { display: true, text: '耗时 (ms)' }, beginAtZero: true }
        }
      }
      // 若不想全局注册，也可在此处 plugins: [PointLabelsPlugin]
    });
  });

  // 导出 PNG
  document.getElementById('export').addEventListener('click', () => {
    if (!chart) return alert('请先运行测试生成图表！');
    const link = document.createElement('a');
    link.download = 'redos_result.png';
    link.href = chart.toBase64Image('image/png', 1);
    link.click();
  });
});
