"use client";

export function AILoader() {
  return (
    <>
      {/* Scaled down container for UI balance */}
      <div className="relative flex items-center justify-center w-12 h-12 my-6" style={{ perspective: "400px" }}>
        
        {/* 3D Orbital Rings with Drop Shadow Glows */}
        <div 
          className="absolute w-full h-full box-border rounded-full border-b-[2px] border-primary"
          style={{ left: "0%", top: "0%", animation: "rotate1 1.2s linear infinite", filter: "drop-shadow(0 0 2px hsl(var(--primary) / 0.8))" }}
        />
        <div 
          className="absolute w-full h-full box-border rounded-full border-r-[2px] border-primary/60"
          style={{ right: "0%", top: "0%", animation: "rotate2 1.2s 0.1s linear infinite", filter: "drop-shadow(0 0 2px hsl(var(--primary) / 0.5))" }}
        />
        <div 
          className="absolute w-full h-full box-border rounded-full border-t-[2px] border-primary/30"
          style={{ right: "0%", bottom: "0%", animation: "rotate3 1.2s 0.15s linear infinite", filter: "drop-shadow(0 0 2px hsl(var(--primary) / 0.2))" }}
        />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rotate1 {
          0% { transform: rotateX(45deg) rotateY(-45deg) rotateZ(0deg); }
          100% { transform: rotateX(45deg) rotateY(-45deg) rotateZ(360deg); }
        }
        @keyframes rotate2 {
          0% { transform: rotateX(45deg) rotateY(45deg) rotateZ(0deg); }
          100% { transform: rotateX(45deg) rotateY(45deg) rotateZ(360deg); }
        }
        @keyframes rotate3 {
          0% { transform: rotateX(-60deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(-60deg) rotateY(0deg) rotateZ(360deg); }
        }
      `}} />
    </>
  );
}
