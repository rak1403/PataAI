process.loadEnvFile();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { IndicAddressEngine } = require("./src/engine");
const { validatePincode } = require("./src/pincode");

const PORT = process.env.PORT || 3000;
const engine = new IndicAddressEngine();

const PRESETS = [
  {
    id: "banaras-landmark",
    label: "Tier-2 Colloquial + Landmark (Banaras)",
    address: "Hno 14 gali no 3, shiv mandir ke peeche, Lanka, Banaras, UP 221005",
  },
  {
    id: "baroda-missing-fields",
    label: "Missing Door # + City Alias (Baroda)",
    address: "water tanki ke samne, kalyan nagar, Baroda",
  },
  {
    id: "bombay-commercial",
    label: "Commercial + Multi-Landmark + Alias (Bombay)",
    address: "Shop no 12, opp bus stand, near sbi atm, thane west, bombay 400601",
  },
  {
    id: "bangalore-cross",
    label: "South Indian Cross/Main (Bangalore)",
    address: "Flat 204, SLV Residency, 4th cross, near rama temple, Indiranagar, Bangalore 560038",
  },
  {
    id: "jaipur-native",
    label: "Native Hindi Script (Jaipur Devanagari)",
    address: "मकान नं 25, हनुमान मंदिर के पास, शास्त्री नगर, जयपुर 302016",
  },
  {
    id: "malicious-pin",
    label: "Contradictory PIN Mismatch (Varanasi with Bengaluru PIN)",
    address: "Plot 5, shiv temple road, Lanka, Varanasi, UP 560038",
  },
];

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // API: Get Presets
  if (req.method === "GET" && url.pathname === "/api/v1/presets") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ presets: PRESETS }));
    return;
  }

  // API: Standardize Address
  if (req.method === "POST" && url.pathname === "/api/v1/standardize") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (!payload.address || !payload.address.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Field 'address' is required." }));
          return;
        }

        const result = await engine.process(payload.address);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Internal server error" }));
      }
    });
    return;
  }

  // API: Quick PIN Validate
  if (req.method === "POST" && url.pathname === "/api/v1/validate-pin") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = validatePincode(payload.pincode, payload.city, payload.state);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve Static Frontend
  let filePath = path.join(__dirname, "public", url.pathname === "/" ? "index.html" : url.pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "index.html");
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 IndicAddress Standardization Engine running at: http://localhost:${PORT}`);
  console.log(`📡 API endpoint: POST http://localhost:${PORT}/api/v1/standardize\n`);
});
