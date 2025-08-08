
import { ai } from '../../genkit';
import { z } from 'genkit';

const MotivationalQuoteOutputSchema = z.object({
  quote: z.string().describe('A short, real, attributable motivational quote related to productivity, focus, or well-being. Max 150 characters.'),
  source: z.string().describe('The person or source of the quote (e.g., "Albert Einstein", "Japanese Proverb").'),
});
export type MotivationalQuoteOutput = z.infer<typeof MotivationalQuoteOutputSchema>;

export async function getMotivationalQuote(): Promise<MotivationalQuoteOutput> {
  return motivationalQuoteFlow();
}

const quotePrompt = ai.definePrompt({
  name: 'motivationalQuotePrompt',
  output: { schema: MotivationalQuoteOutputSchema },
  prompt: `You are a helpful assistant that provides real, attributable, short, uplifting motivational quotes.
Generate a concise quote suitable for someone taking a short break while working or studying.
The quote should inspire focus, perseverance, or a sense of accomplishment.
Ensure the quote is from a real person or a known source, and provide the source in the 'source' field.
Keep the quote itself under 150 characters.
Provide a new and different quote each time.`,
});

const motivationalQuoteFlow = ai.defineFlow(
  {
    name: 'motivationalQuoteFlow',
    outputSchema: MotivationalQuoteOutputSchema,
  },
  async () => {
    const { output } = await quotePrompt();
    return output!;
  }
);
