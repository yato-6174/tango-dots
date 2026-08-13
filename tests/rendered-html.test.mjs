import assert from "node:assert/strict";
import test from "node:test";

test("renders TangoDots with updated Japanese metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/"), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<title>TangoDots \| 毎日続く英単語帳<\/title>/);
  assert.match(html, /TangoDots/);
});
