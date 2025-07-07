
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
  tasks: z.array(z.string()).describe('A list of tasks completed during the session.'),
  description: z.string().optional().describe('A user-provided description of what they accomplished.'),
});
export type SessionSummaryInput = z.infer<typeof SessionSummaryInputSchema>;

export const SessionSummaryOutputSchema = z.object({
  projectName: z.string().describe('A concise and descriptive project or task name, no more than 5 words long, derived from the user\'s completed tasks and description.'),
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
Based on the user's completed tasks and an optional description of their work, create a concise and descriptive project or task name.
The name should be no more than 5 words long.

Example 1:
Tasks: ["Draft Q3 report", "Create slides for board meeting"]
Description: "Worked on the quarterly financial statements and started the presentation."
Your output: "Quarterly Financials & Slides"

Example 2:
Tasks: ["Fix login bug"]
Description: "fixed that weird login bug that was reported by the QA team yesterday"
Your output: "Fix Login Bug (QA)"

Example 3:
Tasks: ["Answer support emails", "Clear backlog"]
Your output: "Email Triage"

Now, summarize the following session:

{{#if tasks}}
Completed Tasks:
{{#each tasks}}
- {{{this}}}
{{/each}}
{{/if}}

{{#if description}}
Additional Description:
"{{{description}}}"
{{/if}}
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
