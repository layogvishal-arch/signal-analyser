// Generates real embeddings for bucket seeds and every email in the bank.
// Runs ONCE at setup time — output is committed to the repo as JSON so the
// app never hits OpenAI at runtime. This keeps the demo instant, free to run
// for anyone cloning the repo, and technically honest (real vectors, real
// cosine similarity).

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import OpenAI from "openai";
import { BUCKETS, type BucketId } from "../src/lib/buckets";

config({ path: ".env.local" });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    "Missing OPENAI_API_KEY. Add it to .env.local and run again."
  );
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

// text-embedding-3-small: 1536 dims, cheap ($0.02/1M tokens), fast.
// Good balance of quality and cost for a demo.
const MODEL = "text-embedding-3-small";

interface BankEmail {
  id: string;
  trueBucket: BucketId;
  subject: string;
  body: string;
  ambiguous: boolean;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  // OpenAI supports up to 2048 inputs per request, but smaller batches reduce
  // the blast radius of failures. 100 is comfortable.
  const response = await openai.embeddings.create({
    model: MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function main() {
  const bank: BankEmail[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "email-bank.json"), "utf-8")
  );

  console.log(`Embedding ${BUCKETS.length} bucket seeds + ${bank.length} emails...`);

  // Bucket seeds — embed subject-and-body-like text so vectors sit in the same
  // semantic space as email vectors.
  const seedTexts = BUCKETS.map((b) => b.seed);
  const seedVectors = await embedBatch(seedTexts);
  const seeds: Record<string, number[]> = {};
  BUCKETS.forEach((b, i) => { seeds[b.id] = seedVectors[i]; });
  console.log(`✓ Embedded ${BUCKETS.length} bucket seeds`);

  // Emails — batch at 100 to avoid oversized requests and to show progress.
  const emails: Record<string, number[]> = {};
  const BATCH_SIZE = 100;
  for (let i = 0; i < bank.length; i += BATCH_SIZE) {
    const batch = bank.slice(i, i + BATCH_SIZE);
    const texts = batch.map((e) => `${e.subject}\n\n${e.body}`);
    const vectors = await embedBatch(texts);
    batch.forEach((e, j) => { emails[e.id] = vectors[j]; });
    console.log(`  ✓ ${Math.min(i + BATCH_SIZE, bank.length)}/${bank.length} emails`);
  }

  const output = { model: MODEL, seeds, emails };
  writeFileSync(
    join(process.cwd(), "data", "embeddings.json"),
    JSON.stringify(output)
  );
  console.log(`✓ Wrote data/embeddings.json (${Object.keys(emails).length} email vectors)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
