"use client";

import React, { useEffect, useState } from "react";

const HomePage = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-black">
      {/* Mouse Follower */}
      <div
        className="pointer-events-none fixed z-50 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 backdrop-blur-sm transition-transform duration-100"
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Hero */}
      <section className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-7xl rounded-[32px] border border-black/10 bg-white p-6 md:p-12 lg:p-20">
          {/* Top Label */}
          <div className="mb-8 flex justify-center">
            <span className="rounded-full border border-black/10 px-4 py-2 text-xs uppercase tracking-[0.25em] md:text-sm">
              Creative Design Studio
            </span>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-[15vw] font-black leading-[0.9] tracking-tighter md:text-[10vw]">
              DESIGN
            </h1>

            <h1 className="text-[15vw] font-black leading-[0.9] tracking-tighter md:text-[10vw]">
              DIFFERENTLY
            </h1>
          </div>

          {/* Bottom Content */}
          <div className="mt-12 flex flex-col items-center justify-between gap-8 lg:flex-row">
            <p className="max-w-md text-center text-sm text-black/60 md:text-base lg:text-left">
              Building premium websites, digital experiences and visual
              identities that feel modern, elegant and memorable.
            </p>

            <button className="group rounded-full border border-black px-8 py-4 text-sm font-medium transition-all duration-300 hover:bg-black hover:text-white">
              Start Project
              <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          {/* Decorative Lines */}
          <div className="absolute left-0 top-1/2 hidden h-px w-20 bg-black/10 lg:block" />
          <div className="absolute right-0 top-1/2 hidden h-px w-20 bg-black/10 lg:block" />
        </div>
      </section>
    </main>
  );
};

export default HomePage;