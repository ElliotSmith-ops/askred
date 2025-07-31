import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { event as gaEvent } from '../lib/gtag';
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

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDelayNotice, setShowDelayNotice] = useState(false);
  const [results, setResults] = useState<
  {
    product: string;
    reason: string;
    endorsement_score?: number;
    redditUrl?: string;
    amazonUrl?: string;
  }[]
>([]);

  const handleSearch = useCallback(async (inputQuery?: string) => {
    const searchQuery = (inputQuery ?? query).toString();
  
    if (!searchQuery.trim()) return;
  
    gaEvent({
      action: 'search_submitted',
      category: 'search',
      label: searchQuery,
    });
  
    setLoading(true);
    setShowDelayNotice(false);
  
    const delayTimer = setTimeout(() => {
      setShowDelayNotice(true);
    }, 1200);
  
    const res = await fetch("/api/search", {
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
        action: 'search_empty',
        category: 'search',
        label: searchQuery,
      });
    }
  }, [query]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get("query");
    if (initialQuery && !query) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [handleSearch]);
  
  const sortedResults = [...results].sort((a, b) => {
    const aScore = a.endorsement_score ?? -1;
    const bScore = b.endorsement_score ?? -1;
    return bScore - aScore;
  });

  return (
    <>
      <Head>
        <title>Buydit – Reddit recommends. We link. You buy.</title>
        <meta name="description" content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads." />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.buydit.org/" />
        <meta property="og:title" content="Buydit – Reddit-powered product picks" />
        <meta property="og:description" content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads." />
        <meta property="og:image" content="https://www.buydit.org/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.buydit.org/" />
        <meta name="twitter:title" content="Buydit – Reddit-powered product picks" />
        <meta name="twitter:description" content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads." />
        <meta name="twitter:image" content="https://www.buydit.org/og.png" />
      </Head>

      <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
        <Image src="/Buyditorglogo.png" alt="Buydit Logo" width={200} height={60} className="mb-4 mt-4" />
        <p className="text-center text-gray-700 font-bold mb-6">Reddit recommends. We link. You buy.</p>

        <div className="relative w-full max-w-md mb-4">
  <input
    type="text"
    className="w-full text-black p-3 pr-24 border rounded"
    placeholder="What are you looking for? (e.g. Coffee Grinder)"
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


        <p className="text-xs text-gray-600 -mt-3 mb-4">
          (URLs aren’t fully supported yet — for best results, enter a product name)
        </p>
        <Link
  href="/topics"
  className="bg-[#FF9900] hover:bg-[#e68a00] text-white font-semibold px-4 py-2 rounded transition whitespace-nowrap"
>
  Explore Popular Searches
</Link>

        {loading && showDelayNotice && (
          <p className="text-sm text-gray-600 text-center mt-2 max-w-md">
            ⏳ This might be a first-time search. Please allow ~10 seconds while we gather fresh Reddit recommendations.
          </p>
        )}

        <div className="w-full max-w-md mt-6 space-y-4">
          {sortedResults.map((item, idx) => (
            <div key={idx} className="bg-white shadow-md rounded p-4">
              <h2 className="font-semibold text-lg mb-1">
                {item.amazonUrl ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={item.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        gaEvent({
                          action: 'affiliate_click',
                          category: 'product_engagement',
                          label: item.product,
                        })
                      }
                      className="text-[#f97316] hover:underline"
                    >
                      {item.product}
                    </a>
                  </div>
                ) : (
                  <span className="text-[#FF4500]">{item.product}</span>
                )}
              </h2>
              <p className="text-black mb-2">{item.reason}</p>
              {item.endorsement_score != null && (
                <p className="text-sm text-black mb-2">
                  <span className="font-extrabold">Endorsement Strength:</span> {(item.endorsement_score * 100).toFixed(0)}%
                </p>
              )}
              <div className="flex gap-3">
                {item.redditUrl && (
                  <a
                    href={item.redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      gaEvent({
                        action: 'reddit_thread_click',
                        category: 'product_engagement',
                        label: item.product,
                      })
                    }
                    className="inline-block px-4 py-2 rounded text-white font-semibold bg-[#FF4500] hover:bg-[#e03d00] transition"
                  >
                    View Reddit Thread
                  </a>
                )}
                {item.amazonUrl && (
                  <>
                    <a
                      href={item.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        gaEvent({
                          action: 'affiliate_click',
                          category: 'product_engagement',
                          label: item.product,
                        })
                      }
                      className="inline-block px-4 py-2 rounded text-white font-semibold bg-[#FF9900] hover:bg-[#e68a00] transition"
                    >
                      View on Amazon
                    </a>
                    <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                    This link may earn us a few cents and keeps the site ad-free ❤️
</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6 bg-white p-4 rounded-2xl shadow-lg max-w-md w-full"
          >
            <p className="text-center font-semibold mb-3 text-gray-800 flex items-center justify-center gap-2">
              <Share className="w-5 h-5" />
              Share These Results
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const url = `https://www.buydit.org/?query=${encodeURIComponent(query)}`;
                  navigator.clipboard.writeText(url);
                  alert("🔗 Link copied to clipboard!");
                  gaEvent({ action: 'share_copy_link', category: 'engagement', label: query });
                }}
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-800"
              >
                <Clipboard className="w-4 h-4" />
                Copy Link
              </button>

              <a
                href={`sms:?&body=Check this out on Buydit: https://www.buydit.org/?query=${encodeURIComponent(query)}`}
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-blue-100 hover:bg-blue-200 transition text-sm text-gray-800"
                onClick={() => gaEvent({ action: 'share_sms', category: 'engagement', label: query })}
              >
                <MessageSquare className="w-4 h-4" />
                Text Message
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=https://www.buydit.org/?query=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 transition text-sm text-white"
                onClick={() => gaEvent({ action: 'share_facebook', category: 'engagement', label: query })}
              >
                <Globe className="w-4 h-4" />
                Facebook
              </a>

              <a
                href={`https://www.reddit.com/submit?url=https://www.buydit.org/?query=${encodeURIComponent(query)}&title=Awesome+Finds+on+Buydit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-orange-500 hover:bg-orange-600 transition text-sm text-white"
                onClick={() => gaEvent({ action: 'share_reddit', category: 'engagement', label: query })}
              >
                <Megaphone className="w-4 h-4" />
                Reddit
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=Check%20this%20out%20on%20Buydit:%20https://www.buydit.org/?query=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-green-500 hover:bg-green-600 transition text-sm text-white"
                onClick={() => gaEvent({ action: 'share_whatsapp', category: 'engagement', label: query })}
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=https://www.buydit.org/?query=${encodeURIComponent(query)}&text=Check%20this%20out%20on%20Buydit!`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-center px-3 py-2 rounded bg-black hover:bg-gray-800 transition text-sm text-white"
                onClick={() => gaEvent({ action: 'share_twitter', category: 'engagement', label: query })}
              >
                <Link2 className="w-4 h-4" />
                X (Twitter)
              </a>
            </div>
          </motion.div>
        )}

        <button
  onClick={() => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");

    alert(`Press ${isMac ? "⌘" : "Ctrl"} + D to bookmark this page.`);

    gaEvent({
      action: "bookmark_click",
      category: "engagement",
      label: "bookmark_this_page",
    });
  }}
  className="mt-6 bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 px-4 rounded"
>
  🔖 Bookmark This Page
</button>

        <footer className="mt-10 text-sm text-gray-500 text-center px-4">
  <p>This site is not affiliated with Reddit, Inc. All Reddit trademarks are property of their respective owners.</p>
  <p className="mt-1">
    As an Amazon Associate I earn from qualifying purchases — it helps keep Buydit running, ad-free, and genuinely useful. Thank you for the support ❤️
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
