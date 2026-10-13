const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "otp.hloxpat@gmail.com",  // Your Gmail address
    pass: "cphy iaqw obzh dysx", // Your App Password (DO NOT share it publicly)
  },
});
// heqc befg avfm tzco

const sendEmail = async (email, subject, otp) => {
  console.log(otp)
  const mailOptions = {
    from: "Mail From Hloxpat",
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #002b6a;">Your OTP Code</h2>
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="color: #28a745; text-align: center; font-size: 32px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes. Please do not share it with anyone.</p>
        <br>
        <p>Best Regards,<br>Your Service Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return true; // Return true if email is sent
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Return false if email fails
  }
};

module.exports = sendEmail;