import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises"; // ✅ Biome-approved

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: Number.parseInt(process.env.EMAIL_PORT),
	secure: process.env.EMAIL_SSL === "true",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

app.post("/send", async (req, res) => {
	const { name, email, message } = req.body;

	try {
		// Load templates
		let adminTemplate = await readFile("templates/admin-message.html", "utf-8");
		let userTemplate = await readFile("templates/user-reply.html", "utf-8");

		// Inject dynamic values
		adminTemplate = adminTemplate
			.replace("{{name}}", name)
			.replace("{{email}}", email)
			.replace("{{message}}", message);

		userTemplate = userTemplate.replace("{{name}}", name);

		// Send email to admin
		await transporter.sendMail({
			from: `"${name}" <${process.env.EMAIL_USER}>`,
			to: process.env.EMAIL_USER,
			replyTo: email,
			subject: "New message from contact form",
			html: adminTemplate,
		});

		// Send auto-reply to user
		await transporter.sendMail({
			from: `"ERPerol Team" <${process.env.EMAIL_USER}>`,
			to: email,
			subject: "Thanks for contacting ERPerol",
			html: userTemplate,
		});

		res.status(200).json({ success: true });
	} catch (error) {
		console.error("Email error:", error);
		res.status(500).json({ success: false, error: error.message });
	}
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`✅ Server started on http://localhost:${PORT}`);
});
