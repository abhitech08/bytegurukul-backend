const nodemailer = require('nodemailer');

let transporter = null;

// Initialize transporter
const initializeTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return transporter;
};

const sendEmail = async (options) => {
  try {
    const transport = initializeTransporter();

    const mailOptions = {
      from: '"ByteGurukul Support" <noreply@bytegurukul.com>',
      to: options.email,
      subject: options.subject,
      html: options.message
    };

    // Add attachments if provided
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    await transport.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error('Email sending error:', error.message);
    throw error;
  }
};

// Template for enrollment confirmation
const enrollmentEmail = (userName, courseName, courseId) => ({
  subject: `Welcome to ${courseName}!`,
  message: `
    <h2>Welcome, ${userName}!</h2>
    <p>You have successfully enrolled in the course <strong>${courseName}</strong>.</p>
    <p>Start learning today and unlock your potential!</p>
    <a href="${process.env.FRONTEND_URL}/learning/${courseId}" style="background-color: #4CAF50; padding: 10px 20px; color: white; text-decoration: none; border-radius: 5px;">
      Start Learning
    </a>
    <br><br>
    <p>If you have any questions, feel free to contact our support team.</p>
    <p>Happy learning!</p>
  `
});

// Template for certificate issuance
const certificateEmail = (userName, courseName, certificateNumber) => ({
  subject: `Certificate of Completion - ${courseName}`,
  message: `
    <h2>Congratulations, ${userName}!</h2>
    <p>You have successfully completed the course <strong>${courseName}</strong>.</p>
    <p><strong>Certificate Number:</strong> ${certificateNumber}</p>
    <p>Your certificate is ready for download. Visit your dashboard to view and download it.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/certificates" style="background-color: #4CAF50; padding: 10px 20px; color: white; text-decoration: none; border-radius: 5px;">
      View Certificate
    </a>
    <br><br>
    <p>Share your achievement with the world!</p>
  `
});

// Template for new comment notification
const commentNotificationEmail = (userName, courseName, commentAuthor) => ({
  subject: `New Comment on ${courseName}`,
  message: `
    <h2>Hi ${userName},</h2>
    <p><strong>${commentAuthor}</strong> has commented on a lecture in <strong>${courseName}</strong>.</p>
    <a href="${process.env.FRONTEND_URL}/learning" style="background-color: #4CAF50; padding: 10px 20px; color: white; text-decoration: none; border-radius: 5px;">
      View Comments
    </a>
    <br><br>
    <p>Stay engaged with your course community!</p>
  `
});

// Template for task submission
const taskSubmissionEmail = (userName, taskTitle) => ({
  subject: `Task Submission Confirmation - ${taskTitle}`,
  message: `
    <h2>Submission Confirmed</h2>
    <p>Dear ${userName},</p>
    <p>Your submission for <strong>${taskTitle}</strong> has been received successfully.</p>
    <p>Your instructor will review and provide feedback shortly.</p>
    <br><br>
    <p>Keep up the great work!</p>
  `
});

// Template for task graded
const taskGradedEmail = (userName, taskTitle, grade, maxGrade, feedback) => ({
  subject: `Task Graded - ${taskTitle}`,
  message: `
    <h2>Your Task Has Been Graded</h2>
    <p>Dear ${userName},</p>
    <p>Your submission for <strong>${taskTitle}</strong> has been graded.</p>
    <p><strong>Score:</strong> ${grade}/${maxGrade}</p>
    ${feedback ? `<p><strong>Instructor Feedback:</strong></p><p>${feedback}</p>` : ''}
    <br><br>
    <p>Keep learning!</p>
  `
});

// Template for internship offer letter
const internshipOfferEmail = (userName, role) => ({
  subject: `Internship Offer Letter - ${role}`,
  message: `
    <h2>Congratulations, ${userName}!</h2>
    <p>You have been selected for the <strong>${role}</strong> internship position at ByteGurukul.</p>
    <p>Please find attached your official Internship Offer Letter.</p>
    <p>Kindly review the terms and conditions and confirm your acceptance.</p>
    <br><br>
    <p>Welcome to the team!</p>
    <p>ByteGurukul Team</p>
  `
});

// Template for internship certificate
const internshipCertificateEmail = (userName) => ({
  subject: `Internship Completion Certificate`,
  message: `
    <h2>Congratulations, ${userName}!</h2>
    <p>You have successfully completed your internship at ByteGurukul.</p>
    <p>Please find attached your Internship Completion Certificate.</p>
    <p>This certificate recognizes your dedication and hard work during the internship period.</p>
    <br><br>
    <p>Best wishes for your future endeavors!</p>
    <p>ByteGurukul Team</p>
  `
});

module.exports = {
  sendEmail,
  enrollmentEmail,
  certificateEmail,
  commentNotificationEmail,
  taskSubmissionEmail,
  taskGradedEmail,
  internshipOfferEmail,
  internshipCertificateEmail
};
