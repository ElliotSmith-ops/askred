import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [posts, setPosts] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.results || []);
    setPosts(data.posts || []);
    setLoading(false);
  };

  // Sort results by endorsement_score descending
  const sortedResults = [...results].sort((a, b) => {
    const aScore = a.endorsement_score ?? -1;
    const bScore = b.endorsement_score ?? -1;
    return bScore - aScore;
  });

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4 text-[#FF4500]">AskRed MVP</h1>

      <input
        type="text"
        className="w-full text-black max-w-md p-3 border rounded mb-4"
        placeholder="What are you looking for? (e.g. pond liner)"
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
                  className="text-green-600 underline"
                >
                  Amazon Link
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-10 text-sm text-gray-500 text-center">
  <p>
    This site uses Amazon affiliate links. We may earn a commission.
  </p>
  <p className="mt-2">
    <a href="/privacy" className="underline hover:text-black">Privacy Policy</a> ·{" "}
    <a href="/terms" className="underline hover:text-black">Terms of Use</a>
  </p>
</footer>
    </main>
  );
}
