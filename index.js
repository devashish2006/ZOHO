import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY not found in environment variables");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.post("/webhook", async (req, res) => {
  try {
    console.log("=== FULL WEBHOOK PAYLOAD ===");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("===========================");

    // Extract user message from SalesIQ webhook payload
    let userMessage = "Hello";
    
    // SalesIQ sends the message in different formats
    if (req.body?.question) {
      userMessage = req.body.question;
    } else if (req.body?.message) {
      userMessage = req.body.message;
    } else if (req.body?.text) {
      userMessage = req.body.text;
    } else if (req.body?.visitor?.question) {
      userMessage = req.body.visitor.question;
    }

    console.log("Extracted Message:", userMessage);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest"
    });

    const result = await model.generateContent(userMessage);
    const aiResponse = result.response.text();

    console.log("AI Response:", aiResponse);

    // SalesIQ Zobot response format
    const response = {
      action: "reply",
      replies: [aiResponse]
    };

    console.log("Sending Response:", JSON.stringify(response, null, 2));
    
    return res.status(200).json(response);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err.message);
    console.error("Stack:", err.stack);

    return res.status(200).json({
      action: "reply",
      replies: ["I'm having trouble processing that. Please try again."]
    });
  }
});

// Test endpoint to verify Gemini API
app.get("/test-gemini", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest" 
    });
    const result = await model.generateContent("Say hello in a friendly way");
    res.json({
      success: true,
      response: result.response.text()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Test webhook format
app.post("/test-webhook", (req, res) => {
  console.log("Test webhook received:", JSON.stringify(req.body, null, 2));
  res.json({
    received: req.body,
    action: "reply",
    replies: ["Test successful!"]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test-gemini`);
});