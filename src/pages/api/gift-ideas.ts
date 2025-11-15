import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { getRedditToken } from "@/lib/redditClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const SERPAPI_KEY = process.env.SERPAPI_KEY!;

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

type RedditComment = { data: { body?: string } };

const extractFromAmazonUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("amazon.")) return null;

    const pathParts = u.pathname.split("/");
    const titleIndex = pathParts.findIndex((p) => p === "dp") - 1;
    const title =
      titleIndex >= 0 ? pathParts[titleIndex].replace(/[-_]/g, " ") : "";

    const keywords = u.searchParams.get("keywords")?.replace(/[%+]/g, " ");
    return title || keywords || null;
  } catch {
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (typeof req.body.query !== "string") {
    console.error("❌ Invalid query type received:", req.body.query);
    res.status(400).json({ error: "Invalid query format" });
    return;
  }

  const rawQuery = req.body.query;
  let query = rawQuery.trim().toLowerCase();

  const extracted = extractFromAmazonUrl(query);
  if (extracted) {
    console.log("🔍 Extracted keywords from Amazon link:", extracted);
    query = extracted.trim().toLowerCase();
  }

  if (!query) {
    res.status(400).json({ error: "Missing query" });
    return;
  }

  console.log("🎄 Incoming CHRISTMAS query:", req.body.query);

  try {
    // 1) Check Christmas cache
    console.log("🔎 Checking Supabase (christmas_gift_queries) for:", query);
    const { data: cachedList, error: cacheError } = await supabase
      .from("christmas_gift_queries")
      .select("gpt_result, reddit_urls")
      .eq("query", query);

    if (cacheError) {
      console.error("❌ Supabase cache check error:", cacheError);
    }

    const cached = cachedList?.[0];

    if (cached && cached.gpt_result) {
      console.log("✅ Christmas cache hit. Returning cached results.");
      res
        .status(200)
        .json({ results: cached.gpt_result, posts: cached.reddit_urls || [] });
      return;
    }

    // 2) SerpAPI search – Christmas gift flavored query
    console.log("⚡ Searching via SerpAPI (Christmas) for:", query);

    const serpQuery = `christmas gift ideas for ${query} site:reddit.com recommendations`;

    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(
      serpQuery
    )}&api_key=${SERPAPI_KEY}&num=10`;

    const serpResponse = await axios.get(serpUrl);
    const serpResults: SerpResult[] = serpResponse.data?.organic_results || [];

    console.log("🔍 google_light Christmas results found:", serpResults.length);
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

    const fetchRedditComments = async (postId: string): Promise<string[]> => {
      const token = await getRedditToken();

      const response = await fetch(
        `https://oauth.reddit.com/comments/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": process.env.REDDIT_USER_AGENT!,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`Reddit fetch failed with status ${response.status}`);
      }

      const json = await response.json();
      return (
        json?.[1]?.data?.children
          ?.map((c: RedditComment) => c.data?.body)
          .filter((b: string | undefined): b is string => !!b && b.length > 20)
          .slice(0, 15) || []
      );
    };

    const processThread = async (thread: Thread): Promise<GPTProduct[]> => {
      console.log("\n==============================");
      console.log("🎄 Processing CHRISTMAS thread:", thread.url);

      try {
        const postIdMatch = thread.url.match(/comments\/(\w+)/);
        const postId = postIdMatch?.[1];
        console.log("🔎 Extracted postId:", postId);

        if (!postId) {
          console.warn("⚠️ Skipping — no postId found.");
          return [];
        }

        console.log("🌐 Fetching Reddit comments...");
        const commentsRaw = await fetchRedditComments(postId);
        console.log("💬 Top comment count:", commentsRaw.length);

        if (commentsRaw.length === 0) {
          console.warn("⚠️ Skipping — no usable top comments.");
          return [];
        }

        const commentBlock = commentsRaw
          .map((c, i) => `${i + 1}. ${c}`)
          .join("\n\n");
        console.log(
          "📓 Comment block preview (first 300 chars):",
          commentBlock.slice(0, 300)
        );

        const prompt = `
You are an assistant extracting only **clearly endorsed product recommendations** from Reddit comments about Christmas gift ideas for "${query}".

Only include products that are explicitly recommended or praised as something the commenter has personally used or strongly supports.

Skip vague mentions, jokes, comparisons, speculation, or off-topic products. It’s perfectly acceptable to return an empty list if no clear recommendations are found.

For each recommendation, return:
- "product": The name of the product being recommended.
- "reason": A brief explanation of why users recommended **that specific product**. 
  - The reason MUST be tailored to that product, not a generic sentence reused for multiple items.
  - If a single comment mentions several products, create separate entries and make the reason specific to each item.
  - Include one or two direct quotes from Reddit users in the reason when possible. Wrap quotes in curly smart quotes (“ and ”).
- "endorsement_score": A number from 0 to 1 representing the strength of the endorsement:
  - 0.81–1.00 = Strong, repeated, enthusiastic endorsements by multiple users
  - 0.51–0.80 = Recommended clearly by at least one user
  - 0.21–0.50 = Mentioned with some endorsement but less certainty or consensus
  - 0.00–0.20 = Do not include these

Very important:
- Do NOT reuse the exact same "reason" text for different products.
- Each "reason" must mention at least one detail or benefit that applies uniquely or concretely to that specific product.

Output must be valid JSON — no markdown, no intro, no trailing comments. Return only the array.

Comments:
${commentBlock}
        `.trim();

        console.log("🤖 Calling GPT (Christmas extractor)...");
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You extract product recommendations from Reddit comments. Return ONLY valid JSON. No markdown, no explanation, no text before or after the array.",
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

          parsed = JSON.parse(cleanJson).map(
            (
              item: Omit<GPTProduct, "redditUrl" | "amazonUrl">
            ): GPTProduct => {
              const productName = item.product;
              const enhancedSearch = productName; // ✅ Option 1: just the product name

              return {
                product: productName,
                reason: item.reason,
                endorsement_score: item.endorsement_score || null,
                redditUrl: thread.url,
                amazonUrl: `https://www.amazon.com/s?k=${encodeURIComponent(
                  enhancedSearch
                )}&tag=buyit0d40-20`,
              };
            }
          );

          console.log(
            "✅ Parsed Christmas product count from thread:",
            parsed.length
          );
        } catch (jsonErr) {
          console.error("🔞 JSON parse error:", jsonErr);
          console.error("📝 GPT raw output that failed:", raw);
          return [];
        }

        return parsed;
      } catch {
        console.error("❌ Error processing Christmas thread:", thread.url);
        return [];
      }
    };

    const threadPromises = threads.slice(0, 5).map(processThread);
    const parsedArrays = await Promise.all(threadPromises);
    const allParsedResults = parsedArrays.flat().filter(Boolean);

    console.log(
      "📦 Total parsed CHRISTMAS product results (raw):",
      allParsedResults.length
    );

    // 🔁 1) Dedupe by normalized product name (+ amazonUrl when present)
    const normalizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const dedupeMap = new Map<string, GPTProduct>();

    for (const item of allParsedResults) {
      const keyParts = [normalizeName(item.product)];
      if (item.amazonUrl) keyParts.push(item.amazonUrl.toLowerCase());
      const key = keyParts.join("::");

      const existing = dedupeMap.get(key);
      if (!existing) {
        dedupeMap.set(key, item);
      } else {
        const existingScore = existing.endorsement_score ?? 0;
        const newScore = item.endorsement_score ?? 0;

        if (newScore > existingScore) {
          dedupeMap.set(key, item);
        } else if (newScore === existingScore) {
          if ((item.reason?.length || 0) > (existing.reason?.length || 0)) {
            dedupeMap.set(key, item);
          }
        }
      }
    }

    let dedupedResults = Array.from(dedupeMap.values());

    console.log(
      "🎁 Deduped CHRISTMAS product results:",
      dedupedResults.length
    );

    // ⭐ 2) Sort by endorsement_score desc (fallback 0)
    dedupedResults = dedupedResults.sort((a, b) => {
      const aScore = a.endorsement_score ?? 0;
      const bScore = b.endorsement_score ?? 0;
      return bScore - aScore;
    });

    // 🎯 3) Cap results
    const MAX_RESULTS = 12;
    const finalResults = dedupedResults.slice(0, MAX_RESULTS);

    console.log(
      `📊 Final CHRISTMAS results after cap (${MAX_RESULTS}):`,
      finalResults.length
    );

    console.log("🧪 Inserting into Supabase christmas_gift_queries:", {
      query,
      reddit_urls: threads,
      gpt_result: finalResults,
    });

    const { error: insertError } = await supabase
      .from("christmas_gift_queries")
      .insert([
        {
          query,
          reddit_urls: threads,
          gpt_result: finalResults,
          last_updated: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error(
        "❌ Supabase insert error (christmas_gift_queries):",
        insertError
      );
    } else {
      console.log("📅 Supabase Christmas insert successful.");
    }

    res.status(200).json({ results: finalResults, posts: threads });
  } catch (error) {
    console.error("🔥 Fatal error in /api/gift-ideas:", error);
    res.status(500).json({ error: "Christmas gift search failed" });
  }
}
