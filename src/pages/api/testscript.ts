import { search } from "googlethis";

const run = async () => {
  const results = await search("pond liner site:reddit.com", { page: 0 });
  console.log("🔍 Google results count:", results.results.length);
  results.results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title} — ${r.url}`);
  });
};

run();
