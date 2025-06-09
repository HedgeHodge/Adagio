import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn(
    'GOOGLE_API_KEY not found in environment variables. Genkit might not work as expected.'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey})],
  model: 'googleai/gemini-2.0-flash',
});
