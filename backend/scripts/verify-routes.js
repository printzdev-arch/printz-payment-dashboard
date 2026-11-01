const app = require("../src/app");

console.log("Checking Express router registrations...");

function getRoutes(stack, prefix = "") {
  let routes = [];
  stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      routes.push(`${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle.stack) {
      let match = layer.regexp.source
        .replace("^\\", "")
        .replace("\\/?(?=\\/|$)", "")
        .replace(/\\\//g, "/")
        .replace(/\^/g, "")
        .replace(/\$/g, "");
      if (match.startsWith("?=")) match = "";
      routes = routes.concat(getRoutes(layer.handle.stack, prefix + match));
    }
  });
  return routes;
}

const allRoutes = getRoutes(app._router.stack);
const posProductOrderRoutes = allRoutes.filter((r) => r.includes("product-order") || r.includes("stock-transfer"));

console.log(`Found ${posProductOrderRoutes.length} Product Order & Stock Transfer route endpoints.`);
if (posProductOrderRoutes.length === 0) {
  console.log("SUCCESS: Product Order & Stock Transfer routes have been completely removed!");
} else {
  console.error("ERROR: Some product-order routes are still mounted:", posProductOrderRoutes);
  process.exit(1);
}
