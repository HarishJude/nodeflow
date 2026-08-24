import React, { useEffect, useRef } from 'react';
import './WorkflowCanvas.css';

export default function WorkflowCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Set actual size in memory (scaled for retina/high-DPI screens)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Set display size in CSS pixels
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Normalize coordinate system to use CSS pixels
      ctx.scale(dpr, dpr);

      return { width, height };
    };

    let { width, height } = setupCanvas();

    const getInitialNodes = (w, h) => [
      { label: 'Problems', x: 80, y: 100, width: 140, height: 36 },
      { label: 'Researches', x: w - 230, y: 100, width: 150, height: 36 },
      { label: 'Solutions', x: 80, y: h / 2 - 18, width: 160, height: 36 },
      { label: 'Projects', x: w - 230, y: h / 2 - 18, width: 140, height: 36 },
      { label: 'Planning', x: 80, y: h - 140, width: 130, height: 36 },
      { label: 'Next Steps', x: w - 230, y: h - 140, width: 140, height: 36 },
    ];

    let nodes = getInitialNodes(width, height);
    const packets = [];

    const handleResize = () => {
      const dimensions = setupCanvas();
      width = dimensions.width;
      height = dimensions.height;
      nodes = getInitialNodes(width, height);
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connections and spawn moving arrow packets
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let n1 = nodes[i];
          let n2 = nodes[j];
          let cx1 = n1.x + n1.width / 2;
          let cy1 = n1.y + n1.height / 2;
          let cx2 = n2.x + n2.width / 2;
          let cy2 = n2.y + n2.height / 2;

          let dx = cx2 - cx1;
          let dy = cy2 - cy1;
          let dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 450) {
            ctx.beginPath();
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);
            ctx.strokeStyle = 'rgba(33, 150, 243, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (Math.random() < 0.015 && packets.length < 12) {
              const forward = Math.random() > 0.5;
              packets.push({
                source: forward ? n1 : n2,
                target: forward ? n2 : n1,
                progress: 0,
                speed: 0.005 + Math.random() * 0.004,
              });
            }
          }
        }
      }

      // 2. Update and draw traveling directional arrows
      for (let k = packets.length - 1; k >= 0; k--) {
        let pkt = packets[k];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        let x1 = pkt.source.x + pkt.source.width / 2;
        let y1 = pkt.source.y + pkt.source.height / 2;
        let x2 = pkt.target.x + pkt.target.width / 2;
        let y2 = pkt.target.y + pkt.target.height / 2;

        let currentX = x1 + (x2 - x1) * pkt.progress;
        let currentY = y1 + (y2 - y1) * pkt.progress;
        let angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();

        ctx.fillStyle = '#2196F3';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#2196F3';
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw stationary architectural nodes (cards)
      nodes.forEach((node) => {
        let cx = node.x;
        let cy = node.y;

        // Card background & crisp border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.strokeStyle = '#90CAF9';
        ctx.lineWidth = 1.25;

        ctx.beginPath();
        ctx.roundRect(cx, cy, node.width, node.height, 8);
        ctx.fill();
        ctx.stroke();

        // Node text label
        ctx.fillStyle = '#0F172A';
        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, cx + 14, cy + node.height / 2);

        // Status indicator dot
        ctx.beginPath();
        ctx.arc(cx + node.width - 16, cy + node.height / 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2196F3';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="workflow-canvas" />;
}
