import React from "react";

export default function ClerkLogo(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img src="/clerk.png" alt="Clerk logo" className="h-8 !w-auto" {...props} />
  );
} 