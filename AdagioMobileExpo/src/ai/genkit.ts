
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GOOGLE_API_KEY } from '@env';

if (!GOOGLE_API_KEY) {
  console.warn(
    'GOOGLE_API_KEY not found in environment variables. Genkit might not work as expected.'
  );
}

export const ai = genkit({
  plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
  model: 'googleai/gemini-pro',
});
