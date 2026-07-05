const http = require("http");
const { parse } = require("url");
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../../../.env.local") });

const CONFIG = {
  PORT: process.env.WA_ENGINE_PORT || 4000,
  MAX_RETRY: 5,
  MESSAGE_DELAY_MIN: 2000,
  MESSAGE_DELAY_MAX: 5000,
  MAX_MESSAGES_PER_MINUTE: 20,
  RECONNECT_DELAY: 5000,
  SESSION_DIR: path.join(__dirname, "./sessions"),
  QUEUE_PROCESSOR_INTERVAL: 100,
  QR_TIMEOUT: 60000, // 1 minute QR timeout
  SESSION_CLEANUP_INTERVAL: 3600000, // 1 hour
};

// Ensure session directory exists
if (!fs.existsSync(CONFIG.SESSION_DIR)) {
  fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
}

// Store for devices, queues, stats
const devices = new Map();
const messageQueue = [];
const rateLimiter = new Map();
const deviceStats = new Map();
const qrTimeouts = new Map();

// Logger setup
const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

function generateId() {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomDelay() {
  return Math.floor(
    Math.random() * (CONFIG.MESSAGE_DELAY_MAX - CONFIG.MESSAGE_DELAY_MIN) +
      CONFIG.MESSAGE_DELAY_MIN,
  );
}

function sanitizePhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, "");
  if (!cleaned.startsWith("62") && cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return cleaned + "@s.whatsapp.net";
}

function checkRateLimit(deviceId) {
  const now = Date.now();
  const limit = rateLimiter.get(deviceId) || [];
  const recent = limit.filter((t) => now - t < 60000);
  if (recent.length >= CONFIG.MAX_MESSAGES_PER_MINUTE) return false;
  recent.push(now);
  rateLimiter.set(deviceId, recent);
  return true;
}

function logMessage(deviceId, type, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${deviceId}] [${type.toUpperCase()}] ${message}`;

  // Console with colors
  const colors = {
    info: "\x1b[36m%s\x1b[0m",
    success: "\x1b[32m%s\x1b[0m",
    warning: "\x1b[33m%s\x1b[0m",
    error: "\x1b[31m%s\x1b[0m",
  };

  console.log(colors[type] || colors.info, logEntry);

  // Log to file
  const logFile = path.join(CONFIG.SESSION_DIR, "wa-engine.log");
  fs.appendFileSync(logFile, logEntry + "\n");
}

function updateDeviceStats(deviceId, field, increment = 1) {
  const stats = deviceStats.get(deviceId) || {
    messagesSent: 0,
    messagesFailed: 0,
    lastActivity: Date.now(),
    uptime: Date.now(),
    connections: 0,
    disconnections: 0,
  };

  if (field === "messagesSent" || field === "messagesFailed") {
    stats[field] = (stats[field] || 0) + increment;
  } else if (field === "connections" || field === "disconnections") {
    stats[field] = (stats[field] || 0) + 1;
  }

  stats.lastActivity = Date.now();
  deviceStats.set(deviceId, stats);
}

// Cleanup old QR timeouts
function cleanupQRTimeouts() {
  const now = Date.now();
  for (const [deviceId, timeout] of qrTimeouts.entries()) {
    if (timeout < now) {
      const device = devices.get(deviceId);
      if (device && device.status === "qr_ready") {
        device.status = "disconnected";
        device.qrCode = null;
        broadcastDevicesUpdate();
        logMessage(deviceId, "warning", "QR code expired");
      }
      qrTimeouts.delete(deviceId);
    }
  }
}

setInterval(cleanupQRTimeouts, 30000); // Check every 30 seconds

async function createWhatsAppConnection(deviceId, name, io) {
  const sessionPath = path.join(CONFIG.SESSION_DIR, deviceId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    // HAPUS printQRInTerminal - sudah deprecated
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    browser: Browsers.macOS("Desktop"),
    getMessage: async () => ({ conversation: "" }),
  });

  const deviceData = {
    id: deviceId,
    name,
    sock,
    status: "connecting",
    qrCode: null,
    number: null,
    retryCount: 0,
    createdAt: Date.now(),
  };

  devices.set(deviceId, deviceData);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code - ini yang benar untuk Baileys terbaru
    if (qr) {
      try {
        logMessage(deviceId, "info", "QR Code received, generating image...");

        // QR dari Baileys adalah string yang perlu diencode
        // Formatnya biasanya seperti: '1@abc123def456...'

        // Generate QR code image
        const qrImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: "H",
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        deviceData.qrCode = qrImage;
        deviceData.status = "qr_ready";

        // Set QR timeout
        qrTimeouts.set(deviceId, Date.now() + CONFIG.QR_TIMEOUT);

        logMessage(deviceId, "success", "QR Code generated successfully");

        // Emit QR code via socket
        io.emit("qr_generated", {
          deviceId,
          qrImage: qrImage,
          message: "Scan QR code with WhatsApp",
        });

        broadcastDevicesUpdate(io);
      } catch (err) {
        logMessage(
          deviceId,
          "error",
          `Failed to generate QR image: ${err.message}`,
        );

        // Fallback: kirim raw qr string
        io.emit("qr_raw", {
          deviceId,
          qrString: qr,
          message: "QR code string received",
        });
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      logMessage(
        deviceId,
        "warning",
        `Connection closed. Reconnect: ${shouldReconnect}`,
      );

      if (shouldReconnect && deviceData.retryCount < CONFIG.MAX_RETRY) {
        deviceData.retryCount++;
        deviceData.status = "reconnecting";
        updateDeviceStats(deviceId, "disconnections");
        broadcastDevicesUpdate(io);

        await delay(CONFIG.RECONNECT_DELAY * deviceData.retryCount);
        await createWhatsAppConnection(deviceId, name, io);
      } else {
        deviceData.status = "disconnected";
        deviceData.qrCode = null;
        updateDeviceStats(deviceId, "disconnections");
        broadcastDevicesUpdate(io);

        if (!shouldReconnect) {
          // Logged out - clean up
          devices.delete(deviceId);
          deviceStats.delete(deviceId);
          rateLimiter.delete(deviceId);
          qrTimeouts.delete(deviceId);

          io.emit("device_removed", { deviceId });
        }
      }
    }

    if (connection === "open") {
      deviceData.status = "connected";
      deviceData.retryCount = 0;
      deviceData.number = sock.user?.id.split(":")[0];
      deviceData.qrCode = null;

      updateDeviceStats(deviceId, "connections");
      qrTimeouts.delete(deviceId);

      logMessage(deviceId, "success", `Connected: ${deviceData.number}`);

      io.emit("device_connected", {
        deviceId,
        number: deviceData.number,
        message: "Device connected successfully",
      });

      broadcastDevicesUpdate(io);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Handle messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      logMessage(
        deviceId,
        "info",
        `Received message from ${msg.key.remoteJid}`,
      );

      // Auto-reply or handle incoming messages here
    }
  });

  return deviceData;
}

// Process message queue
async function processMessageQueue(io) {
  while (messageQueue.length > 0) {
    const task = messageQueue.shift();
    const device = devices.get(task.deviceId);

    if (!device || device.status !== "connected") {
      task.callback({ success: false, error: "Device not connected" });
      continue;
    }

    if (!checkRateLimit(task.deviceId)) {
      logMessage(
        task.deviceId,
        "warning",
        "Rate limit exceeded, requeueing...",
      );
      await delay(60000);
      messageQueue.unshift(task); // Requeue at front
      continue;
    }

    try {
      const jid = sanitizePhoneNumber(task.target);
      logMessage(task.deviceId, "info", `Sending to ${task.target}...`);

      await device.sock.sendMessage(jid, { text: task.message });
      await delay(getRandomDelay());

      updateDeviceStats(task.deviceId, "messagesSent");
      logMessage(task.deviceId, "success", `Message sent to ${task.target}`);

      task.callback({ success: true, deviceId: task.deviceId });

      io.emit("message_result", {
        success: true,
        deviceId: task.deviceId,
        taskId: task.id,
      });
    } catch (error) {
      updateDeviceStats(task.deviceId, "messagesFailed");
      logMessage(task.deviceId, "error", `Failed: ${error.message}`);

      task.callback({ success: false, error: error.message });

      io.emit("message_result", {
        success: false,
        deviceId: task.deviceId,
        taskId: task.id,
        error: error.message,
      });
    }
  }
}

// Broadcast devices update
function broadcastDevicesUpdate(io) {
  const deviceList = Array.from(devices.values()).map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    number: d.number,
    qrCode: d.qrCode,
    stats: deviceStats.get(d.id) || {},
  }));

  io.emit("devices_update", deviceList);
}

// Create HTTP server and Socket.IO
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  logMessage("system", "info", `Client connected: ${socket.id}`);

  socket.on("request_qr", ({ deviceId }) => {
    const device = devices.get(deviceId);
    if (device && device.qrCode) {
      socket.emit("qr_generated", {
        deviceId,
        qrImage: device.qrCode,
      });
    } else {
      socket.emit("qr_error", {
        deviceId,
        message: "QR code not available",
      });
    }
  });

  socket.on("disconnect", () => {
    logMessage("system", "info", `Client disconnected: ${socket.id}`);
  });
});

// HTTP request handling
async function handleRequest(req, res) {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const getBody = () =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  try {
    // API Routes
    if (pathname === "/api/devices" && method === "GET") {
      const deviceList = Array.from(devices.values()).map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        number: d.number,
        qrCode: d.qrCode,
        stats: deviceStats.get(d.id) || {},
      }));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, devices: deviceList }));
      return;
    }

    if (pathname === "/api/device/add" && method === "POST") {
      const body = await getBody();
      const deviceId = generateId();
      const name = body.name || `Device ${devices.size + 1}`;

      // Jangan await di sini biar response cepat
      createWhatsAppConnection(deviceId, name, io).catch((err) => {
        logMessage(
          deviceId,
          "error",
          `Failed to create connection: ${err.message}`,
        );
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Device added",
          deviceId,
          name,
        }),
      );
      return;
    }

    if (
      pathname.startsWith("/api/qr/") &&
      pathname.endsWith("/refresh") &&
      method === "POST"
    ) {
      const deviceId = pathname.split("/")[3];
      const device = devices.get(deviceId);

      if (!device) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Device not found" }));
        return;
      }

      // Force QR regeneration by restarting connection
      if (device.sock) {
        await device.sock.logout().catch(() => {});
      }
      devices.delete(deviceId);

      createWhatsAppConnection(deviceId, device.name, io).catch((err) => {
        logMessage(deviceId, "error", `Failed to refresh QR: ${err.message}`);
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ success: true, message: "QR refresh initiated" }),
      );
      return;
    }

    if (pathname.startsWith("/api/device/") && method === "DELETE") {
      const deviceId = pathname.split("/")[3];
      const device = devices.get(deviceId);

      if (!device) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Device not found" }));
        return;
      }

      try {
        await device.sock.logout();
      } catch (error) {
        logMessage(deviceId, "warning", `Logout error: ${error.message}`);
      }

      devices.delete(deviceId);
      deviceStats.delete(deviceId);
      rateLimiter.delete(deviceId);
      qrTimeouts.delete(deviceId);

      const sessionPath = path.join(CONFIG.SESSION_DIR, deviceId);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      io.emit("device_removed", { deviceId });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Device removed" }));
      return;
    }

    if (pathname === "/api/send-message" && method === "POST") {
      const body = await getBody();
      const { device_id, target, message } = body;

      if (!device_id || !target || !message) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: false, error: "Missing required fields" }),
        );
        return;
      }

      const device = devices.get(device_id);
      if (!device || device.status !== "connected") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: false, error: "Device not connected" }),
        );
        return;
      }

      const taskId = Date.now() + Math.random().toString(36);
      messageQueue.push({
        id: taskId,
        deviceId: device_id,
        target,
        message,
        callback: () => {},
      });

      io.emit("message_queued", {
        taskId,
        deviceId: device_id,
        queuePosition: messageQueue.length,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Message queued",
          queuePosition: messageQueue.length,
          taskId,
        }),
      );
      return;
    }

    if (pathname === "/api/stats" && method === "GET") {
      const overallStats = {
        totalDevices: devices.size,
        activeDevices: Array.from(devices.values()).filter(
          (d) => d.status === "connected",
        ).length,
        queueSize: messageQueue.length,
        devices: Array.from(deviceStats.entries()).map(([id, stats]) => ({
          deviceId: id,
          ...stats,
        })),
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, stats: overallStats }));
      return;
    }

    if (pathname === "/health" && method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          status: "healthy",
          devices: devices.size,
          queue: messageQueue.length,
          uptime: process.uptime(),
        }),
      );
      return;
    }

    // Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Route not found" }));
  } catch (error) {
    logMessage("system", "error", `Request error: ${error.message}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// Attach request handler
server.on("request", handleRequest);

// Start queue processor
setInterval(() => processMessageQueue(io), CONFIG.QUEUE_PROCESSOR_INTERVAL);

// Periodic cleanup of old sessions
setInterval(() => {
  const now = Date.now();
  const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  fs.readdir(CONFIG.SESSION_DIR, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const sessionPath = path.join(CONFIG.SESSION_DIR, file);
      const stats = fs.statSync(sessionPath);
      const age = now - stats.mtimeMs;

      // Remove old sessions that are not currently active
      if (age > SESSION_MAX_AGE && !devices.has(file)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        logMessage("system", "info", `Cleaned up old session: ${file}`);
      }
    });
  });
}, CONFIG.SESSION_CLEANUP_INTERVAL);

// Start server
server.listen(CONFIG.PORT, () => {
  console.log("\n================================================");
  console.log("   🚀 WA ENGINE - Multi-Device WhatsApp Gateway");
  console.log("================================================");
  console.log(`📡 Server:     http://localhost:${CONFIG.PORT}`);
  console.log(`🔌 WebSocket:  ws://localhost:${CONFIG.PORT}`);
  console.log(`📁 Sessions:   ${CONFIG.SESSION_DIR}`);
  console.log(`⚡ Rate Limit: ${CONFIG.MAX_MESSAGES_PER_MINUTE} msg/min`);
  console.log(`📊 Queue:      Active`);
  console.log("================================================\n");

  logMessage("system", "success", `WA Engine started on port ${CONFIG.PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n🛑 Shutting down gracefully...");

  // Clear all intervals
  const intervals = setInterval(() => {}, 10000);
  for (let i = 0; i <= intervals; i++) {
    clearInterval(i);
  }

  // Logout all devices
  const logoutPromises = [];
  for (const [id, device] of devices) {
    logoutPromises.push(
      device.sock.logout().catch((err) => {
        logMessage(id, "warning", `Logout error: ${err.message}`);
      }),
    );
    logMessage(id, "info", "Logging out...");
  }

  await Promise.all(logoutPromises);

  // Close server
  server.close(() => {
    logMessage("system", "success", "Server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.log("⚠️ Force exit after timeout");
    process.exit(1);
  }, 10000);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logMessage("system", "error", `Uncaught Exception: ${error.message}`);
  console.error(error);
});

process.on("unhandledRejection", (error) => {
  logMessage("system", "error", `Unhandled Rejection: ${error.message}`);
  console.error(error);
});
