const BASE = "http://localhost:4100/api";
async function j(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, data: d };
}
const login = await j(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "kunal@ganna.in", password: "kunal123" }) });
const token = login.data.token;
const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const menu = await j(`${BASE}/menu`);
const item = menu.data.items[0];
async function place(pay) {
  return j(`${BASE}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "T", customerPhone: "9000000000", mode: "Pickup", paymentMethod: pay, items: [{ menuItemId: item.id, quantity: 1 }] }) });
}
const o1 = await place("UPI");
const o2 = await place("COD");
await j(`${BASE}/orders/${o1.data.order.id}/verify`, { method: "PATCH", headers: H, body: JSON.stringify({ utrNumber: "111111111111" }) });
await j(`${BASE}/orders/${o2.data.order.id}/verify`, { method: "PATCH", headers: H, body: JSON.stringify({ utrNumber: "222222222222" }) });

const expectedUpi = o1.data.order.totalAmount;
const expectedCod = o2.data.order.totalAmount;

const now = new Date();
const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

const s1 = await j(`${BASE}/orders/stats`, { headers: H });
const st = s1.data.stats;
console.log("last7Days length:", st.last7Days?.length);
const todayBucket = st.last7Days?.find(d => d.date === todayKey);
console.log("today bucket:", JSON.stringify(todayBucket));
console.log("today bucket revenue == upi+cod:", todayBucket?.revenue === expectedUpi + expectedCod);

const s2 = await j(`${BASE}/orders/stats?startDate=${todayKey}&endDate=${todayKey}`, { headers: H });
console.log("range status:", s2.status);
console.log("rangeStats:", JSON.stringify(s2.data.stats.rangeStats));
console.log("rangeSplit:", JSON.stringify(s2.data.stats.rangeSplit));
console.log("range revenue match:", s2.data.stats.rangeStats?.revenue === expectedUpi + expectedCod);
console.log("range upi match:", s2.data.stats.rangeSplit?.upiAmount === expectedUpi);
console.log("range cod match:", s2.data.stats.rangeSplit?.codAmount === expectedCod);

const s3 = await j(`${BASE}/orders/stats?startDate=2020-01-01&endDate=2020-01-31`, { headers: H });
console.log("past range revenue:", s3.data.stats.rangeStats?.revenue, "| orders:", s3.data.stats.rangeStats?.orders);

const s4 = await j(`${BASE}/orders/stats?startDate=bad&endDate=also-bad`, { headers: H });
console.log("bad format:", s4.status, s4.data.error);
const s5 = await j(`${BASE}/orders/stats?startDate=2026-11-10&endDate=2026-11-01`, { headers: H });
console.log("start>end:", s5.status, s5.data.error);

await j(`${BASE}/orders/${o1.data.order.id}`, { method: "DELETE", headers: H });
await j(`${BASE}/orders/${o2.data.order.id}`, { method: "DELETE", headers: H });
console.log("cleanup done");
