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
    console.log("Received message:", req.body);

    const userMessage = req.body?.message 
                     || req.body?.text 
                     || "Hello";

    // Try with gemini-pro first (older stable model)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-001"  // Try with -latest suffix
    });

    const result = await model.generateContent(userMessage);
    const aiResponse = result.response.text();

    return res.json({
      type: "reply",
      text: aiResponse
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({
      type: "reply",
      text: "Server error, please try again.",
      error: error.message
    });
  }
});

// Add this to check available models
app.get("/check-models", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Say hello");
    res.json({ 
      success: true, 
      message: "Model works!",
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
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});