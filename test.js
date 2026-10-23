// Simple API test script: node test.js (server must be running)
const B = "http://localhost:3000/api/books";
const J = { "Content-Type": "application/json" };
const results = [];
async function t(id, name, input, expected, fn) {
  const { status, body } = await fn();
  const actual = status;
  results.push({ id, name, input, expected, actual: String(actual) + (body && body.error ? " - " + body.error : ""), pass: String(actual) === String(expected) });
}
const call = async (m, p, b) => { const r = await fetch(B + p, { method: m, headers: J, body: b ? JSON.stringify(b) : undefined }); let body = null; try { body = await r.json(); } catch {} return { status: r.status, body }; };
(async () => {
  const good = { title: "Python Crash Course", author: "Eric Matthes", category: "Programming", year: 2019 };
  await t("T1", "Add valid book", "title, author, category, year", 201, () => call("POST", "", good));
  await t("T2", "Add book with empty fields", "title only", 400, () => call("POST", "", { title: "Test" }));
  await t("T3", "Add book with invalid year", "year = 1500", 400, () => call("POST", "", { ...good, year: 1500 }));
  await t("T4", "View all books", "GET /api/books", 200, () => call("GET", ""));
  await t("T5", "View non-existing book", "id = 99", 404, () => call("GET", "/99"));
  await t("T6", "Update book details", "id = 1, new title", 200, () => call("PUT", "/1", { ...good, title: "Python Crash Course 2nd Ed" }));
  await t("T7", "Issue an available book", "id = 1, issuedTo = Heet", 200, () => call("POST", "/1/issue", { issuedTo: "Heet" }));
  await t("T8", "Issue an already issued book", "id = 1", 400, () => call("POST", "/1/issue", { issuedTo: "Amit" }));
  await t("T9", "Issue book without student name", "issuedTo empty", 400, async () => { await call("POST", "", { title: "Clean Code", author: "Robert Martin", category: "Programming", year: 2008 }); return call("POST", "/2/issue", { issuedTo: "" }); });
  await t("T10", "Return an issued book", "id = 1", 200, () => call("POST", "/1/return"));
  await t("T11", "Return a book that is not issued", "id = 1", 400, () => call("POST", "/1/return"));
  await t("T12", "Search books by keyword", "?search=python", 200, async () => { const r = await call("GET", "?search=python"); return { status: r.body.length === 1 ? 200 : 500, body: null }; });
  await t("T13", "Delete a book", "id = 2", 200, () => call("DELETE", "/2"));
  await t("T14", "Delete non-existing book", "id = 99", 404, () => call("DELETE", "/99"));
  require("fs").writeFileSync("/tmp/test_results.json", JSON.stringify(results, null, 2));
  results.forEach((r) => console.log(r.id.padEnd(4), r.pass ? "PASS" : "FAIL", r.name, "->", r.actual));
})();
