function parseAttackBase(attackBase) {
  // 匹配：可能有前缀 + "中间"*数字 + 可能有后缀
  // 示例:  " " + ":"*100000 + "\n1\n"
  const regex = /^(.*)?\s*\+\s*"(.*)"\*\d+\s*(?:\+\s*(.*))?$/;
  const m = attackBase.match(regex);
  if (!m) throw new Error("攻击串格式错误，应类似：\" \" + \":\"*100000 + \"\\n1\\n\"");

  const prefix = m[1] ? eval(m[1]) : "";
  const middle = m[2];
  const suffix = m[3] ? eval(m[3]) : "";

  return { prefix, middle, suffix };
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
        scales: {
          x: { title: { display: true, text: '字符串长度 (N)' } },
          y: { title: { display: true, text: '耗时 (ms)' }, beginAtZero: true }
        }
      }
    });
  });
});
