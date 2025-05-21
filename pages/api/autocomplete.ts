import { NextApiRequest, NextApiResponse } from "next";
import YouTube from "youtube-sr";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoId } = req.query as { videoId?: string };

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    const list = await YouTube.getPlaylist(`https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`)
    const videos = list.videos.filter(vid => vid.id !== videoId).slice(0, 15)
    if (!videos?.length) {
      return res.status(404).json({ error: "No results found" });
    }
    return res.status(200).json(videos);
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
