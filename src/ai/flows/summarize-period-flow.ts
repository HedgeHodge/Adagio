
'use server';
/**
 * @fileOverview A Genkit flow to summarize a user's work over a period.
 *
 * - summarizePeriod - A function that takes a user's logged entries and returns a summary.
 * - PeriodSummaryInput - The input type for the summarizePeriod function.
 * - PeriodSummaryOutput - The return type for the summarizePeriod function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { LogEntry as PomodoroLogEntry } from '@/types/pomodoro';


const PeriodSummaryInputSchema = z.object({
  entries: z.array(z.object({
      project: z.string().optional(),
      summary: z.string().optional(),
      duration: z.number(),
  })).describe('A list of logged work entries for the period.'),
});
export type PeriodSummaryInput = z.infer<typeof PeriodSummaryInputSchema>;


const PeriodSummaryOutputSchema = z.object({
  periodSummary: z.string().describe("A concise but comprehensive summary of the work done during the period, written in first-person prose. Group work by project. Maximum 150 words."),
});
export type PeriodSummaryOutput = z.infer<typeof PeriodSummaryOutputSchema>;

export async function summarizePeriod(input: PeriodSummaryInput): Promise<PeriodSummaryOutput> {
  return summarizePeriodFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'summarizePeriodPrompt',
  input: {schema: PeriodSummaryInputSchema},
  output: {schema: PeriodSummaryOutputSchema},
  prompt: `You are a productivity assistant. Your goal is to help users summarize their work over a period.
Based on the provided log entries, create a concise but comprehensive summary of the work done.
The summary should be written in first-person prose (e.g., "I worked on...") and be no more than 150 words.
Group the accomplishments by project. If an entry has a specific summary, prefer that. If not, use the project name and duration.

Example:
Entries: [
  { project: "Quarterly Report", duration: 50, summary: "Drafted the Q3 report and created slides for the board meeting." },
  { project: "Website Redesign", duration: 120 },
  { project: "Quarterly Report", duration: 25, summary: "Finalized visuals for the report." }
]
Your output: "This period, I made significant progress on the Quarterly Report, where I drafted the Q3 report, created slides for the board meeting, and finalized the visuals. I also dedicated a substantial amount of time to the Website Redesign."

Now, summarize the following work period based on the provided entries:

{{#each entries}}
- Project: {{{project}}}. Duration: {{{duration}}} minutes. {{#if summary}}Summary: {{{summary}}}{{/if}}
{{/each}}
`,
});

const summarizePeriodFlow = ai.defineFlow(
  {
    name: 'summarizePeriodFlow',
    inputSchema: PeriodSummaryInputSchema,
    outputSchema: PeriodSummaryOutputSchema,
  },
  async input => {
    const {output} = await summaryPrompt(input);
    return output!;
  }
);
