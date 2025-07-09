import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { event as gaEvent } from '../lib/gtag';


export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    {
      product: string;
      reason: string;
      endorsement_score?: number;
      redditUrl?: string;
      amazonUrl?: string;
    }[]
  >([]);

  const handleSearch = async () => {
    gaEvent({
      action: 'search_submitted',
      category: 'search',
      label: query,
    });    
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
    if (results.length === 0) {
      gaEvent({
        action: 'search_empty',
        category: 'search',
        label: query,
      });
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aScore = a.endorsement_score ?? -1;
    const bScore = b.endorsement_score ?? -1;
    return bScore - aScore;
  });

  return (
    <>
      <Head>
        <title>Buydit – Reddit recommends. We link. You buy.</title>
        <meta
          name="description"
          content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads."
        />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.buydit.org/" />
        <meta property="og:title" content="Buydit – Reddit-powered product picks" />
        <meta
          property="og:description"
          content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads."
        />
        <meta property="og:image" content="https://www.buydit.org/og.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.buydit.org/" />
        <meta name="twitter:title" content="Buydit – Reddit-powered product picks" />
        <meta
          name="twitter:description"
          content="Reddit recommends. We link. You buy. Discover top-rated products backed by real Reddit threads."
        />
        <meta name="twitter:image" content="https://www.buydit.org/og.png" />
      </Head>

      <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
        <Image
          src="/buydit.png"
          alt="Buydit Logo"
          width={200}
          height={60}
          className="mb-6 mt-4"
        />

        <p className="text-center text-gray-700 font-bold mb-6">
          Reddit recommends. We link. You buy.
        </p>

        <input
          type="text"
          className="w-full text-black max-w-md p-3 border rounded mb-4"
          placeholder="What are you looking for? (e.g. Guitars, Moisturizer)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>

        <div className="w-full max-w-md mt-6 space-y-4">
          {sortedResults.map((item, idx) => (
            <div key={idx} className="bg-white shadow-md rounded p-4">
              <h2 className="font-semibold text-lg mb-1 text-[#FF4500]">
                {item.product}
              </h2>
              <p className="text-black mb-2">{item.reason}</p>

              {item.endorsement_score != null && (
                <p className="text-sm text-gray-500 mb-2">
                  Endorsement Strength: {(item.endorsement_score * 100).toFixed(0)}%
                </p>
              )}

              <div className="flex gap-3">
                {item.redditUrl && (
                  <a
                    href={item.redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Reddit Thread
                  </a>
                )}
                {item.amazonUrl && (
                  <a
                  href={item.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    gaEvent({
                      action: 'affiliate_click',
                      category: 'product_engagement',
                      label: item.product, // or product title
                    })
                  }
                >
                  View on Amazon
                </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buy Me a Coffee Button */}
        <div className="mt-10">
          <a
            href="https://www.buymeacoffee.com/ElliotS"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              style={{ height: "60px", width: "217px" }}
            />
          </a>
        </div>

        <footer className="mt-10 text-sm text-gray-500 text-center">
          <p>This site is not affiliated with Reddit, Inc. All Reddit trademarks are property of their respective owners.</p>
          <p>As an Amazon Associate I earn from qualifying purchases.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
