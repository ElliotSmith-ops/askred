// lib/redditClient.ts
import axios from "axios";

let accessToken: string | null = null;
let tokenExpiresAt = 0;

export const getRedditToken = async (): Promise<string> => {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) return accessToken;

  const clientId = process.env.REDDIT_CLIENT_ID!;
  const secret = process.env.REDDIT_CLIENT_SECRET!;
  const username = process.env.REDDIT_USERNAME!;
  const password = process.env.REDDIT_PASSWORD!;
  const userAgent = process.env.REDDIT_USER_AGENT!;

  const response = await axios.post(
    "https://www.reddit.com/api/v1/access_token",
    new URLSearchParams({
      grant_type: "password",
      username,
      password,
    }),
    {
      auth: {
        username: clientId,
        password: secret,
      },
      headers: {
        "User-Agent": userAgent,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = response.data.access_token;
  tokenExpiresAt = now + response.data.expires_in * 1000 - 10000; // refresh 10s early

  // TypeScript-safe: we know it's a string here
  return accessToken!;
};
