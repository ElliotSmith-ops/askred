import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { reddit } from "@/lib/reddit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const SERPAPI_KEY = process.env.SERPAPI_KEY!;

// Types

type SerpResult = {
  title: string;
  link: string;
};

type GPTProduct = {
  product: string;
  reason: string;
  endorsement_score?: number;
  redditUrl: string;
  amazonUrl: string;
};

type Thread = {
  title: string;
  url: string;
  subreddit: string;
  score: number;
  num_comments: number;
};

type MinimalSubmission = {
    expandReplies: (opts: { depth: number; limit: number }) => Promise<{
      comments: { body: string }[];
    }>;
  };
  
  

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (typeof req.body.query !== "string") {
    console.error("❌ Invalid query type received:", req.body.query);
    res.status(400).json({ error: "Invalid query format" });
    return;
  }

  const rawQuery = req.body.query;
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    res.status(400).json({ error: "Missing query" });
    return;
  }
  console.log("🔍 Incoming query payload:", req.body.query);

  try {
    console.log("🔎 Checking Supabase for query:", query);
    const { data: cachedList, error: cacheError } = await supabase
      .from("search_queries")
      .select("gpt_result, reddit_urls")
      .eq("query", query);

    if (cacheError) console.error("❌ Supabase cache check error:", cacheError);
    const cached = cachedList?.[0];

    if (cached && cached.gpt_result) {
      console.log("✅ Cache hit. Returning cached results.");
      res.status(200).json({ results: cached.gpt_result, posts: cached.reddit_urls || [] });
      return;
    }

    console.log("⚡ Searching via SerpAPI (google_light) for:", query);

    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query + " product recommendations site:reddit.com")}&api_key=${SERPAPI_KEY}&num=10`;
    const serpResponse = await axios.get(serpUrl);
    const serpResults: SerpResult[] = serpResponse.data?.organic_results || [];

    console.log("🔍 google_light results found:", serpResults.length);
    serpResults.forEach((r: SerpResult, i: number) => {
      console.log(`  ${i + 1}. ${r.title} — ${r.link}`);
    });

    const threads: Thread[] = serpResults
      .filter((r: SerpResult) => r.link?.includes("reddit.com/r/"))
      .map((r: SerpResult) => ({
        title: r.title,
        url: r.link,
        subreddit: r.link.split("/r/")[1]?.split("/")[0] || "reddit",
        score: 0,
        num_comments: 0,
      }));

    const isVague = (name: string) => {
      return (
        name.trim().split(/\s+/).length <= 2 &&
        name.length <= 20 &&
        !name.toLowerCase().includes(query)
      );
    };

    const processThread = async (thread: Thread): Promise<GPTProduct[]> => {
      console.log("\n==============================");
      console.log("📄 Processing thread:", thread.url);

      try {
        const postIdMatch = thread.url.match(/comments\/(\w+)/);
        const postId = postIdMatch?.[1];
        console.log("🔎 Extracted postId:", postId);

        if (!postId) {
          console.warn("⚠️ Skipping — no postId found.");
          return [];
        }

        console.log("🌐 Fetching Reddit post via API...");
        const submission = reddit.getSubmission(postId) as MinimalSubmission;
        const expandedSubmission = await submission.expandReplies({ depth: 1, limit: 20 });
        const commentsRaw: string[] = expandedSubmission.comments
          .map((c: { body: string }) => c.body)
          .filter(Boolean)
          .slice(0, 15);

        console.log("💬 Top comment count:", commentsRaw.length);

        if (commentsRaw.length === 0) {
          console.warn("⚠️ Skipping — no usable top comments.");
          return [];
        }

        const commentBlock = commentsRaw.map((c, i) => `${i + 1}. ${c}`).join("\n\n");
        console.log("📓 Comment block preview (first 300 chars):", commentBlock.slice(0, 300));

        const prompt = `
        You are an assistant extracting only **clearly endorsed product recommendations** from Reddit comments about "${query}".

        Only include products that are explicitly recommended or praised as something the commenter has **personally used** or strongly supports.

        Skip vague mentions, jokes, comparisons, speculation, or off-topic products. It’s perfectly acceptable to return an empty list if no clear recommendations are found.

        For each recommendation, return:
        - "product": The name of the product being recommended.
        - "reason": A brief explanation of why users recommended it. Include one or two direct quotes from Reddit users in the reason. Wrap quotes in curly smart quotes (“ and ”) instead of escaping them.
        - "endorsement_score": A number from 0 to 1 representing the strength of the endorsement:
          - 0.9–1.0 = Strong, repeated, enthusiastic endorsements by multiple users
          - 0.6–0.8 = Recommended clearly by at least one user
          - 0.3–0.5 = Mentioned with some endorsement but less certainty or consensus
          - 0.0–0.2 = Do not include these

        Output must be valid JSON — no markdown, no intro, no trailing comments. Return only the array.

        Example:
        [
          {
            "product": "Firestone Pond Liner",
            "reason": "Multiple users said it's durable, UV-resistant, and fish-safe. One user wrote, \"I've had it in my pond for 6 years with no issues.\"",
            "endorsement_score": 0.94
          }
        ]

        Comments:
        ${commentBlock}`.trim();

        console.log("🤖 Calling GPT...");
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: "You extract product recommendations from Reddit comments. Return ONLY valid JSON. No markdown, no explanation, no text before or after the array.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content?.trim() || "[]";
        console.log("🨠 GPT Raw Output (first 300 chars):", raw.slice(0, 300));

        let parsed: GPTProduct[] = [];
        try {
          const jsonStart = raw.indexOf("[");
          const jsonEnd = raw.lastIndexOf("]");
          const cleanJson = raw.slice(jsonStart, jsonEnd + 1);

          parsed = JSON.parse(cleanJson).map((item: Omit<GPTProduct, "redditUrl" | "amazonUrl">) => {
            const productName = item.product;
            const enhancedSearch = isVague(productName) ? `${productName} ${query}` : productName;

            return {
              product: productName,
              reason: item.reason,
              endorsement_score: item.endorsement_score || null,
              redditUrl: thread.url,
              amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(enhancedSearch)}&tag=buyit0d40-20`,
            };
          });

          console.log("✅ Parsed product count:", parsed.length);
        } catch (jsonErr) {
          console.error("🔞 JSON parse error:", jsonErr);
          console.error("📝 GPT raw output that failed:", raw);
          return [];
        }

        return parsed;
      } catch (threadErr) {
        console.error("❌ Error processing thread:", thread.url, "\n", threadErr);
        return [];
      }
    };

    const threadPromises = threads.slice(0, 5).map(processThread);
    const parsedArrays = await Promise.all(threadPromises);
    const allParsedResults = parsedArrays.flat().filter(Boolean);

    console.log("📦 Total parsed product results:", allParsedResults.length);

    console.log("🧪 Inserting into Supabase:", {
        query,
        reddit_urls: threads,
        gpt_result: allParsedResults,
      });

      const { error: insertError } = await supabase.from("search_queries").insert([
        {
          query,
          reddit_urls: threads,
          gpt_result: allParsedResults,
          last_updated: new Date().toISOString(),
        }
      ]);

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
    } else {
      console.log("📅 Supabase insert successful.");
    }

    res.status(200).json({ results: allParsedResults, posts: threads });
  } catch (err) {
    console.error("🔥 Fatal error in /api/search:", err);
    res.status(500).json({ error: "Search failed" });
  }
}