
'use server';
/**
 * @fileOverview A Genkit flow to generate motivational quotes.
 *
 * - getMotivationalQuote - A function that returns a motivational quote.
 * - MotivationalQuoteOutput - The return type for the getMotivationalQuote function.
 */

import {ai} from '@/ai/genkit';
import {z}  from 'genkit';

const MotivationalQuoteOutputSchema = z.object({
  quote: z.string().describe('A short, motivational quote related to productivity, focus, or well-being.'),
});
export type MotivationalQuoteOutput = z.infer<typeof MotivationalQuoteOutputSchema>;

export async function getMotivationalQuote(): Promise<MotivationalQuoteOutput> {
  return motivationalQuoteFlow();
}

const quotePrompt = ai.definePrompt({
  name: 'motivationalQuotePrompt',
  output: {schema: MotivationalQuoteOutputSchema},
  prompt: `You are a helpful assistant that provides short, uplifting motivational quotes.
Generate a concise quote suitable for someone taking a short break while working or studying.
The quote should inspire focus, perseverance, or a sense of accomplishment.
Keep it under 150 characters.`,
});

const motivationalQuoteFlow = ai.defineFlow(
  {
    name: 'motivationalQuoteFlow',
    outputSchema: MotivationalQuoteOutputSchema,
  },
  async () => {
    const {output} = await quotePrompt();
    return output!;
  }
);
