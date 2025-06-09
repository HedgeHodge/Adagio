import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: "AIzaSyCFv_htOY59P8puWNrQnIJnkhXTaf2sVbk"})],
  model: 'googleai/gemini-2.0-flash',
});
