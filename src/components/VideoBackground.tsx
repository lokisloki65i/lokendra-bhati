import React from "react";

export const VideoBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-black/80 mix-blend-multiply z-10" />
      <video
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center opacity-50 mix-blend-screen"
      />
    </div>
  );
};
