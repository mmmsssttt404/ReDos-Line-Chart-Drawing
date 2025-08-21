function parseAttackBase(attackBase) {
  // 允许：前缀 + "中间"*数字 + 后缀
  // 例：" " + ":"*100000 + "\n1\n"
  // 也允许没有前/后缀：      ":"*100000
  const full = attackBase.trim();

  // 只含重复段
  const onlyMid = /^"(.*)"\*\d+$/;
  const mOnly = full.match(onlyMid);
  if (mOnly) {
    return { prefix: "", middle: mOnly[1], suffix: "" };
  }

  // 含前缀/后缀
  const regex = /^(.*)?\s*\+\s*"(.*)"\*\d+\s*(?:\+\s*(.*))?$/;
  const m = full.match(regex);
  if (!m) {
    throw new Error('攻击串格式错误，应类似：\n" " + ":"*100000 + "\\n1\\n"\n或\n":"*100000');
  }

  // 用 eval 让用户能写转义串，例如 "\n1\n"、" " 等
  const prefix = m[1] ? eval(m[1]) : "";
  const middle = m[2];
  const suffix = m[3] ? eval(m[3]) : "";

  return { prefix, middle, suffix };
}

function wrapLines(text, maxLen = 80) {
  // 将长文本按 maxLen 分割为多行；保留原字符串不改动
  const lines = [];
  let i = 0;
  while (i < text.length) {
    lines.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return lines.length ? lines : [""];
}

function testReDoS(pattern, attackBase, maxLen, step) {
  let results = {};
  let regex;

  try {
    regex = new RegExp(pattern);
  } catch (e) {
    alert("正则编译错误: " + e.message);
    return null;
  }

  let parts;
  try {
    parts = parseAttackBase(attackBase);
  } catch (e) {
    alert(e.message);
    return null;
  }

  for (let n = 1; n <= maxLen; n += step) {
    const attack = parts.prefix + parts.middle.repeat(n) + parts.suffix;

    const t0 = performance.now();
    try {
      regex.test(attack);
    } catch (_) {}
    const t1 = performance.now();

    results[n] = t1 - t0; // 毫秒
  }

  return results;
}

window.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('chart').getContext('2d');
  let chart;

  document.getElementById('run').addEventListener('click', () => {
    const pattern = document.getElementById('regex').value.trim();
    const attackBase = document.getElementById('attack').value.trim();
    const maxLen = parseInt(document.getElementById('maxlen').value, 10);
    const step = parseInt(document.getElementById('step').value, 10);

    const results = testReDoS(pattern, attackBase, maxLen, step);
    if (!results) return;

    const labels = Object.keys(results);
    const values = Object.values(results);

    // 生成标题/副标题文本（自动换行）
    const titleText = `Regex: ${pattern}`;
    const subHead = `Attack: ${attackBase}`;
    const subtitleLines = wrapLines(subHead, 80);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '耗时 (ms)',
          data: values,
          borderColor: 'red',
          fill: false,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
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
            text: subtitleLines,
            align: 'start',
            font: { size: 12 },
            padding: { bottom: 8 }
          },
          legend: {
            labels: { boxWidth: 12 }
          }
        },
        layout: {
          padding: { top: 8 }
        },
        scales: {
          x: { title: { display: true, text: '字符串长度 (N)' } },
          y: { title: { display: true, text: '耗时 (ms)' }, beginAtZero: true }
        }
      }
    });
  });

  // 导出为 PNG（包含标题/副标题/图表）
  document.getElementById('export').addEventListener('click', () => {
    if (!chart) {
      alert("请先运行测试生成图表！");
      return;
    }
    const link = document.createElement('a');
    link.href = chart.toBase64Image('image/png', 1);
    link.download = 'redos_result.png';
    link.click();
  });
});
