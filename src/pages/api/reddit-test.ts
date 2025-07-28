import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const testPostId = "16ev19i"; // Replace with any valid Reddit post ID

  try {
    const redditRes = await fetch(`https://www.reddit.com/comments/${testPostId}.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
      }
    });

    const status = redditRes.status;
    const bodyText = await redditRes.text();

    res.status(200).json({
      status,
      isJSON: bodyText.trim().startsWith("["),
      bodySnippet: bodyText.slice(0, 300),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
