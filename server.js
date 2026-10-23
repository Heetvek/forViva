const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "books.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- JSON file storage helpers ----------
function loadBooks() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function saveBooks(books) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2));
}

// ---------- Validation ----------
function validate(b) {
  const { title, author, category, year } = b;
  if (!title || !author || !category || !year) return "All fields are required";
  if (String(title).trim().length < 2) return "Title must be at least 2 characters";
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear())
    return "Enter a valid publication year";
  return null;
}

// ---------- REST API ----------
// GET all books (optional ?search= and ?status=)
app.get("/api/books", (req, res) => {
  let books = loadBooks();
  const { search, status } = req.query;
  if (search) {
    const s = search.toLowerCase();
    books = books.filter(
      (b) => b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s) || b.category.toLowerCase().includes(s)
    );
  }
  if (status) books = books.filter((b) => b.status === status);
  res.json(books);
});

// GET one book
app.get("/api/books/:id", (req, res) => {
  const book = loadBooks().find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });
  res.json(book);
});

// POST add book
app.post("/api/books", (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const books = loadBooks();
  const { title, author, category, year } = req.body;
  const book = {
    id: books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1,
    title: title.trim(), author: author.trim(), category: category.trim(),
    year: Number(year), status: "Available", issuedTo: null, issueDate: null,
  };
  books.push(book);
  saveBooks(books);
  res.status(201).json(book);
});

// PUT update book details
app.put("/api/books/:id", (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const books = loadBooks();
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });
  const { title, author, category, year } = req.body;
  Object.assign(book, { title: title.trim(), author: author.trim(), category: category.trim(), year: Number(year) });
  saveBooks(books);
  res.json(book);
});

// DELETE book
app.delete("/api/books/:id", (req, res) => {
  const books = loadBooks();
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Book not found" });
  books.splice(index, 1);
  saveBooks(books);
  res.json({ message: "Book deleted" });
});

// POST issue a book
app.post("/api/books/:id/issue", (req, res) => {
  const books = loadBooks();
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (book.status === "Issued") return res.status(400).json({ error: "Book is already issued" });
  const name = (req.body.issuedTo || "").trim();
  if (name.length < 2) return res.status(400).json({ error: "Enter the student name" });
  book.status = "Issued";
  book.issuedTo = name;
  book.issueDate = new Date().toISOString().slice(0, 10);
  saveBooks(books);
  res.json(book);
});

// POST return a book
app.post("/api/books/:id/return", (req, res) => {
  const books = loadBooks();
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (book.status === "Available") return res.status(400).json({ error: "Book is not issued" });
  book.status = "Available";
  book.issuedTo = null;
  book.issueDate = null;
  saveBooks(books);
  res.json(book);
});

app.listen(PORT, () => console.log(`Library Management System running at http://localhost:${PORT}`));
