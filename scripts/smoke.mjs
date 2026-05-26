import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url) {
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

async function fetchText(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200, `${url} should return 200`);
  return response.text();
}

const port = await findOpenPort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: rootDir,
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer(`${baseUrl}/`);
  const html = await fetchText(`${baseUrl}/`);
  const appJs = await fetchText(`${baseUrl}/src/app.js`);
  const styles = await fetchText(`${baseUrl}/src/styles.css`);
  const spine = await fetchText(`${baseUrl}/src/spine.js`);

  assert.ok(html.includes('id="app"'), "index.html should include the app mount point");
  assert.ok(html.includes('type="module"'), "index.html should load the app as an ES module");
  assert.ok(appJs.includes("renderIntro"), "app.js should include the intro renderer");
  assert.ok(appJs.includes("renderCoachPacket"), "app.js should include the coach packet renderer");
  assert.ok(styles.includes(".differential-card"), "styles.css should include differential lens styles");
  assert.ok(spine.includes("SPINE_ITEMS"), "spine.js should serve the scored item bank");

  console.log(`smoke: static server responded at ${baseUrl} and served core app assets`);
} catch (error) {
  console.error(serverOutput.trim());
  throw error;
} finally {
  server.kill();
}
