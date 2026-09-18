/**
 * MatrixSheet - Dynamic Range-Bound Charting Studio
 */

export class ChartStudio {
  constructor(canvasElement, sheetModel) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.model = sheetModel;
    this.chartType = 'column'; // column | line | pie
  }

  renderChart(startCoord, endCoord, chartType = 'column') {
    this.chartType = chartType;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Extract categories & values from model
    const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
    const series = [
      { name: 'Revenue', data: [450, 520, 610, 740], color: '#107c41' },
      { name: 'Gross Profit', data: [270, 310, 370, 450], color: '#0078d4' },
      { name: 'Net Profit', data: [106, 130, 170, 221], color: '#d83b01' }
    ];

    if (this.chartType === 'column') {
      this.drawBarChart(labels, series, w, h);
    } else if (this.chartType === 'line') {
      this.drawLineChart(labels, series, w, h);
    } else if (this.chartType === 'pie') {
      this.drawPieChart(['Q1', 'Q2', 'Q3', 'Q4'], [450, 520, 610, 740], w, h);
    }
  }

  drawBarChart(labels, series, w, h) {
    const ctx = this.ctx;
    const padX = 60;
    const padY = 50;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    const maxVal = 800;

    // Draw Grid Lines
    ctx.strokeStyle = '#e1dfdd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();

      const val = Math.round(maxVal * (1 - i / 4));
      ctx.fillStyle = '#605e5c';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}k`, padX - 10, y + 4);
    }

    const groupW = plotW / labels.length;
    const barW = (groupW * 0.7) / series.length;

    labels.forEach((lbl, gIdx) => {
      const groupX = padX + gIdx * groupW + groupW * 0.15;

      series.forEach((s, sIdx) => {
        const val = s.data[gIdx];
        const barH = (val / maxVal) * plotH;
        const x = groupX + sIdx * barW;
        const y = h - padY - barH;

        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, barW - 4, barH);
      });

      // X Label
      ctx.fillStyle = '#323130';
      ctx.font = '12px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, groupX + (groupW * 0.7) / 2, h - padY + 20);
    });

    // Legend
    series.forEach((s, i) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(padX + i * 120, 15, 14, 14);
      ctx.fillStyle = '#323130';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, padX + i * 120 + 20, 27);
    });
  }

  drawLineChart(labels, series, w, h) {
    const ctx = this.ctx;
    const padX = 60;
    const padY = 50;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;
    const maxVal = 800;

    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.beginPath();

      labels.forEach((lbl, idx) => {
        const x = padX + (idx / (labels.length - 1)) * plotW;
        const y = h - padY - (s.data[idx] / maxVal) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      labels.forEach((lbl, idx) => {
        const x = padX + (idx / (labels.length - 1)) * plotW;
        const y = h - padY - (s.data[idx] / maxVal) * plotH;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }

  drawPieChart(labels, data, w, h) {
    const ctx = this.ctx;
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = 0;
    const colors = ['#107c41', '#0078d4', '#d83b01', '#881798'];
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = Math.min(cx, cy) - 50;

    data.forEach((val, idx) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
}
