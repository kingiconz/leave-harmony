import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

const PARTICLE_COUNT = 40;

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // MOUSE TRACKING
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // PARTICLE NETWORK (CANVAS)
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // INIT PARTICLES
    particles = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // bounce
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();

        // connect lines
        particles.forEach((p2) => {
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255,255,255,${1 - dist / 120})`;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(draw);
    };

    draw();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-montserrat animate-[fadeIn_1.2s_ease]">

      {/* INLINE CSS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(1.05); }
            to { opacity: 1; transform: scale(1); }
          }

          .wave {
            position: absolute;
            width: 200%;
            height: 200px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
            animation: waveMove 12s linear infinite;
          }

          @keyframes waveMove {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }

          .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: scale(0);
            animation: rippleAnim 0.6s linear;
            pointer-events: none;
          }

          @keyframes rippleAnim {
            to {
              transform: scale(6);
              opacity: 0;
            }
          }
        `}
      </style>

      {/* BACKGROUND */}
      <img
        src="https://i.ibb.co/mVrnptN1/globe.jpg"
        className="absolute inset-0 w-full h-full object-cover scale-104"
      />

      <div className="absolute inset-0 bg-black/70" />

      {/* WAVES */}
      <div className="wave bottom-0 left-0" />
      <div className="wave bottom-10 left-0 opacity-50" />

      {/* PARTICLE CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* NAV */}
        <nav className="flex justify-start px-1 py-1 text-white">
          <div className="flex items-center gap-0">
            <img src="https://i.ibb.co/4nTsnd9v/e-Crime-Bureau-logo-white.png" alt="e Crime Bureau logo white" className="w-32 h-32" />
            <span className="-ml-6 font-montserrat text-2xl font-bold text-white">LeaveTrack</span>
          </div>
        </nav>

        {/* MAIN */}
        <main className="flex-1 flex items-center justify-center px-6">

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 
                          rounded-3xl p-8 text-center shadow-2xl max-w-md w-full">

            <h1 className="text-4xl font-bold text-white mb-4">
              Leave Management
            </h1>

            <p className="text-white/70 mb-8 text-sm">
              Automate leave workflows and gain real-time workforce visibility.
            </p>

            <Button
              asChild
              className="w-full rounded-full h-12 bg-white text-black hover:bg-white/90"
            >
              <Link to="/staff/login">Get started</Link>
            </Button>

          </div>

        </main>

        <footer className="text-center text-white/40 text-sm pb-4">
          © {new Date().getFullYear()} LeaveTrack
        </footer>
      </div>
    </div>
  );
};

export default Index;