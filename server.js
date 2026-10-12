const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ULTRON V2 Server Online");
});

app.post("/ask", async (req, res) => {
  try {
    const question = req.body.question;

    if (!question) {
      return res.status(400).json({
        answer: "ULTRON: Please ask me a question."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        answer: "ULTRON: AI API key is not configured on the server."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are ULTRON, a helpful AI assistant. Answer clearly and naturally. Reply in the language the user uses, including Tamil or English."
            }]
          },
          contents: [{
            parts: [{ text: question }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      return res.status(502).json({
        answer: "ULTRON: The AI service is temporarily unavailable. Please try again."
      });
    }

    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    res.json({
      answer: answer || "ULTRON: I couldn't generate a reply."
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      answer: "ULTRON: A server error occurred."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ULTRON server listening on port ${PORT}`);
});
