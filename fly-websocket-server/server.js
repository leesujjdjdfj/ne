const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("✅ 클라이언트 WebSocket 연결됨");

  ws.on("message", (message) => {
    console.log("📩 메시지 수신:", message);
    // echo 메시지
    ws.send("echo: " + message);
  });

  ws.on("close", () => {
    console.log("❌ 연결 종료됨");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});