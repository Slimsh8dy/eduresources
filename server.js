// server.js
// Express endpoint to send contact-form emails via Gmail (SMTP + Nodemailer).
// Requires .env with GMAIL_USER and GMAIL_PASS (Gmail App Password).

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const {
  PORT = 5174,
  GMAIL_USER,
  GMAIL_PASS,
  CORS_ORIGIN // e.g., https://slimsh8dy.github.io when you deploy
} = process.env;

if (!GMAIL_USER || !GMAIL_PASS) {
  console.error("Missing GMAIL_USER or GMAIL_PASS in environment.");
  process.exit(1);
}

const app = express();
app.use(express.json());
if (CORS_ORIGIN) app.use(cors({ origin: CORS_ORIGIN }));

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/contact", async (req, res) => {
  try {
    const { name = "", email = "", message = "" } = req.body || {};
    const n = String(name).trim();
    const e = String(email).trim();
    const m = String(message).trim();

    if (!n || !e || !m) {
      return res.status(400).json({ ok: false, error: "All fields are required." });
    }
    if (n.length > 200 || e.length > 320 || m.length > 5000) {
      return res.status(400).json({ ok: false, error: "Input too long." });
    }

    const subject = `New contact form message from ${n}`;
    const text = `Name: ${n}\nEmail: ${e}\n\n${m}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
        <p><strong>Name:</strong> ${escapeHtml(n)}</p>
        <p><strong>Email:</strong> ${escapeHtml(e)}</p>
        <hr/>
        <p style="white-space:pre-wrap">${escapeHtml(m)}</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"EduResources Contact" <${GMAIL_USER}>`,
      to: "karolosgala@gmail.com",
      replyTo: e,
      subject,
      text,
      html
    });

    res.json({ ok: true, message: "Message sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to send message." });
  }
});

app.listen(PORT, () => {
  console.log(`Mailer listening on http://localhost:${PORT}`);
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
