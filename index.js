import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises"; // ✅ Biome-approved
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const emailServices = {
	erperol: {
		host: process.env.EMAIL_ERPEROL_HOST,
		port: Number.parseInt(process.env.EMAIL_ERPEROL_PORT),
		secure: process.env.EMAIL_ERPEROL_SSL === "true",
		auth: {
			user: process.env.EMAIL_ERPEROL_USER,
			pass: process.env.EMAIL_ERPEROL_PASS,
		},
		fromName: "ERPerol Team",
		adminSubject: "📩 New message from ERPerol Contact Form",
		userSubject: "✅ Thanks for contacting ERPerol",
	},
	gmail: {
		host: process.env.EMAIL_GMAIL_HOST,
		port: Number.parseInt(process.env.EMAIL_GMAIL_PORT),
		secure: process.env.EMAIL_GMAIL_SSL === "true",
		auth: {
			user: process.env.EMAIL_GMAIL_USER,
			pass: process.env.EMAIL_GMAIL_PASS,
		},
		fromName: "Gmail Support",
		adminSubject: "📬 Message via Gmail Contact",
		userSubject: "🙌 We've received your message!",
	},
};

app.post("/send", async (req, res) => {
	const { name, email, message, service } = req.body;

	const config = emailServices[service];
	if (!config) {
		return res
			.status(400)
			.json({ success: false, error: "Invalid service provider" });
	}

	const transporter = nodemailer.createTransport(config);

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
			from: `"${name}" <${config.auth.user}>`,
			to: config.auth.user,
			replyTo: email,
			subject: config.adminSubject,
			html: adminTemplate,
		});

		// Send auto-reply to user
		await transporter.sendMail({
			from: `"${config.fromName}" <${config.auth.user}>`,
			to: email,
			subject: config.userSubject,
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
