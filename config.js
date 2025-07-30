import dotenv from "dotenv";

dotenv.config();

const emailServices = {
	erperol: {
		host: process.env.EMAIL_ERPEROL_HOST,
		port: Number.parseInt(process.env.EMAIL_ERPEROL_PORT),
		secure: process.env.EMAIL_ERPEROL_SSL === "true",
		auth: {
			user: process.env.EMAIL_ERPEROL_USER,
			pass: process.env.EMAIL_ERPEROL_PASS,
		},
		// fromName: "ERPerol Team",
		// adminSubject: "📩 New message from ERPerol Contact Form",
		// userSubject: "🙏 Thanks for contacting ERPerol",
	},
	gmail: {
		host: process.env.EMAIL_GMAIL_HOST,
		port: Number.parseInt(process.env.EMAIL_GMAIL_PORT),
		secure: process.env.EMAIL_GMAIL_SSL === "true",
		auth: {
			user: process.env.EMAIL_GMAIL_USER,
			pass: process.env.EMAIL_GMAIL_PASS,
		},
		// fromName: "Gmail Support",
		// adminSubject: "📬 Message via Gmail Contact",
		// userSubject: "🙌 We've received your message!",
	},
};

export default emailServices;
