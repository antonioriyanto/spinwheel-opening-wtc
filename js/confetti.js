let confettiAnimId = null;

export function startConfettiCelebration() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  canvas.classList.remove("hidden");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  const colors = ["#E4B842", "#9E1316", "#FAF7F2", "#F9E28C"];
  const particles = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 7 + Math.random() * 6,
    h: 10 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 2.5 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI * 2,
    vRot: -0.08 + Math.random() * 0.16
  }));

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiAnimId = requestAnimationFrame(renderConfetti);
  }

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  renderConfetti();
}

export function stopConfettiCelebration() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  const canvas = document.getElementById("confettiCanvas");
  if (canvas) canvas.classList.add("hidden");
}