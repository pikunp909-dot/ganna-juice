const BASE = "http://localhost:4100/api";
async function j(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, data: d };
}
const login = await j(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "kunal@ganna.in", password: "kunal123" })
});
const token = login.data.token;

// POST valid
const ok = await j(`${BASE}/reviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ customerName: "Rahul", rating: 5, comment: "Mast juice!" })
});
console.log("POST valid:", ok.status, "| rating:", ok.data.review?.rating, "| name:", ok.data.review?.customerName);
const rid = ok.data.review?.id;

// POST invalid rating
const bad = await j(`${BASE}/reviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ customerName: "Rahul", rating: 9, comment: "x" })
});
console.log("POST invalid rating:", bad.status, "| err:", bad.data.error);

// POST missing name
const noname = await j(`${BASE}/reviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rating: 4 })
});
console.log("POST missing name:", noname.status, "| err:", noname.data.error);

// GET public
const list = await j(`${BASE}/reviews`);
console.log("GET reviews count:", list.data.reviews?.length, "| newest first:", list.data.reviews?.[0]?.id === rid);

// DELETE without token -> 401
const noauth = await j(`${BASE}/reviews/${rid}`, { method: "DELETE" });
console.log("DELETE no token:", noauth.status);

// DELETE with token -> ok
const del = await j(`${BASE}/reviews/${rid}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
console.log("DELETE with token:", del.status);

// DELETE unknown id -> 404
const del404 = await j(`${BASE}/reviews/99999`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
console.log("DELETE missing id:", del404.status);
