import React from 'react';

interface MusicPlayerCardProps {
  title: string;
  artist: string;
  albumArt?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onSeek?: (time: number) => void;
  className?: string;
}

const MusicPlayerCard: React.FC<MusicPlayerCardProps> = ({
  title,
  artist,
  albumArt,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSkipBackward,
  onSkipForward,
  onSeek,
  className = ''
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * duration;

    onSeek(newTime);
  };

  return (
    <div className={`music-player-container ${className}`}>
      <div className="main-music-card">
        <input type="checkbox" id="play-toggle" checked={isPlaying} readOnly hidden />
        <div className="track-info">
          <div
            className="album-art"
            style={{
              backgroundImage: albumArt ? `url(${albumArt})` : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="track-details">
            <div className="track-title">{title}</div>
            <div className="artist-name">{artist}</div>
          </div>
          <div className="volume-bars">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`bar ${isPlaying ? 'animate' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
        <div className="playback-controls">
          <div className="time-info">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="remaining-time">{formatTime(duration)}</span>
          </div>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className="progress-handle"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
          <div className="button-row">
            <div className="main-control-btns">
              <button className="control-button back" onClick={onSkipBackward}>
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} fill="currentColor" className="bi bi-skip-backward-fill" viewBox="0 0 16 16">
                  <path d="M.5 3.5A.5.5 0 0 0 0 4v8a.5.5 0 0 0 1 0V8.753l6.267 3.636c.54.313 1.233-.066 1.233-.697v-2.94l6.267 3.636c.54.314 1.233-.065 1.233-.696V4.308c0-.63-.693-1.01-1.233-.696L8.5 7.248v-2.94c0-.63-.692-1.01-1.233-.696L1 7.248V4a.5.5 0 0 0-.5-.5" />
                </svg>
              </button>
              <div className="play-pause-btns">
                <button className="control-button play-pause-button" onClick={onPlayPause}>
                  <svg className={`icon-play ${isPlaying ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width={30} height={30} fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.596 8.697l-6.363 3.692c-.54.314-1.233-.065-1.233-.696V4.308c0-.63.693-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
                  </svg>
                  <svg className={`icon-pause ${!isPlaying ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width={30} height={30} fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
                  </svg>
                </button>
              </div>
              <button className="control-button next" onClick={onSkipForward}>
                <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} fill="currentColor" className="bi bi-skip-forward-fill" viewBox="0 0 16 16">
                  <path d="M15.5 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V8.753l-6.267 3.636c-.54.313-1.233-.066-1.233-.697v-2.94l-6.267 3.636C.693 12.703 0 12.324 0 11.693V4.308c0-.63.693-1.01 1.233-.696L7.5 7.248v-2.94c0-.63.693-1.01 1.233-.696L15 7.248V4a.5.5 0 0 1 .5-.5" />
                </svg>
              </button>
            </div>
            <button className="control-button d">
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} fill="currentColor" className="bi bi-radar" viewBox="0 0 16 16">
                <path d="M6.634 1.135A7 7 0 0 1 15 8a.5.5 0 0 1-1 0 6 6 0 1 0-6.5 5.98v-1.005A5 5 0 1 1 13 8a.5.5 0 0 1-1 0 4 4 0 1 0-4.5 3.969v-1.011A2.999 2.999 0 1 1 11 8a.5.5 0 0 1-1 0 2 2 0 1 0-2.5 1.936v-1.07a1 1 0 1 1 1 0V15.5a.5.5 0 0 1-1 0v-.518a7 7 0 0 1-.866-13.847" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayerCard;