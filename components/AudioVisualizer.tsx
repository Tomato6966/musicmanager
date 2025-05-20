'use client';
import { useEffect, useRef, useState } from "react";

export const AudioVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
      // Find the audio element directly in the DOM
      const audioElement = document.querySelector('.rhap_container audio') as HTMLAudioElement;
      if (!audioElement) return;

      // Only set up the audio context once, when we first find the element
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 256;

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const sourceNode = context.createMediaElementSource(audioElement);
        sourceNode.connect(analyserNode);
        analyserNode.connect(context.destination);

        setAnalyser(analyserNode);
        setDataArray(dataArray);

        // Clean up on unmount
        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          if (context.state !== 'closed') {
            sourceNode.disconnect();
            analyserNode.disconnect();
            context.close();
          }
        };
      } catch (error) {
        console.error("Error setting up audio visualizer:", error);
      }
    }, []); // We only want to set up once on mount

    useEffect(() => {
      if (!analyser || !dataArray || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        // Set canvas dimensions
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Increase the number of bars - use full data array
        const barCount = dataArray.length;
        // Make bars thinner
        const barWidth = canvas.width / barCount;
        const barSpacing = barWidth * 0.3;

        // Draw bars
        for (let i = 0; i < barCount; i++) {
          // Slightly randomize height for more dynamic look
          const heightMultiplier = 0.7 + (Math.random() * 0.3);
          const barHeight = (dataArray[i] / 255) * canvas.height * heightMultiplier;

          // Calculate position with spacing
          const x = i * (barWidth + barSpacing);
          const y = canvas.height - barHeight;

          // Create blue/purple gradient for bars
          const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(103, 58, 183, 0.2)'); // Purple
          gradient.addColorStop(0.5, 'rgba(63, 81, 181, 0.3)'); // Indigo
          gradient.addColorStop(1, 'rgba(33, 150, 243, 0.2)'); // Blue

          ctx.fillStyle = gradient;

          // Draw rounded bar with thinner width
          const barWidthFinal = barWidth * 0.7;

          ctx.beginPath();
          ctx.moveTo(x, y + 4); // Rounded top
          ctx.lineTo(x, canvas.height);
          ctx.lineTo(x + barWidthFinal, canvas.height);
          ctx.lineTo(x + barWidthFinal, y + 4);

          // Add rounded top
          ctx.quadraticCurveTo(x + barWidthFinal/2, y, x, y + 4);

          ctx.closePath();
          ctx.fill();

          // Add subtle glow effect
          if (barHeight > canvas.height * 0.3) {
            ctx.shadowColor = 'rgba(103, 58, 183, 0.2)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x + barWidthFinal/2, y + 4, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      };

      draw();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [analyser, dataArray]);

    return (
      <div className="fixed left-0 right-0 bottom-0 h-24 overflow-hidden z-0 pointer-events-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>
    );
  };
