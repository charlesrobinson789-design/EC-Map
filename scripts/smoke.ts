import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as net.AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url: string): Promise<Response> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Retry until the local static server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  assert.equal(response.status, 200, `${url} should return 200`);
  return response.text();
}

async function fetchTextOrTs(baseUrl: string, relPathWithoutExt: string): Promise<string> {
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    const url = `${baseUrl}/${relPathWithoutExt}${ext}`;
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        return await response.text();
      }
    } catch {
      // continue
    }
  }
  throw new Error(`Could not fetch ${relPathWithoutExt} with any JS/TS extension from ${baseUrl}`);
}

async function readTextOrTs(relPathWithoutExt: string): Promise<string> {
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    try {
      return await readFile(path.join(rootDir, `${relPathWithoutExt}${ext}`), "utf8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Could not find file ${relPathWithoutExt} with any JS/TS extension`);
}

async function fallbackAssetSmoke(error: any): Promise<void> {
  if (error?.code !== "EPERM") throw error;
  const html = await readFile(path.join(rootDir, "index.html"), "utf8");
  const appJs = await readTextOrTs("src/app");
  const styles = await readFile(path.join(rootDir, "src/styles.css"), "utf8");
  const spine = await readTextOrTs("src/spine");

  assert.ok(html.includes('id="app"'), "index.html should include the app mount point");
  assert.ok(html.includes('type="module"'), "index.html should load the app as an ES module");
  assert.ok(appJs.includes("renderIntro"), "app.js should include the intro renderer");
  assert.ok(appJs.includes("renderCoachPacket"), "app.js should include the coach packet renderer");
  assert.ok(styles.includes(".differential-card"), "styles.css should include differential lens styles");
  assert.ok(spine.includes("SPINE_ITEMS"), "spine should include the scored item bank");

  console.log("smoke: local port binding blocked by sandbox; verified core static assets directly");
}

let port: number;
try {
  port = await findOpenPort();
} catch (error) {
  await fallbackAssetSmoke(error);
  process.exit(0);
}
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: rootDir,
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout?.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr?.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer(`${baseUrl}/`);
  const html = await fetchText(`${baseUrl}/`);
  const appJs = await fetchTextOrTs(baseUrl, "src/app");
  const styles = await fetchText(`${baseUrl}/src/styles.css`);
  const spine = await fetchTextOrTs(baseUrl, "src/spine");

  assert.ok(html.includes('id="app"'), "index.html should include the app mount point");
  assert.ok(html.includes('type="module"'), "index.html should load the app as an ES module");
  assert.ok(appJs.includes("renderIntro"), "app.js should include the intro renderer");
  assert.ok(appJs.includes("renderCoachPacket"), "app.js should include the coach packet renderer");
  assert.ok(styles.includes(".differential-card"), "styles.css should include differential lens styles");
  assert.ok(spine.includes("SPINE_ITEMS"), "spine should serve the scored item bank");

  console.log(`smoke: static server responded at ${baseUrl} and served core app assets`);
} catch (error) {
  console.error(serverOutput.trim());
  throw error;
} finally {
  server.kill();
}
