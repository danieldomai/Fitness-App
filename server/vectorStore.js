/**
 * Simple in-memory vector store using cosine similarity.
 */

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export class VectorStore {
  constructor() {
    this.chunks = []; // { text, embedding }
  }

  clear() {
    this.chunks = [];
  }

  add(text, embedding) {
    this.chunks.push({ text, embedding });
  }

  search(queryEmbedding, topK = 5) {
    if (this.chunks.length === 0) return [];

    const scored = this.chunks.map((chunk) => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  get size() {
    return this.chunks.length;
  }
}
