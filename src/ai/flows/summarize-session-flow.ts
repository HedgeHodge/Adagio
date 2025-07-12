
'use server';
/**
 * @fileOverview A Genkit flow to summarize a user's work session.
 *
 * - summarizeSession - A function that takes a user's completed tasks and returns a concise summary.
 * - SessionSummaryInput - The input type for the summarizeSession function.
 * - SessionSummaryOutput - The return type for the summarizeSession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SessionSummaryInputSchema = z.object({
  tasks: z.array(z.string()).describe('A list of tasks completed during the session.'),
  projectName: z.string().describe('The name of the project the user was working on.'),
});
export type SessionSummaryInput = z.infer<typeof SessionSummaryInputSchema>;

const SessionSummaryOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the work done, based on the completed tasks. Maximum 15 words."),
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
Based on the project name and the user's completed tasks, create a concise summary of the work done.
The summary should be no more than 15 words long. It should describe what was accomplished.

Example 1:
Project: "Quarterly Financials & Slides"
Tasks: ["Draft Q3 report", "Create slides for board meeting"]
Your output: "Drafted the Q3 report and created slides for the board meeting."

Example 2:
Project: "Fix Login Bug"
Tasks: ["Fix login bug"]
Your output: "Fixed the critical login bug."

Example 3:
Project: "Email Triage"
Tasks: ["Answer support emails", "Clear backlog"]
Your output: "Cleared the support email backlog."

Now, summarize the following session based on the project and completed tasks:

Project: {{{projectName}}}
{{#if tasks}}
Completed Tasks:
{{#each tasks}}
- {{{this}}}
{{/each}}
{{else}}
No tasks were provided. Simply state that the user worked on the project.
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
