import dotenv from 'dotenv';
import { createGateway } from '@ai-sdk/gateway';
import { streamText } from 'ai';

// Load .env.local file
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error('Error: AI_GATEWAY_API_KEY is not defined in .env.local');
    console.error('Please run the setup command to save your key.');
    process.exit(1);
  }

  console.log('Initializing Vercel AI Gateway...');
  const gateway = createGateway({
    apiKey: apiKey,
  });

  console.log("Streaming response from model 'openai/gpt-5.4'...\n");

  const result = streamText({
    model: gateway('openai/gpt-5.4'),
    prompt: 'Write a short story (2-3 paragraphs) about a small café owner named Alice who discovers a magical recipe book that helps her kitchen run flawlessly.',
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log('\n\n----------------------------------------');
  console.log('--- Stream Completed Successfully ---');
  console.log('----------------------------------------');
  
  const usage = await result.usage;
  console.log('Token Usage Metrics:');
  console.log(`- Prompt Tokens: ${usage.promptTokens}`);
  console.log(`- Completion Tokens: ${usage.completionTokens}`);
  console.log(`- Total Tokens: ${usage.totalTokens}`);
}

main().catch((err) => {
  console.error('\nExecution failed:', err);
  process.exit(1);
});
