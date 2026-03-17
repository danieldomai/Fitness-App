import express from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import OpenAI from "openai";
import { VectorStore } from "./vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: path.join(__dirname, "uploads") });
let openai;
function getOpenAI() {
  if (!openai) openai = new OpenAI();
  return openai;
}
const store = new VectorStore();

// --------------- helpers ---------------

function chunkText(text, maxChars = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start += maxChars - overlap;
  }
  return chunks;
}

async function embed(texts) {
  const res = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

// --------------- routes ---------------

// Upload & ingest a PDF
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = await readFile(req.file.path);
    const data = await pdf(buffer);
    const text = data.text;

    if (!text.trim()) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    const chunks = chunkText(text);

    // Embed in batches of 100
    store.clear();
    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100);
      const embeddings = await embed(batch);
      batch.forEach((chunk, j) => store.add(chunk, embeddings[j]));
    }

    res.json({
      message: "PDF ingested",
      pages: data.numpages,
      chunks: store.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ask a question
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "No question provided" });
    if (store.size === 0) {
      return res.status(400).json({ error: "No document loaded. Upload a PDF first." });
    }

    const [queryEmbedding] = await embed([question]);
    const results = store.search(queryEmbedding, 5);
    const context = results.map((r) => r.text).join("\n\n---\n\n");

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Answer the user's question using ONLY the provided context. " +
            "If the answer is not in the context, say you don't know. Do not make up information.\n\n" +
            "Context:\n" +
            context,
        },
        { role: "user", content: question },
      ],
    });

    res.json({
      answer: completion.choices[0].message.content,
      sources: results.map((r) => ({
        text: r.text.slice(0, 200) + "...",
        score: r.score.toFixed(4),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------- start ---------------

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`RAG demo running at http://localhost:${PORT}`);
});
