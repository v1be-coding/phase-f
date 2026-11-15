import { expect, test } from "../helpers/fixtures.js";

// Spec #11: open `/?note=<id>` to see that note's text. Each title starts with
// the test contract lines (in the spec issue) that it checks.

const SEED_ID = "00000000-0000-4000-8000-000000000001";
const NOTES_SAVED = /Notes saved: \d+/;
const NO_NOTE_LINE = /^Note:/;
const LIMIT_MESSAGE = /Too many requests\. Try again in \d+ seconds\./;

const noteRoute = (id: string) => new RegExp(`/api/notes/${id}(\\?.*)?$`);
const pathOf = (url: string) => new URL(url).pathname;

test("C1, C2, C4, C5, C14: a saved note's link shows its text once, below the count, and then its new text", { tag: ["@C1", "@C2", "@C4", "@C5", "@C14"] }, async ({ page, request }) => {
  const id = crypto.randomUUID();
  const text = `note link ${crypto.randomUUID()}`;
  const newText = `note link updated ${crypto.randomUUID()}`;
  const requested: string[] = [];
  page.on("request", (sent) => requested.push(pathOf(sent.url())));

  expect((await request.put(`/api/notes/${id}`, { data: { text } })).status()).toBe(200);
  const read = await request.get(`/api/notes/${id}`);
  expect(read.status()).toBe(200);
  expect(await read.json()).toEqual({ id, text });

  await page.goto(`/?note=${id}`);
  const countLine = page.getByText(NOTES_SAVED);
  const noteLine = page.getByText(`Note: ${text}`, { exact: true });
  await expect(countLine).toBeVisible();
  await expect(noteLine).toBeVisible();
  await expect(noteLine).toHaveCount(1);
  expect(requested.filter((path) => path === `/api/notes/${id}`)).toEqual([`/api/notes/${id}`]);

  const countBox = await countLine.boundingBox();
  const noteBox = await noteLine.boundingBox();
  expect(noteBox?.y).toBeGreaterThan(countBox?.y ?? Number.POSITIVE_INFINITY);

  expect((await request.put(`/api/notes/${id}`, { data: { text: newText } })).status()).toBe(200);
  await page.reload();
  await expect(page.getByText(`Note: ${newText}`, { exact: true })).toBeVisible();
  await expect(page.getByText(text)).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText(NOTES_SAVED)).toBeVisible();
  await expect(page.getByText(NO_NOTE_LINE)).toHaveCount(0);
});

test("C15: the seed note's link shows its text", { tag: ["@C15"] }, async ({ page }) => {
  await page.goto(`/?note=${SEED_ID}`);

  await expect(page.getByText("Note: Sample note from the seed step", { exact: true })).toBeVisible();
});

test("C3, C8: an ID with no note shows not found", { tag: ["@C3", "@C8"] }, async ({ page, request }) => {
  const id = crypto.randomUUID();

  const read = await request.get(`/api/notes/${id}`);
  expect(read.status()).toBe(404);
  expect(await read.json()).toEqual({ error: "Not found" });

  await page.goto(`/?note=${id}`);

  await expect(page.getByText("Note: not found", { exact: true })).toBeVisible();
});

test("C1, C9: a value that isn't a note ID shows not found without calling the API", { tag: ["@C1", "@C9"] }, async ({ page, request }) => {
  const id = crypto.randomUUID();
  const requested: string[] = [];
  page.on("request", (sent) => requested.push(pathOf(sent.url())));
  expect((await request.put(`/api/notes/${id}`, { data: { text: `note link ${crypto.randomUUID()}` } })).status()).toBe(200);
  const notFound = page.getByText("Note: not found", { exact: true });

  await page.goto("/?note=count");
  await expect(notFound).toBeVisible();

  await page.goto("/?note=abc");
  await expect(notFound).toBeVisible();

  await page.goto("/?note=");
  await expect(notFound).toBeVisible();

  await page.goto(`/?note=${id}x`);
  await expect(notFound).toBeVisible();
  await expect(page.getByText(NOTES_SAVED)).toBeVisible();

  // The count line calls /api/notes/count on every load, so only other note paths count.
  expect(requested.filter((path) => path.startsWith("/api/notes/") && path !== "/api/notes/count")).toEqual([]);
});

test("C1, C6: an ID in uppercase shows the same note", { tag: ["@C1", "@C6"] }, async ({ page, request }) => {
  const id = crypto.randomUUID();
  const text = `note link ${crypto.randomUUID()}`;
  expect((await request.put(`/api/notes/${id}`, { data: { text } })).status()).toBe(200);

  await page.goto(`/?note=${id.toUpperCase()}`);

  await expect(page.getByText(`Note: ${text}`, { exact: true })).toBeVisible();
});

test("C1, C7: HTML in a note's text shows as written", { tag: ["@C1", "@C7"] }, async ({ page, request }) => {
  const id = crypto.randomUUID();
  const text = `<b>bold ${crypto.randomUUID()}</b> & <i>plain</i>`;
  expect((await request.put(`/api/notes/${id}`, { data: { text } })).status()).toBe(200);

  await page.goto(`/?note=${id}`);

  await expect(page.getByText(`Note: ${text}`, { exact: true })).toBeVisible();
});

test("C1, C13: only the first note value counts", { tag: ["@C1", "@C13"] }, async ({ page, request }) => {
  const first = { id: crypto.randomUUID(), text: `note link first ${crypto.randomUUID()}` };
  const second = { id: crypto.randomUUID(), text: `note link second ${crypto.randomUUID()}` };
  expect((await request.put(`/api/notes/${first.id}`, { data: { text: first.text } })).status()).toBe(200);
  expect((await request.put(`/api/notes/${second.id}`, { data: { text: second.text } })).status()).toBe(200);

  await page.goto(`/?note=${first.id}&note=${second.id}`);

  await expect(page.getByText(`Note: ${first.text}`, { exact: true })).toBeVisible();
  await expect(page.getByText(second.text)).toHaveCount(0);
});

test("C10: the page shows unavailable when the note request gets no response", { tag: ["@C10"] }, async ({ page }) => {
  const id = crypto.randomUUID();
  await page.route(noteRoute(id), (route) => route.abort("failed"));

  await page.goto(`/?note=${id}`);

  await expect(page.getByText("Note: unavailable", { exact: true })).toBeVisible();
});

test("C11: the page shows unavailable when the note request fails with a 500 or a 403", { tag: ["@C11"] }, async ({ page }) => {
  const id = crypto.randomUUID();
  await page.route(noteRoute(id), (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal error" }) }),
  );
  await page.goto(`/?note=${id}`);
  await expect(page.getByText("Note: unavailable", { exact: true })).toBeVisible();

  await page.unroute(noteRoute(id));
  await page.route(noteRoute(id), (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Forbidden" }) }),
  );
  await page.reload();
  await expect(page.getByText("Note: unavailable", { exact: true })).toBeVisible();
});

test.describe("a rate-limited note", () => {
  // The 429 here is a stand-in from page.route, not a real one. The spec doesn't
  // say whether `Note: ` comes before the limit message, so only the message is
  // checked (see "Not checked" in #11's test contract).
  test.use({ allow429: true });

  test("C12: the page shows the limit message when the note request is rate-limited", { tag: ["@C12"] }, async ({ page }) => {
    const id = crypto.randomUUID();
    await page.route(noteRoute(id), (route) =>
      route.fulfill({
        status: 429,
        headers: { "retry-after": "30" },
        contentType: "application/json",
        body: JSON.stringify({ error: "rate_limited", message: "Too many requests", retryAfterSeconds: 30 }),
      }),
    );

    await page.goto(`/?note=${id}`);

    await expect(page.getByText(NOTES_SAVED)).toBeVisible();
    await expect(page.getByText(LIMIT_MESSAGE)).toBeVisible();
  });
});
