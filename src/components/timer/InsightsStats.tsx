
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, Repeat, Hourglass } from "lucide-react";
import type { InsightsStatsData } from "@/hooks/useTimer";

interface InsightsStatsProps {
  stats: InsightsStatsData;
}

const formatDuration = (totalMinutes: number) => {
  if (totalMinutes < 60) {
    return { value: totalMinutes, unit: "min" };
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return { value: hours, unit: "hr" };
  }
  return { value: (totalMinutes / 60).toFixed(1), unit: "hrs" };
};

export function InsightsStats({ stats }: InsightsStatsProps) {
  const { totalMinutes, totalSessions, averageSessionMinutes } = stats;

  const formattedTotalTime = formatDuration(totalMinutes);
  const formattedAverageTime = formatDuration(averageSessionMinutes);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-background/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Focus Time</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formattedTotalTime.value}
            <span className="text-xs text-muted-foreground ml-1">{formattedTotalTime.unit}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-background/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Repeat className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions}</div>
        </CardContent>
      </Card>
      <Card className="bg-background/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Session</CardTitle>
          <Hourglass className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">
            {formattedAverageTime.value}
            <span className="text-xs text-muted-foreground ml-1">{formattedAverageTime.unit}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
