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
console.log("login status:", login.status);
const token = login.data.token;
if (!token) { console.log("no token — stop"); process.exit(1); }
const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
const put = await j(`${BASE}/settings`, {
  method: "PUT",
  headers: H,
  body: JSON.stringify({
    phone: "+91 85949 34375",
    whatsapp: "+91 85949 34375",
    pincode: "751012",
    exactLocation: "https://maps.app.goo.gl/test123",
    upiId: "kunal@okaxis"
  })
});
console.log("PUT status:", put.status);
console.log("saved pincode:", put.data.settings?.pincode);
console.log("saved exactLocation:", put.data.settings?.exactLocation);
const pub = await j(`${BASE}/settings/public`);
console.log("public pincode:", pub.data.settings?.pincode);
console.log("public exactLocation:", pub.data.settings?.exactLocation);
