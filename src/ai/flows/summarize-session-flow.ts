
'use server';
/**
 * @fileOverview A Genkit flow to summarize a user's work session.
 *
 * - summarizeSession - A function that takes a user's description and returns a concise project name.
 * - SessionSummaryInput - The input type for the summarizeSession function.
 * - SessionSummaryOutput - The return type for the summarizeSession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SessionSummaryInputSchema = z.object({
  description: z.string().describe('A user-provided description of the work they accomplished during a session.'),
});
export type SessionSummaryInput = z.infer<typeof SessionSummaryInputSchema>;

export const SessionSummaryOutputSchema = z.object({
  projectName: z.string().describe('A concise and descriptive project or task name, no more than 5 words long, derived from the user\'s description.'),
});
export type SessionSummaryOutput = z.infer<typeof SessionSummaryOutputSchema>;

export async function summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
  return summarizeSessionFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'summarizeSessionPrompt',
  input: {schema: SessionSummaryInputSchema},
  output: {schema: SessionSummaryOutputSchema},
  prompt: `You are a productivity assistant. Your goal is to help users log their work efficiently.
Based on the user's description of their work, create a concise and descriptive project or task name.
The name should be no more than 5 words long.

Example 1:
User description: "I was working on the quarterly financial statements for the finance department and also started preparing the slides for the upcoming board meeting."
Your output: "Quarterly Financials & Slides"

Example 2:
User description: "fixed that weird login bug that was reported by the QA team yesterday"
Your output: "Fix Login Bug (QA)"

Example 3:
User description: "answered a bunch of emails and cleared my inbox"
Your output: "Email Triage"

User's description to summarize:
"{{{description}}}"
`,
});

const summarizeSessionFlow = ai.defineFlow(
  {
    name: 'summarizeSessionFlow',
    inputSchema: SessionSummaryInputSchema,
    outputSchema: SessionSummaryOutputSchema,
  },
  async input => {
    const {output} = await summaryPrompt(input);
    return output!;
  }
);
