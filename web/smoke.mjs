import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:4000/",
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.Image = dom.window.Image;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.SVGElement = dom.window.SVGElement;

localStorage.setItem("ganna_admin_token", "smoke-token");

function jsonRes(data, ok = true) {
  return { ok, json: async () => data };
}

global.fetch = async (url) => {
  const u = String(url);
  if (u.includes("/api/auth/me")) return jsonRes({ admin: { email: "a@b.c" } });
  if (u.includes("/api/settings")) return jsonRes({ settings: {} });
  if (u.includes("/api/menu"))
    return jsonRes({
      items: [
        { id: 1, name: "Classic", price: 30, costPrice: 15, description: "Fresh", imageUrl: "", isAvailable: 1 },
      ],
    });
  if (u.includes("/api/orders/customers-list")) return jsonRes({ customers: [] });
  if (u.includes("/api/orders")) return jsonRes({ orders: [] });
  return jsonRes({});
};

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");

const { createServer } = await import("vite");
const server = await createServer({
  root: process.cwd(),
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  ssr: { external: ["react", "react-dom", "react-router-dom", "framer-motion"] },
});

try {
  const { LanguageProvider } = await server.ssrLoadModule("/src/language.jsx");
  const { AuthProvider } = await server.ssrLoadModule("/src/auth.jsx");

  for (const [name, path] of [
    ["Menu", "/src/pages/Menu.jsx"],
    ["Settings", "/src/pages/Settings.jsx"],
    ["Orders", "/src/pages/Orders.jsx"],
    ["Customers", "/src/pages/Customers.jsx"],
  ]) {
    const errors = [];
    const onErr = (e) => errors.push((e.error && e.error.stack) || e.error || e.message || String(e));
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onErr);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const mod = await server.ssrLoadModule(path);
      const Page = mod.default;
      const root = createRoot(container);
      root.render(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(
            AuthProvider,
            null,
            React.createElement(MemoryRouter, null, React.createElement(Page))
          )
        )
      );
      await new Promise((r) => setTimeout(r, 350));

      const text = container.textContent.replace(/\s+/g, " ").trim().slice(0, 160);
      root.unmount();
      await new Promise((r) => setTimeout(r, 50));
      if (errors.length) {
        console.log(name + ": CRASH");
        console.log(errors.slice(0, 3).join("\n---\n"));
      } else {
        console.log(name + ": RENDERED OK -> " + text);
      }
    } catch (e) {
      console.log(name + ": MOUNT ERROR -> " + (e.stack || e.message || e));
    } finally {
      container.remove();
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onErr);
    }
  }
} finally {
  await server.close();
}
