// API helper — talks to Express through the Vite dev proxy (/api → :4000).

const TOKEN_KEY = "ganna_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),

  // auth
  login: (email, password) => request("POST", "/auth/login", { email, password }),
  me: () => request("GET", "/auth/me"),

  // menu
  menu: () => request("GET", "/menu"),
  createMenuItem: (item) => request("POST", "/menu", item),
  updateMenuItem: (id, item) => request("PUT", `/menu/${id}`, item),
  toggleMenuItem: (id) => request("PATCH", `/menu/${id}/toggle`),
  deleteMenuItem: (id) => request("DELETE", `/menu/${id}`),

  // orders (admin)
  orders: () => request("GET", "/orders"),
  deleteOrder: (id) => request("DELETE", `/orders/${id}`),

  // settings (admin)
  settings: () => request("GET", "/settings"),
  updateSettings: (s) => request("PUT", "/settings", s),
  publicSettings: () => request("GET", "/settings/public"),

  // uploads
  upload: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return request("POST", "/upload", fd, true);
  }
};
