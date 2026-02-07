import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import emailServices from "./config.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
   cors({
      origin: "https://www.erperol.com",
      methods: ["POST", "GET", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
   }),
);

app.use(express.json());

/**
 * Health check endpoint
 * Used for monitoring / probes
 */
app.get("/health", (req, res) => {
   res.status(200).json({
      status: "ok",
      service: "email-svc",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
   });
});

/**
 * Send email endpoint
 */
app.post("/send", async (req, res) => {
   const {
      name,
      email,
      message,
      adminName,
      adminSubject,
      userSubject,
      service,
   } = req.body;

   const config = emailServices[service];
   if (!config) {
      return res
         .status(400)
         .json({ success: false, error: "Invalid service provider" });
   }

   const transporter = nodemailer.createTransport(config);

   try {
      // Load templates
      let adminTemplate = await readFile(
         "templates/admin-message.html",
         "utf-8",
      );
      let userTemplate = await readFile("templates/user-reply.html", "utf-8");

      // Inject dynamic values
      adminTemplate = adminTemplate
         .replace("{{name}}", name)
         .replace("{{email}}", email)
         .replace("{{message}}", message);

      userTemplate = userTemplate.replace("{{name}}", name);

      // Send email to admin
      await transporter.sendMail({
         from: `"${name}" <${config.auth.user}>`,
         to: config.auth.user,
         replyTo: email,
         subject: adminSubject,
         html: adminTemplate,
      });

      // Send auto-reply to user
      await transporter.sendMail({
         from: `"${adminName}" <${config.auth.user}>`,
         to: email,
         subject: userSubject,
         html: userTemplate,
      });

      res.status(200).json({ success: true });
   } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

const PORT = process.env.PORT || 9999;

app.listen(PORT, () => {
   console.log(`✅ Server started on http://localhost:${PORT}`);
});
