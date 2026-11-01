const BASE = "http://localhost:4100/api";
async function j(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, data: d };
}
const login = await j(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "kunal@ganna.in", password: "kunal123" }) });
const token = login.data.token;
console.log("login expiresIn:", login.data.expiresIn, "| token present:", !!token);
const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const menu = await j(`${BASE}/menu`);
const item = menu.data.items?.[0];
console.log("menu item:", item?.id, item?.name);

async function placeOrder(pay) {
  return j(`${BASE}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "Test", customerPhone: "9000000000", mode: "Pickup", paymentMethod: pay, items: [{ menuItemId: item.id, quantity: 2 }] }) });
}
const o1 = await placeOrder("UPI");
const o2 = await placeOrder("COD");
const v1 = await j(`${BASE}/orders/${o1.data.order.id}/verify`, { method: "PATCH", headers: H, body: JSON.stringify({ utrNumber: "123456789012" }) });
const v2 = await j(`${BASE}/orders/${o2.data.order.id}/verify`, { method: "PATCH", headers: H, body: JSON.stringify({ utrNumber: "999999999999" }) });
console.log("verify UPI:", v1.status, "| verify COD:", v2.status);

const expectedUpi = o1.data.order.totalAmount;
const expectedCod = o2.data.order.totalAmount;

const stats = await j(`${BASE}/orders/stats`, { headers: H });
console.log("stats status:", stats.status);
const s = stats.data.stats;
console.log("today:", JSON.stringify(s.today));
console.log("month:", JSON.stringify(s.month));
console.log("split:", JSON.stringify(s.paymentSplit));
console.log("upi match:", s.paymentSplit.upiAmount === expectedUpi, "(", expectedUpi, ")");
console.log("cod match:", s.paymentSplit.codAmount === expectedCod, "(", expectedCod, ")");
console.log("today revenue >= upi+cod:", s.today.revenue >= expectedUpi + expectedCod);

// cleanup test orders
await j(`${BASE}/orders/${o1.data.order.id}`, { method: "DELETE", headers: H });
await j(`${BASE}/orders/${o2.data.order.id}`, { method: "DELETE", headers: H });
console.log("cleanup done");
