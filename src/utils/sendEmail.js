const nodemailer = require("nodemailer");
const path = require("path");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const sendEmail = async ({ to, subject, htmlContent }) => {

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are missing inside sendEmail module");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
  });

  await transporter.sendMail({
    from: `"Darul Islam Institute" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlContent,
  });
};

module.exports = sendEmail;