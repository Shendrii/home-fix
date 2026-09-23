#!/usr/bin/env node
/**
 * Capture portfolio screenshots (requires `npm run dev` on port 3000).
 * Usage: node scripts/capture-portfolio-screenshots.mjs
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "portfolio");
const base = process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3000";

const shots = [
  { file: "01-landing.png", url: "/", wait: 800, fullPage: true },
  { file: "02-leaderboard.png", url: "/leaderboard-preview", wait: 800, fullPage: false },
  { file: "03-partner-dispatch.png", url: "/portfolio-preview/partner", wait: 1200, fullPage: false },
  { file: "04-client-job-detail.png", url: "/portfolio-preview/job", wait: 1200, fullPage: false },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const shot of shots) {
  const target = `${base}${shot.url}`;
  await page.goto(target, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(shot.wait);
  const path = join(outDir, shot.file);
  await page.screenshot({ path, fullPage: shot.fullPage ?? true });
  console.log(`Wrote ${path}`);
}

await browser.close();
