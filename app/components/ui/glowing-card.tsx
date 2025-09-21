import { cn } from "~/lib/utils";

interface GlowingCardProps {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
}

export const GlowingCard = ({ title, value, subtitle, className }: GlowingCardProps) => {
  return (
    <div className={cn("outer", className)}>
      <div className="card">
        <div className="ray"></div>
        <div className="text">{value}</div>
        <div>{title}</div>
        {subtitle && <div className="subtitle">{subtitle}</div>}
        <div className="line topl"></div>
        <div className="line leftl"></div>
        <div className="line bottoml"></div>
        <div className="line rightl"></div>
      </div>
    </div>
  );
};
