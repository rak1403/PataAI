process.loadEnvFile();

const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const { SarvamAIClient } = require("sarvamai");

if (!process.env.SARVAM_API_KEY) {
  console.error("Error: SARVAM_API_KEY is missing in your .env file.");
  process.exit(1);
}

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

const MODEL = "sarvam-105b-conversations";

// ANSI colors for clean terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
};

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log(`${colors.bold}${colors.cyan}================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   Sarvam AI Interactive CLI Chat (${MODEL})   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================${colors.reset}`);
  console.log(`${colors.gray}Commands: type ${colors.yellow}/reset${colors.gray} to clear context, ${colors.yellow}exit${colors.gray} or ${colors.yellow}/quit${colors.gray} to leave.\n${colors.reset}`);

  const messages = [
    {
      role: "system",
      content: "You are a helpful, respectful, and culturally nuanced AI assistant created by Sarvam AI. You are fluent in English and Indian languages (Hindi, Tamil, Telugu, Kannada, Bengali, Gujarati, Marathi, Malayalam, Punjabi, Odia, etc.), including colloquial and code-mixed expressions (like Hinglish, Tanglish).",
    },
  ];

  try {
    while (true) {
      const userInput = await rl.question(`${colors.bold}${colors.green}You > ${colors.reset}`);
      const trimmed = userInput.trim();

      if (!trimmed) continue;

      if (["exit", "quit", "/exit", "/quit"].includes(trimmed.toLowerCase())) {
        console.log(`\n${colors.cyan}Goodbye! 👋${colors.reset}\n`);
        break;
      }

      if (trimmed.toLowerCase() === "/reset") {
        messages.length = 1; // keep system prompt
        console.log(`\n${colors.yellow}Conversation history reset.${colors.reset}\n`);
        continue;
      }

      messages.push({ role: "user", content: trimmed });

      process.stdout.write(`\n${colors.bold}${colors.cyan}Sarvam > ${colors.reset}`);

      let assistantReply = "";

      try {
        const stream = await client.chat.completions({
          model: MODEL,
          messages,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          assistantReply += delta;
          process.stdout.write(delta);
        }

        process.stdout.write("\n\n");
        messages.push({ role: "assistant", content: assistantReply });
      } catch (err) {
        process.stdout.write("\n");
        console.error(`${colors.red}Error calling Sarvam API: ${err.message || err}${colors.reset}\n`);
        // Remove the unanswered user message so conversation state stays consistent
        messages.pop();
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
