// High-DPI Smooth Spline Performance Chart for Windy

export class PerformanceChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
  }

  render(dataTimeline) {
    if (!this.canvas || !this.ctx || !dataTimeline || dataTimeline.length < 2) return;

    // Handle high DPI displays for crisp rendering
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 30, bottom: 25, left: 35 };

    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Determine max values for scales
    const maxWpm = Math.max(
      ...dataTimeline.map(d => Math.max(d.wpm || 0, d.raw || 0)),
      40
    ) + 10;
    const maxTime = dataTimeline[dataTimeline.length - 1].time || dataTimeline.length;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Compute coordinate mapping
    const getX = (time) => padding.left + (time / maxTime) * plotW;
    const getY = (val) => padding.top + plotH - (val / maxWpm) * plotH;

    // Draw horizontal grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const val = Math.round((maxWpm / gridSteps) * i);
      const y = getY(val);
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
      this.ctx.stroke();

      // Axis label
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '10px JetBrains Mono, monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(val.toString(), padding.left - 8, y + 3);
    }

    // Draw Raw WPM Line (dashed / subtle)
    this.ctx.save();
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    dataTimeline.forEach((pt, idx) => {
      const x = getX(pt.time);
      const y = getY(pt.raw);
      if (idx === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    this.ctx.restore();

    // Draw Net WPM Gradient Area
    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#00f2fe';
    const areaGrad = this.ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGrad.addColorStop(0, accentColor + '33'); // 20% opacity
    areaGrad.addColorStop(1, accentColor + '00'); // 0% opacity

    this.ctx.beginPath();
    dataTimeline.forEach((pt, idx) => {
      const x = getX(pt.time);
      const y = getY(pt.wpm);
      if (idx === 0) this.ctx.moveTo(x, y);
      else {
        // Smooth curve
        const prev = dataTimeline[idx - 1];
        const prevX = getX(prev.time);
        const prevY = getY(prev.wpm);
        const midX = (prevX + x) / 2;
        this.ctx.bezierCurveTo(midX, prevY, midX, y, x, y);
      }
    });

    const lastX = getX(dataTimeline[dataTimeline.length - 1].time);
    const firstX = getX(dataTimeline[0].time);
    const baselineY = padding.top + plotH;
    this.ctx.lineTo(lastX, baselineY);
    this.ctx.lineTo(firstX, baselineY);
    this.ctx.closePath();
    this.ctx.fillStyle = areaGrad;
    this.ctx.fill();

    // Draw Net WPM Main Curve
    this.ctx.strokeStyle = accentColor;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    dataTimeline.forEach((pt, idx) => {
      const x = getX(pt.time);
      const y = getY(pt.wpm);
      if (idx === 0) this.ctx.moveTo(x, y);
      else {
        const prev = dataTimeline[idx - 1];
        const prevX = getX(prev.time);
        const prevY = getY(prev.wpm);
        const midX = (prevX + x) / 2;
        this.ctx.bezierCurveTo(midX, prevY, midX, y, x, y);
      }
    });
    this.ctx.stroke();

    // Plot Error Crosses / Dots
    const errorColor = '#ff4757';
    dataTimeline.forEach(pt => {
      if (pt.errors && pt.errors > 0) {
        const x = getX(pt.time);
        const y = getY(pt.wpm);

        this.ctx.fillStyle = errorColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#0b0f17';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    });
  }
}
