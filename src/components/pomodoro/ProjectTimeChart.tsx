
"use client";

import type { ChartDataPoint } from '@/types/pomodoro';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CardDescription } from '@/components/ui/card';

interface ProjectTimeChartProps {
  data: ChartDataPoint[];
}

const formatMinutesToWholeHours = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}h`;
};

const chartConfig = {
  totalMinutes: {
    label: "Time (hours)",
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
          margin={{ top: 5, right: 5, left: -10, bottom: 20 }} 
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={70} 
            tickFormatter={(value) => formatMinutesToWholeHours(value)}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <ChartTooltip
            cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
            content={
              <ChartTooltipContent
                indicator="dot"
                hideLabel
                formatter={(value, name, item) => {
                  if (item.dataKey === 'totalMinutes') {
                    return (
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{formatMinutesToWholeHours(value as number)}</span>
                        <span className="text-xs text-muted-foreground">{item.payload.name}</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            }
          />
          <Bar dataKey="totalMinutes" fill="var(--color-totalMinutes)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

