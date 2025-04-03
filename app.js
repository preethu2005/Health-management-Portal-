const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const User = require("./models/user");
const connectDB = require("./config/db");

const app = express();
const PORT = 3000;

// Connect to the database
connectDB();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secureSecretKey",
    resave: false,
    saveUninitialized: true,
  })
);

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Email and SMS Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "justforpics53@gmail.com", // Replace with your email
    pass: "Pree@2005", // Replace with your email password or app-specific password
  },
});

const twilioClient = twilio("AC591c5f6c6fd816d3db228cfddbcfbe5c", "8d42f4f17c261cd3c0c4e185de837e25"); // Replace with your Twilio credentials

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, username, password, email, dob, contact } = req.body;

  if (!name || !username || !password || !email || !dob || !contact) {
    return res.status(400).send("All fields are required.");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      username,
      password: hashedPassword,
      email,
      dob: new Date(dob),
      contact,
    });

    await user.save();
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating user.");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid username or password.");

    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in.");
  }
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).send("User not found.");

    res.render("dashboard", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching dashboard.");
  }
});

app.get("/profile", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).send("User not found.");

    res.render("profile", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching profile.");
  }
});

app.get("/upload", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.render("upload");
});

app.post("/upload", upload.single("report"), async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).send("User not found.");

    user.reports.push(req.file.filename);
    await user.save();

    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading file.");
  }
});

// Reminder Routes
app.get("/reminder", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.render("reminder");
});

app.post("/reminder", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  const { emailReminder, smsReminder, date, time } = req.body;

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).send("User not found.");

    // Schedule Email Reminder
    if (emailReminder) {
      const mailOptions = {
        from: "justforpics53@gmail.com",
        to: user.email,
        subject: "Health Reminder",
        text: `This is a reminder for your scheduled activity on ${date} at ${time}.`,
      };
      await transporter.sendMail(mailOptions);
    }

    // Schedule SMS Reminder
    if (smsReminder) {
      await twilioClient.messages.create({
        body: `Reminder: Activity scheduled on ${date} at ${time}.`,
        from: "+18622454483", // Replace with your Twilio phone number
        to: user.contact,
      });
    }

    res.send("Reminders set successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error setting reminders.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
