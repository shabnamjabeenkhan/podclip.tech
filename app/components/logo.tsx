import { cn } from "../lib/utils";

export const Logo = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div className={cn("text-foreground font-bold text-xl", className)}>
      PodClip
    </div>
  );
};

export const LogoIcon = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div className={cn("w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl", className)}>
      PC
    </div>
  );
};

export const LogoStroke = ({ className }: { className?: string }) => {
  return (
    <div className={cn("size-7 w-7 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs", className)}>
      PC
    </div>
  );
};
