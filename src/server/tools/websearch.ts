export type WebResult = {
  title: string;
  url: string;
  snippet?: string;
};

/**
 * Minimal stub for MVP.
 * Later you can plug a real search API (SerpAPI, Tavily, Search API, etc.).
 */
export async function webSearch(query: string): Promise<WebResult[]> {
  if (!query?.trim()) return [];
  // Return an empty array (or a couple of fake links) so the orchestrator can run.
  return [];
}
