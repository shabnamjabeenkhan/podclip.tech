import { useState, useRef } from 'react';
import { Card } from '~/components/ui/card';
import { Play } from 'lucide-react';

interface CursorfulVideoProps {
  title?: string;
  description?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}

export function CursorfulVideo({
  title = "Cursorful Demo Recording",
  description,
  autoPlay = false,
  controls = true,
  className = ""
}: CursorfulVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const videoUrl = "/videos/cursorful-two.mp4";
  const thumbnailUrl = "/videos/cursorful-two.mp4";

  const handlePlayClick = () => {
    setShowVideo(true);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    // Keep existing functionality
  };

  const handleLoadedMetadata = () => {
    // Keep existing functionality
  };

  return (
    <Card className="relative overflow-hidden bg-background border-border">
      <div className="relative aspect-video bg-muted">
        {!showVideo && (
          <div className="absolute inset-0 cursor-pointer group" onClick={handlePlayClick}>
            <video
              className="w-full h-full object-cover"
              src={videoUrl}
              preload="metadata"
              muted
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-primary/90 hover:bg-primary rounded-full p-6 transition-all duration-300 group-hover:scale-110">
                <Play className="w-12 h-12 text-primary-foreground ml-1" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold text-lg mb-2">Watch Demo</h3>
                <p className="text-white/80 text-sm">See our product in action</p>
              </div>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          autoPlay={autoPlay}
          muted={isMuted}
        />
      </div>
    </Card>
  );
}