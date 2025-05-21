import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { NextApiRequest, NextApiResponse } from "next";
import { PassThrough } from "stream";

import ytdl from "@distube/ytdl-core";

// Set ffmpeg path to use the static binary
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoUrl, filters, bassBoost } = req.query as { videoUrl?: string; filters?: string; bassBoost?: string };

  if (!videoUrl) {
    return res.status(400).json({ error: "Video URL is required" });
  }

  try {
    // Set content type for streaming
    res.setHeader("Content-Type", "audio/mpeg");

    // Create ytdl stream - make sure to use the raw URL
    const stream = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });

    // Create a PassThrough stream for FFmpeg
    const outputStream = new PassThrough();

    // Connect the output stream to the response
    outputStream.pipe(res);

    // Set up FFmpeg command
    const command = ffmpeg(stream)
      .format("mp3")
      .audioCodec("libmp3lame")
      .audioBitrate(320);

    // Parse multiple filters if present
    const filterArray = filters ? filters.split(',') : [];

    // Apply each requested filter
    const audioFilters: string[] = [];

    if (filterArray.includes('subboost')) {
      audioFilters.push('asubboost');
    }
    if (filterArray.includes('subcut')) {
      audioFilters.push('asubcut');
    }
    if (filterArray.includes('bass')) {
      audioFilters.push(`bass=g=${Number(bassBoost) || 6}`);
    }

    if (filterArray.includes('echo')) {
      audioFilters.push('aecho=0.8:0.88:60:0.4');
    }

    if (filterArray.includes('normalize')) {
      audioFilters.push('dynaudnorm');
    }

    if (filterArray.includes('reverb')) {
      audioFilters.push('areverse,aphaser,areverse');
    }

    if (filterArray.includes('nightcore')) {
      audioFilters.push('asetrate=44100*1.25,aresample=44100');
    }

    // Apply all filters if any were requested
    if (audioFilters.length > 0) {
      command.audioFilters(audioFilters);
    }

    // Handle errors
    command.on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).end("Error processing audio");
    });

    // Start the FFmpeg process and pipe to output
    command.pipe(outputStream, { end: true });

  } catch (error) {
    console.error("Error setting up stream:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
