"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { TrendingUp, TrendingDown, Database, Zap } from "lucide-react";

export function CacheMetrics() {
  const cacheMetrics = useQuery(api.cache.getCacheMetrics, { days: 7 });

  if (!cacheMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
          <CardDescription>Loading cache metrics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalRequests = cacheMetrics.summary.reduce((acc, metric) => acc + metric.totalRequests, 0);
  const totalHits = cacheMetrics.summary.reduce((acc, metric) => acc + metric.hits, 0);
  const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 80) return "text-green-600 bg-green-100";
    if (hitRate >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const formatCacheType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Performance Overview
          </CardTitle>
          <CardDescription>
            Cache statistics for the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{overallHitRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Overall Hit Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalHits.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Cache Hits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </div>

          {overallHitRate > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Performance</span>
                <span className="text-sm text-muted-foreground">{overallHitRate.toFixed(1)}%</span>
              </div>
              <Progress value={overallHitRate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cacheMetrics.summary.map((metric) => (
          <Card key={metric.cacheType}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {formatCacheType(metric.cacheType)}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={getHitRateColor(metric.hitRate * 100)}
                >
                  {(metric.hitRate * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hits</span>
                  <span className="font-medium text-green-600">
                    {metric.hits.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Misses</span>
                  <span className="font-medium text-red-600">
                    {metric.misses.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Writes</span>
                  <span className="font-medium text-blue-600">
                    {metric.writes.toLocaleString()}
                  </span>
                </div>
                
                {metric.hitRate > 0 && (
                  <div className="pt-2">
                    <Progress value={metric.hitRate * 100} className="h-1" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}