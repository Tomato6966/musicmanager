'use client';

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
    audioElementRef?: HTMLAudioElement | null;
    audioLoaded: boolean;
    isVisible: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioElementRef, audioLoaded, isVisible }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const prevAudioElementRef = useRef<HTMLAudioElement | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        if (!audioLoaded || !audioElementRef) return;

        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Create analyzer if it doesn't exist
        if (!analyserRef.current && audioContextRef.current) {
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
        }

        // Only reconnect if the audio element has changed
        if (audioElementRef !== prevAudioElementRef.current) {
            // Clean up previous connection
            if (sourceRef.current) {
                try {
                    sourceRef.current.disconnect();
                } catch (error) {
                    console.error("Error disconnecting audio source:", error);
                }
                sourceRef.current = null;
            }

            // Create and connect new source
            if (audioContextRef.current && analyserRef.current && audioElementRef) {
                try {
                    sourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioContextRef.current.destination);
                    prevAudioElementRef.current = audioElementRef;
                } catch (error) {
                    console.error("Error connecting audio source:", error);
                }
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioElementRef, audioLoaded]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (sourceRef.current) {
                try {
                    sourceRef.current.disconnect();
                } catch (error) {
                    console.error("Error disconnecting audio source:", error);
                }
                sourceRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            analyserRef.current = null;
            prevAudioElementRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!audioLoaded || !audioElementRef || !analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.height = 250; // Set initial canvas height

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Helper function to get color based on amplitude (0-255)
        const getHSLColor = (amplitude: number): string => {
            const normalizedAmplitude = amplitude / 255; // 0 (low) to 1 (high)
            const startHue = 230; // Blue
            const hueRange = 60;  // Transition towards purple
            const hue = startHue + (normalizedAmplitude * hueRange);
            return `hsl(${hue}, 100%, 60%)`;
        };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = 250; // Ensure height is consistent on resize
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const draw = () => {
            if (!analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = 3; // Width of each frequency bar
            const barGap = 1;   // Gap between bars
            const totalBarWidth = barWidth + barGap;

            // Calculate how many bars can fit in the canvas width
            const numBarsToDraw = Math.floor(canvas.width / totalBarWidth);
            // Draw bars for the lower frequency bins, up to what fits
            const binsToRender = Math.min(bufferLength, numBarsToDraw);

            for (let i = 0; i < binsToRender; i++) {
                const barValue = dataArray[i]; // Amplitude for this frequency bin (0-255)

                // Calculate bar height (can go up to full canvas height)
                const barHeight = Math.max(1, (barValue / 255) * canvas.height);

                const x = i * totalBarWidth;

                ctx.fillStyle = getHSLColor(barValue);
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioElementRef, audioLoaded]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed bottom-0 left-0 w-full z-10 pointer-events-none transition-opacity duration-300"
            style={{
                opacity: isVisible ? 0.3 : 0,
            }}
        />
    );
};

export default AudioVisualizer;
