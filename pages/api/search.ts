import { NextApiRequest, NextApiResponse } from "next";
import YouTube, { Video } from "youtube-sr";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { query } = req.query as { q?: string };

    if (!query) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        const videos: Video[] | null = await YouTube.search(query, { type: "video", safeSearch: false, limit: 25 });
        if (!videos?.length) {
            return res.status(404).json({ error: "No results found" });
        }
        return res.status(200).json(videos);
    } catch (error) {
        console.error("Error searching YouTube:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
