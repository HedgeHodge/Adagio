
"use client";

import type { ChartDataPoint } from '@/types/pomodoro';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CardDescription } from '@/components/ui/card';

interface ProjectTimeChartProps {
  data: ChartDataPoint[];
}

const chartConfig = {
  totalMinutes: {
    label: "Time (minutes)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export function ProjectTimeChart({ data }: ProjectTimeChartProps) {
  if (data.length === 0) {
    return (
      <CardDescription className="text-center py-8 text-muted-foreground">
        No time tracked for this period.
      </CardDescription>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart 
          accessibilityLayer 
          data={data} 
          margin={{ top: 5, right: 5, left: -20, bottom: 5 }} // Adjusted left margin for YAxis labels
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0} // Show all labels
            // Angled labels if too many projects, or other strategy
            // angle={-30}
            // textAnchor="end" 
            // height={50} // Adjust height for angled labels
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={80} // Give space for Y-axis label
            tickFormatter={(value) => `${value}m`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <ChartTooltip
            cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
            content={<ChartTooltipContent indicator="dot" hideLabel />}
          />
          <Bar dataKey="totalMinutes" fill="var(--color-totalMinutes)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
