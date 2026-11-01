const BASE = "http://localhost:4100/api";
async function j(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, data: d };
}
const login = await j(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "kunal@ganna.in", password: "kunal123" }) });
const token = login.data.token;
const H = { Authorization: `Bearer ${token}` };

const created = [];
for (const [name, rating, comment] of [["Asha", 5, "Best juice in town!"], ["Bikash", 4, "Very fresh, loved it"]]) {
  const r = await j(`${BASE}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: name, rating, comment }) });
  created.push(r.data.review?.id);
  console.log("POST", name, "->", r.status, "id:", r.data.review?.id);
}
const pub = await j(`${BASE}/reviews`);
console.log("public reviews:", pub.data.reviews?.length, "| newest first:", pub.data.reviews?.[0]?.id === created[1]);
const admin = await j(`${BASE}/reviews`, { headers: H });
console.log("admin reviews:", admin.data.reviews?.length);
const del = await j(`${BASE}/reviews/${created[0]}`, { method: "DELETE", headers: H });
console.log("admin delete:", del.status);
const after = await j(`${BASE}/reviews`, { headers: H });
console.log("after delete count:", after.data.reviews?.length);
// cleanup remaining
for (const id of created.slice(1)) await j(`${BASE}/reviews/${id}`, { method: "DELETE", headers: H });
console.log("cleanup done");
