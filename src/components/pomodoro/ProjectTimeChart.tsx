
"use client";

import * as React from 'react';
import type { ChartDataPoint } from '@/types/pomodoro';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CardDescription } from '@/components/ui/card';

interface ProjectTimeChartProps {
  data: ChartDataPoint[];
  onBarClick: (projectName: string) => void;
  isModalOpen?: boolean;
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


export const ProjectTimeChart = React.memo(function ProjectTimeChart({ data, onBarClick, isModalOpen }: ProjectTimeChartProps) {
  if (data.length === 0) {
    return (
      <CardDescription className="text-center py-8 text-muted-foreground">
        No time tracked for this period.
      </CardDescription>
    );
  }

  // Calculate y-axis ticks and domain
  const maxTotalMinutes = data.length > 0 ? Math.max(0, ...data.map(d => d.totalMinutes)) : 0;
  let yAxisTicks: number[];
  let yAxisDomain: [number, number];

  if (maxTotalMinutes > 0) {
    const maxHours = Math.ceil(maxTotalMinutes / 60);
    // Ensure at least one hour tick if maxTotalMinutes is small but > 0
    const numberOfTicks = Math.max(1, maxHours) + 1; // +1 for the 0h tick
    yAxisTicks = Array.from({ length: numberOfTicks }, (_, i) => i * 60);
    
    // Ensure domain covers the highest tick or actual dataMax, plus some padding
    const domainUpperValue = Math.max(yAxisTicks[yAxisTicks.length - 1], maxTotalMinutes);
    yAxisDomain = [0, domainUpperValue + 30]; // Add 30 minutes padding
  } else {
    // Default for no data or all zero values
    yAxisTicks = [0, 60]; // Ticks for 0h and 1h
    yAxisDomain = [0, 60]; // Domain up to 1h
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
            ticks={yAxisTicks}
            domain={yAxisDomain}
            interval={0} // Make sure all our specified ticks are considered
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
                hideLabel
                formatter={(value, name, item) => {
                  if (item.dataKey === 'totalMinutes') {
                    const hours = Math.floor((value as number) / 60);
                    const minutes = (value as number) % 60;
                    let formattedTime = "";
                    if (hours > 0) formattedTime += `${hours}h `;
                    if (minutes > 0 || hours === 0) formattedTime += `${minutes}m`;
                    if (formattedTime.trim() === "") formattedTime = "0m";


                    return (
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{formattedTime.trim()}</span>
                        <span className="text-xs text-muted-foreground">{item.payload.name}</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            }
          />
          <Bar
            dataKey="totalMinutes"
            fill="var(--color-totalMinutes)"
            radius={[4, 4, 0, 0]}
            barSize={30}
            cursor="pointer"
            activeBar={false}
            onClick={(data) => {
              if (data && data.name) {
                onBarClick(data.name);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

ProjectTimeChart.displayName = 'ProjectTimeChart';
