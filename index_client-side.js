import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises"; // ✅ Biome-approved
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/send", async (req, res) => {
	const {
		host,
		port,
		secure,
		user,
		pass,
		name,
		email,
		message,
		adminName,
		adminSubject,
		userSubject,
	} = req.body;

	console.log(host, port, secure, user, pass);

	const transporter = nodemailer.createTransport({
		host: host,
		port: port,
		secure: secure,
		auth: {
			user: user,
			pass: pass,
		},
	});

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
			from: `"${name}" <${user}>`,
			to: user,
			replyTo: email,
			subject: adminSubject,
			html: adminTemplate,
		});

		// Send auto-reply to user
		await transporter.sendMail({
			from: `"${adminName}" <${user}>`,
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`✅ Server started on http://localhost:${PORT}`);
});
