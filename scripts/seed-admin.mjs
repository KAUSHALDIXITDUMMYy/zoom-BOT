#!/usr/bin/env node

import http from "node:http"
import https from "node:https"

const DOMAIN = process.env.SEED_DOMAIN || "http://localhost:3000"
const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gmail.com"
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "11111111"
const NAME = process.env.SEED_ADMIN_NAME || "Admin"

const payload = JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME })

const isHttps = DOMAIN.startsWith("https://")
const client = isHttps ? https : http

const url = new URL("/api/admin/seed", DOMAIN)
const options = {
  method: "POST",
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
}

const req = client.request(options, (res) => {
  let data = ""
  res.on("data", (chunk) => (data += chunk))
  res.on("end", () => {
    const status = res.statusCode || 0
    if (status >= 200 && status < 300) {
      console.log("Admin seeded successfully")
    } else {
      console.error(`Seed failed (${status}):`, data)
      process.exitCode = 1
    }
  })
})

req.on("error", (err) => {
  console.error("Seed request error:", err)
  process.exitCode = 1
})

req.write(payload)
req.end()


