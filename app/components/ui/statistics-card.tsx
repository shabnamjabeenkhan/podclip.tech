import { Badge } from '~/components/ui/badge-2';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

interface StatisticsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  additionalInfo?: Array<{
    label: string;
    value: string;
  }>;
}

export function StatisticsCard({ title, value, subtitle, icon, additionalInfo }: StatisticsCardProps) {
  return (
    <Card className="w-full h-[160px] overflow-hidden bg-[#1a1f23] border-gray-700">
      <CardHeader className="border-0 py-3 min-h-auto">
        <CardTitle className="inline-flex items-center gap-2 text-sm text-white">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-center px-6 pb-6 pt-1 h-[calc(100%-60px)]">
        {/* Main Value */}
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        </div>

        {/* Subtitle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{subtitle}</span>
        </div>

        {/* Additional Info */}
        {additionalInfo && additionalInfo.length > 0 && (
          <div className="space-y-1 mt-4">
            {additionalInfo.map((info, index) => (
              <div key={index} className="p-2 bg-gray-800/60 flex items-center justify-between rounded-lg">
                <span className="text-xs text-gray-300">{info.label}:</span>
                <span className="text-sm font-semibold text-white">{info.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}