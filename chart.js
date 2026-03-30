(function() {
  const gfData = [
    ["2025/11/22",0],["2025/11/22",3316.98],["2025/11/23",4515.02],["2025/11/26",4796.65],
    ["2025/11/27",5004.09],["2025/11/29",5478.04],["2025/11/30",5660.24],
    ["2025/12/02",5766.11],["2025/12/05",5849.06],["2025/12/06",6004.80],
    ["2025/12/10",6019.78],["2025/12/11",6099.32],["2025/12/13",6163.17],
    ["2025/12/14",6263.88],["2025/12/16",6293.85],["2025/12/17",6370.52],
    ["2025/12/20",6440.08],["2025/12/21",6521.76],["2025/12/23",6553.83],
    ["2025/12/25",6581.90],["2025/12/26",6664.54],["2025/12/27",6764.64],
    ["2025/12/28",6850.17],["2025/12/29",6930.71],["2025/12/30",7000.39],
    ["2026/03/01",7096.41],["2026/03/02",7183.72],["2026/03/09",7206.67],
    ["2026/03/15",7293.25],["2026/03/21",7380.81],["2026/03/22",7500.74],
    ["2026/03/29",7527.90]
  ];
  const dmData = [
    ["2025/11/22",0],["2025/12/25",457.87],["2025/12/28",830.52],
    ["2026/03/29",4836.90]
  ];

  const W = 600, H = 240, pad = {top: 16, right: 8, bottom: 32, left: 8};
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  const allDates = gfData.map(d => new Date(d[0]));
  const minDate = allDates[0].getTime();
  const maxDate = allDates[allDates.length - 1].getTime();
  const maxSkill = 9500;

  function x(dateStr) {
    return pad.left + ((new Date(dateStr).getTime() - minDate) / (maxDate - minDate)) * cw;
  }
  function y(val) {
    return pad.top + ch - (val / maxSkill) * ch;
  }

  const skillColors = [
    [8500, "#ff4444"],[8000, "#daa520"],[7500, "#b0b0b0"],[7000, "#cd7f32"],
    [6000, "#dc2626"],[5000, "#8b5cf6"],[4000, "#3b82f6"],[3000, "#3aad3a"],
    [2000, "#d4b800"],[1000, "#e87830"],[0, "#e8e8e8"]
  ];
  function dotColor(val) {
    for (var i = 0; i < skillColors.length; i++) {
      if (val >= skillColors[i][0]) return skillColors[i][1];
    }
    return "#e8e8e8";
  }

  function polyline(data) {
    var line = '<polyline fill="none" stroke="#fff" stroke-width="1.5" points="' +
      data.map(d => x(d[0]).toFixed(1) + ',' + y(d[1]).toFixed(1)).join(' ') + '"/>';
    var dots = data.map(d =>
      '<circle cx="' + x(d[0]).toFixed(1) + '" cy="' + y(d[1]).toFixed(1) + '" r="3" fill="' + dotColor(d[1]) + '"/>'
    ).join('');
    return line + dots;
  }

  var thresholds = [
    [7000, "#cd7f32"], [7500, "#b0b0b0"], [8000, "#daa520"], [8500, "#e00"]
  ];
  var gridLines = thresholds.map(t =>
    '<line x1="' + pad.left + '" y1="' + y(t[0]).toFixed(1) + '" x2="' + (W - pad.right) + '" y2="' + y(t[0]).toFixed(1) + '" stroke="' + t[1] + '" stroke-width="0.5" stroke-dasharray="4,4"/>'
  ).join('');

  var months = ["2025/11","2025/12","2026/01","2026/02","2026/03"];
  var xLabels = months.map(m => {
    var d = new Date(m + "/01");
    if (d.getTime() < minDate || d.getTime() > maxDate) return '';
    var xp = x(m + "/01").toFixed(1);
    return '<line x1="' + xp + '" y1="' + pad.top + '" x2="' + xp + '" y2="' + (H - pad.bottom) + '" stroke="#666" stroke-width="0.5"/>' +
      '<text x="' + xp + '" y="' + (H - 4) + '" text-anchor="middle" font-size="9" fill="#999">' + m.slice(2) + '</text>';
  }).join('');

  var bands = [
    [0,    1000, "#1a1a1a"],
    [1000, 2000, "#2a1500"],
    [2000, 3000, "#2a2200"],
    [3000, 4000, "#052005"],
    [4000, 5000, "#051525"],
    [5000, 6000, "#150d25"],
    [6000, 7000, "#250505"],
    [7000, 7500, "#201308"],
    [7500, 8000, "#181818"],
    [8000, 8500, "#201a08"],
    [8500, 9500, "rainbow"],
  ];
  var bandRects = bands.map(b => {
    var by1 = y(b[1]), by2 = y(b[0]);
    if (b[2] === "rainbow") {
      return '<defs><linearGradient id="rainbowBand" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#2a0808"/>' +
        '<stop offset="16%" stop-color="#2a1500"/>' +
        '<stop offset="33%" stop-color="#2a2200"/>' +
        '<stop offset="50%" stop-color="#082008"/>' +
        '<stop offset="66%" stop-color="#081828"/>' +
        '<stop offset="83%" stop-color="#180d28"/>' +
        '</linearGradient></defs>' +
        '<rect x="' + pad.left + '" y="' + by1.toFixed(1) + '" width="' + cw + '" height="' + (by2 - by1).toFixed(1) + '" fill="url(#rainbowBand)"/>';
    }
    return '<rect x="' + pad.left + '" y="' + by1.toFixed(1) + '" width="' + cw + '" height="' + (by2 - by1).toFixed(1) + '" fill="' + b[2] + '"/>';
  }).join('');

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;font-family:monospace;">' +
    bandRects +
    gridLines + xLabels +
    polyline(gfData) +
    polyline(dmData) +
    '</svg>';

  document.getElementById('skill-chart').innerHTML = svg;
})();
