const API = "/api/books";
let editId = null;
let issueId = null;

const $ = (id) => document.getElementById(id);

function showMessage(type, text) {
  const box = $("message");
  box.className = "alert " + type;
  box.textContent = text;
  setTimeout(() => box.classList.add("hidden"), 3500);
}

// ---------- READ ----------
async function loadBooks() {
  const params = new URLSearchParams();
  if ($("search").value.trim()) params.set("search", $("search").value.trim());
  if ($("statusFilter").value) params.set("status", $("statusFilter").value);
  const res = await fetch(API + "?" + params.toString());
  const books = await res.json();
  renderTable(books);
  updateStats();
}

async function updateStats() {
  const all = await (await fetch(API)).json();
  $("statTotal").textContent = all.length;
  $("statAvailable").textContent = all.filter((b) => b.status === "Available").length;
  $("statIssued").textContent = all.filter((b) => b.status === "Issued").length;
}

function renderTable(books) {
  const body = $("bookTable");
  if (!books.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">No books found</td></tr>';
    return;
  }
  body.innerHTML = books.map((b) => `
    <tr>
      <td>${b.id}</td>
      <td>${b.title}</td>
      <td>${b.author}</td>
      <td>${b.category}</td>
      <td>${b.year}</td>
      <td><span class="badge ${b.status}">${b.status}</span></td>
      <td>${b.issuedTo ? b.issuedTo + " (" + b.issueDate + ")" : "-"}</td>
      <td class="row-actions">
        ${b.status === "Available"
          ? `<button class="btn small issue" onclick="openIssue(${b.id}, '${b.title.replace(/'/g, "\\'")}')">Issue</button>`
          : `<button class="btn small ret" onclick="returnBook(${b.id})">Return</button>`}
        <button class="btn small edit" onclick="startEdit(${b.id})">Edit</button>
        <button class="btn small del" onclick="deleteBook(${b.id})">Delete</button>
      </td>
    </tr>`).join("");
}

// ---------- CREATE / UPDATE ----------
$("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    title: $("title").value, author: $("author").value,
    category: $("category").value, year: $("year").value,
  };
  // client-side validation
  if (!data.title.trim() || !data.author.trim() || !data.category || !data.year)
    return showMessage("error", "Please fill all fields");

  const res = await fetch(editId ? `${API}/${editId}` : API, {
    method: editId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) return showMessage("error", result.error);
  showMessage("success", editId ? "Book updated successfully" : "Book added successfully");
  resetForm();
  loadBooks();
});

async function startEdit(id) {
  const b = await (await fetch(`${API}/${id}`)).json();
  editId = id;
  $("title").value = b.title; $("author").value = b.author;
  $("category").value = b.category; $("year").value = b.year;
  $("formTitle").textContent = "Update Book";
  $("submitBtn").textContent = "Update Book";
  $("cancelBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editId = null;
  $("bookForm").reset();
  $("formTitle").textContent = "Add New Book";
  $("submitBtn").textContent = "Add Book";
  $("cancelBtn").classList.add("hidden");
}
$("cancelBtn").addEventListener("click", resetForm);

// ---------- DELETE ----------
async function deleteBook(id) {
  if (!confirm("Delete this book?")) return;
  const res = await fetch(`${API}/${id}`, { method: "DELETE" });
  if (res.ok) { showMessage("success", "Book deleted successfully"); loadBooks(); }
}

// ---------- ISSUE / RETURN ----------
function openIssue(id, title) {
  issueId = id;
  $("issueBookName").textContent = title;
  $("issuedTo").value = "";
  $("issueModal").classList.remove("hidden");
}
$("closeIssue").addEventListener("click", () => $("issueModal").classList.add("hidden"));

$("confirmIssue").addEventListener("click", async () => {
  const res = await fetch(`${API}/${issueId}/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuedTo: $("issuedTo").value }),
  });
  const result = await res.json();
  $("issueModal").classList.add("hidden");
  if (!res.ok) return showMessage("error", result.error);
  showMessage("success", "Book issued successfully");
  loadBooks();
});

async function returnBook(id) {
  const res = await fetch(`${API}/${id}/return`, { method: "POST" });
  if (res.ok) { showMessage("success", "Book returned successfully"); loadBooks(); }
}

// ---------- SEARCH / FILTER ----------
$("search").addEventListener("input", loadBooks);
$("statusFilter").addEventListener("change", loadBooks);

loadBooks();
