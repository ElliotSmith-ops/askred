import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { event as gaEvent } from "../lib/gtag";
import { motion } from "framer-motion";
import {
  Clipboard,
  Send,
  Share,
  MessageSquare,
  Globe,
  Megaphone,
  Link2,
} from "lucide-react";
import { useRouter } from "next/router";

export default function ChristmasGiftPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDelayNotice, setShowDelayNotice] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const [results, setResults] = useState<
    {
      product: string;
      reason: string;
      endorsement_score?: number;
      redditUrl?: string;
      amazonUrl?: string;
    }[]
  >([]);

  const baseShareUrl = "https://www.buydit.org/christmas";

  const resetPage = () => {
    setQuery("");
    setResults([]);
    router.push("/christmas", undefined, { shallow: true });
  };

  const handleSearch = useCallback(
    async (inputQuery?: string) => {
      const searchQuery = (inputQuery ?? query).toString();

      if (!searchQuery.trim()) return;

      gaEvent({
        action: "search_submitted",
        category: "search",
        label: searchQuery,
      });

      setLoading(true);
      setShowDelayNotice(false);

      const delayTimer = setTimeout(() => {
        setShowDelayNotice(true);
      }, 1200);

      const res = await fetch("/api/gift-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      clearTimeout(delayTimer);

      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);

      if (!data.results?.length) {
        gaEvent({
          action: "search_empty",
          category: "search",
          label: searchQuery,
        });
      }
    },
    [query]
  );

  // Helper for preset chips at the bottom
  const runPresetSearch = (presetQuery: string, analyticsLabel: string) => {
    setQuery(presetQuery);

    gaEvent({
      action: "popular_search_click",
      category: "navigation",
      label: analyticsLabel,
    });

    // Trigger the search immediately with this preset
    handleSearch(presetQuery);

    // Keep URL in sync
    router.push(
      `/christmas?query=${encodeURIComponent(presetQuery)}`,
      undefined,
      { shallow: true }
    );
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get("query");
    if (initialQuery && !query) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [handleSearch, query]);

  const sortedResults = [...results].sort((a, b) => {
    const aScore = a.endorsement_score ?? -1;
    const bScore = b.endorsement_score ?? -1;
    return bScore - aScore;
  });

  return (
    <>
      <Head>
        <title>
          Christmas Gift Ideas Generator – Reddit-Powered Gift Finder | Buydit
        </title>
        <meta
          name="description"
          content="Find unique Christmas gift ideas using real crowdsourced Reddit recommendations. Search broadly or get super specific — from “outdoorsy dad” to “gifts for a 24-year-old rock climber.” Fast, thoughtful, and AI-powered."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
        <button onClick={resetPage} className="mb-4 mt-4">
          <Image
            src="/christmas-gift-ideas-generator-buydit.png"
            alt="Buydit Christmas Logo"
            width={300}
            height={90}
            className="cursor-pointer"
          />
        </button>

        <h1 className="text-center text-gray-700 font-bold text-xl sm:text-2xl mb-6">
          Crowdsourced Christmas Gift Ideas
        </h1>

        {/* SEARCH BAR */}
        <div className="relative w-full max-w-md mb-4">
          <input
            type="text"
            className="w-full text-black p-3 pr-24 border rounded"
            placeholder="Dear Santa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                handleSearch();
              }
            }}
          />
          <button
            onClick={() => handleSearch()}
            className="absolute top-1/2 right-2 -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* DESCRIPTION */}
        <p className="text-center text-gray-800 text-sm sm:text-base font-semibold mb-4 leading-snug">
          Search broadly or get super specific <br />
          from “Outdoorsy Dad” to “gifts for a 24-year-old rock climber.”
        </p>

        <p className="text-center text-gray-600 text-sm max-w-lg mx-auto mb-6">
          Discover unique, crowdsourced Christmas gift ideas backed by real
          reddit conversations. Perfect for finding thoughtful holiday gifts
          fast.
        </p>

        {/* DELAY MESSAGE */}
        {loading && showDelayNotice && (
          <p className="text-sm text-gray-600 text-center mt-2 max-w-md">
            ⏳ Gathering fresh recommendations — this may take a few seconds.
          </p>
        )}

        {/* SHARE BOX */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6 bg-white p-4 rounded-2xl shadow-lg max-w-md w-full"
          >
            <button
              onClick={() => setShowShareOptions((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 font-semibold text-gray-800"
            >
              <Share className="w-5 h-5" />
              {showShareOptions ? "Hide Share Options" : "Share These Results"}
            </button>

            {showShareOptions && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => {
                    const url = `${baseShareUrl}?query=${encodeURIComponent(
                      query
                    )}`;
                    navigator.clipboard.writeText(url);
                    alert("🔗 Link copied to clipboard!");
                    gaEvent({
                      action: "share_copy_link",
                      category: "engagement",
                      label: query,
                    });
                  }}
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-800"
                >
                  <Clipboard className="w-4 h-4" />
                  Copy Link
                </button>

                <a
                  href={`sms:?&body=Check this out on Buydit: ${baseShareUrl}?query=${encodeURIComponent(
                    query
                  )}`}
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-blue-100 hover:bg-blue-200 transition text-sm text-gray-800"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text Message
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    `${baseShareUrl}?query=${encodeURIComponent(query)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 transition text-sm text-white"
                >
                  <Globe className="w-4 h-4" />
                  Facebook
                </a>

                <a
                  href={`https://www.reddit.com/submit?url=${encodeURIComponent(
                    `${baseShareUrl}?query=${encodeURIComponent(query)}`
                  )}&title=Awesome+Finds+on+Buydit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-orange-500 hover:bg-orange-600 transition text-sm text-white"
                >
                  <Megaphone className="w-4 h-4" />
                  Reddit
                </a>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Check this out on Buydit: ${baseShareUrl}?query=${encodeURIComponent(
                      query
                    )}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-green-500 hover:bg-green-600 transition text-sm text-white"
                >
                  <Send className="w-4 h-4" />
                  WhatsApp
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                    `${baseShareUrl}?query=${encodeURIComponent(query)}`
                  )}&text=Check%20this%20out%20on%20Buydit!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-black hover:bg-gray-800 transition text-sm text-white"
                >
                  <Link2 className="w-4 h-4" />
                  X (Twitter)
                </a>
              </div>
            )}
          </motion.div>
        )}

        {/* RESULTS */}
        <div className="w-full max-w-md mt-6 space-y-4">
          {sortedResults.map((item, idx) => (
            <div
              key={idx}
              className="bg-white shadow-md rounded-lg p-4 border border-green-200"
            >
              <h2 className="font-semibold text-lg mb-1">
                {item.amazonUrl ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={item.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        gaEvent({
                          action: "affiliate_click",
                          category: "product_engagement",
                          label: item.product,
                        })
                      }
                      className="text-[#b91c1c] hover:underline"
                    >
                      {item.product}
                    </a>
                  </div>
                ) : (
                  <span className="text-[#166534]">{item.product}</span>
                )}
              </h2>

              <p className="text-black mb-2">{item.reason}</p>

              {item.endorsement_score != null && (
                <p className="text-sm text-black mb-2">
                  <span className="font-extrabold">Endorsement Strength:</span>{" "}
                  {(item.endorsement_score * 100).toFixed(0)}%
                </p>
              )}

              <div className="flex gap-3 w-full">
                {item.redditUrl && (
                  <a
                    href={item.redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 rounded text-white font-semibold bg-red-600 hover:bg-red-700 transition text-center"
                  >
                    View Reddit Thread
                  </a>
                )}

                {item.amazonUrl && (
                  <a
                    href={item.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 rounded text-white font-semibold bg-green-600 hover:bg-green-700 transition text-center leading-snug"
                  >
                    View on Amazon
                    <br />
                    <span className="text-xs text-white font-normal opacity-90">
                      This link may earn us a few cents ❤️
                    </span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="candy-cane-divider w-full max-w-md my-8 h-2 rounded-full" />

        {/* Popular Christmas gift searches – SEO + UX helper */}
        <section className="w-full max-w-md mt-10">
          <h2 className="text-center text-gray-800 font-semibold text-base sm:text-lg mb-3">
            Popular Christmas Gift Searches
          </h2>
          <p className="text-center text-gray-600 text-xs sm:text-sm mb-4">
            Jump in with a quick search, or use these to spark ideas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => runPresetSearch("gifts for mom", "gifts_for_mom")}
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              🎁 Gifts for Mom
            </button>

            <button
              type="button"
              onClick={() => runPresetSearch("gifts for dad", "gifts_for_dad")}
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              🎣 Gifts for Dad
            </button>

            <button
              type="button"
              onClick={() =>
                runPresetSearch("gifts for boyfriend", "gifts_for_boyfriend")
              }
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              ❤️ Gifts for Boyfriend
            </button>

            <button
              type="button"
              onClick={() =>
                runPresetSearch("gifts for girlfriend", "gifts_for_girlfriend")
              }
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              💐 Gifts for Girlfriend
            </button>

            <button
              type="button"
              onClick={() =>
                runPresetSearch("gifts for gamers", "gifts_for_gamers")
              }
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              🎮 Gifts for Gamers
            </button>

            <button
              type="button"
              onClick={() =>
                runPresetSearch(
                  "gifts for outdoorsy people",
                  "gifts_for_outdoorsy_people"
                )
              }
              className="px-3 py-2 rounded border border-gray-200 bg-white text-sm text-gray-800 hover:bg-gray-100 transition text-center"
            >
              🏕️ Gifts for Outdoorsy People
            </button>
          </div>
        </section>

        <button
          onClick={() => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");

            alert(`Press ${isMac ? "⌘" : "Ctrl"} + D to bookmark this page.`);

            gaEvent({
              action: "bookmark_click",
              category: "engagement",
              label: "bookmark_christmas_page",
            });
          }}
          className="mt-6 bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 px-4 rounded"
        >
          🔖 Bookmark This Page
        </button>

        <footer className="mt-10 text-sm text-gray-500 text-center px-4">
          <p>
            This site is not affiliated with Reddit, Inc. All Reddit trademarks
            are property of their respective owners.
          </p>
          <p className="mt-1">
            As an Amazon Associate I earn from qualifying purchases — it helps
            keep Buydit running, ad-free, and genuinely useful. Thank you for
            the support ❤️
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
