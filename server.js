const express = require("express");

const app = express();

app.use(express.json({ limit: "1mb" }));

// ULTRON V2 HOME
app.get("/", (req, res) => {
  res.send("ULTRON V2 Server Online");
});

// Wait helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ask Gemini, retrying temporary errors
async function askGemini(model, question, apiKey) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text:
                  "You are ULTRON, a helpful AI assistant. " +
                  "Answer clearly and naturally. " +
                  "Reply in the language the user uses, " +
                  "including Tamil or English."
              }]
            },
            contents: [{
              parts: [{
                text: question
              }]
            }]
          }),
          signal: AbortSignal.timeout(20000)
        }
      );

      const data = await response.json();

      if (response.ok) {
        const answer = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

        if (answer) {
          return answer;
        }

        throw new Error("Gemini returned an empty answer.");
      }

      console.error(
        `Gemini ${model} error:`,
        response.status,
        data.error?.message || "Unknown API error"
      );

      // Retry temporary errors only.
      if (
        ![408, 429, 500, 502, 503, 504].includes(response.status)
      ) {
        const error = new Error(
          data.error?.message || "Gemini API request failed."
        );

        error.status = response.status;
        throw error;
      }

      if (attempt === maxAttempts) {
        const error = new Error(
          data.error?.message || "Gemini is temporarily unavailable."
        );

        error.status = response.status;
        throw error;
      }

    } catch (error) {
      if (error.status) {
        throw error;
      }

      console.error(
        `Attempt ${attempt} for ${model} failed:`,
        error.message
      );

      if (attempt === maxAttempts) {
        throw error;
      }
    }

    await sleep(1000 * attempt);
  }

  throw new Error("Gemini request failed.");
}

// ULTRON AI ENDPOINT
app.post("/ask", async (req, res) => {
  try {
    const question = req.body?.question;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        answer: "ULTRON: Please ask me a question."
      });
    }

    if (question.length > 10000) {
      return res.status(400).json({
        answer: "ULTRON: Your question is too long."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");

      return res.status(500).json({
        answer: "ULTRON: AI configuration is missing."
      });
    }

    // Primary and backup models
    const models = [
      "gemini-3.8-flash",
      "gemini-3.6-flash"
    ];

    let lastError;

    for (const model of models) {
      try {
        console.log(`ULTRON is contacting ${model}...`);

        const answer = await askGemini(
          model,
          question.trim(),
          apiKey
        );

        console.log(`ULTRON received a response from ${model}.`);

        return res.json({
          answer: answer
        });

      } catch (error) {
        lastError = error;

        console.error(
          `${model} failed:`,
          error.message
        );

        // Try another model if the current model is unavailable.
        if (
          error.status &&
          ![408, 429, 500, 502, 503, 504].includes(error.status)
        ) {
          break;
        }
      }
    }

    console.error(
      "All ULTRON AI models failed:",
      lastError?.message
    );

    return res.status(503).json({
      answer:
        "ULTRON: My AI service is temporarily unavailable. Please try again shortly."
    });

  } catch (error) {
    console.error("ULTRON server error:", error.message);

    return res.status(500).json({
      answer: "ULTRON: An unexpected server error occurred."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ULTRON server listening on port ${PORT}`);
});
