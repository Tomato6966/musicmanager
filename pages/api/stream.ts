import { NextApiRequest, NextApiResponse } from "next";

import ytdl from "@distube/ytdl-core";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoUrl } = req.query as { videoUrl?: string };

  if (!videoUrl) {
    return res.status(400).json({ error: "Video URL is required" });
  }

  try {
    const chunks: Buffer[] = [];
    const stream = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      const audioBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length.toString());
      res.send(audioBuffer);
    });

    stream.on("error", (err) => {
      console.error("Streaming error:", err);
      res.status(500).end("Error streaming audio");
    });
  } catch (error) {
    console.error("Error setting up stream:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
