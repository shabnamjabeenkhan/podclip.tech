"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData?: TimelineItem[];
}

const defaultTimelineData: TimelineItem[] = [
  {
    id: 1,
    title: "Instant Actionable Insights",
    date: "Step 1",
    content: "Transform lengthy podcast episodes into actionable insights you can implement immediately. Our AI extracts the most practical advice and strategies.",
    category: "insights",
    icon: Zap,
    relatedIds: [2, 5],
    status: "completed",
    energy: 95
  },
  {
    id: 2,
    title: "Digestible Summaries",
    date: "Step 2",
    content: "Get comprehensive summaries that capture the essence of any podcast episode in minutes, not hours. Perfect for busy professionals.",
    category: "summaries",
    icon: Link,
    relatedIds: [1, 3],
    status: "completed",
    energy: 90
  },
  {
    id: 3,
    title: "Chat With Your Podcast Library",
    date: "Step 3",
    content: "Ask questions about any episode in your library and get instant answers. Search across your entire podcast collection with natural language.",
    category: "chat",
    icon: ArrowRight,
    relatedIds: [2, 4],
    status: "in-progress",
    energy: 85
  },
  {
    id: 4,
    title: "Key Takeaways",
    date: "Step 4",
    content: "Never miss important points again. Our AI identifies and highlights the most valuable takeaways from every episode you listen to.",
    category: "takeaways",
    icon: Zap,
    relatedIds: [3, 5],
    status: "completed",
    energy: 88
  },
  {
    id: 5,
    title: "Jump to the Exact Moment",
    date: "Step 5",
    content: "Click on any insight or takeaway to jump directly to that moment in the original audio. No more scrubbing through episodes.",
    category: "navigation",
    icon: Link,
    relatedIds: [1, 4],
    status: "pending",
    energy: 92
  }
];

export default function RadialOrbitalTimeline({
  timelineData = defaultTimelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(1024);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    // Remove card expansion functionality - keep orbital animation only
    // No cards will be shown when clicking on nodes
  };

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setWindowWidth(window.innerWidth);
      }
    };

    // Set initial window width
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    // Responsive radius based on screen size
    const getResponsiveRadius = () => {
      if (windowWidth < 480) return 120; // mobile
      if (windowWidth < 768) return 150; // small tablets
      if (windowWidth < 1024) return 180; // tablets
      return 200; // desktop
    };

    const radius = getResponsiveRadius();
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white";
      case "in-progress":
        return "text-black bg-white border-black";
      case "pending":
        return "text-white bg-black/40 border-white/50";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  return (
    <div
      className="w-full min-h-screen h-screen flex flex-col items-center justify-center bg-[#0B1215] overflow-hidden px-4 sm:px-6 lg:px-8"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          <div className="absolute w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-500 animate-pulse flex items-center justify-center z-10">
            <div className="absolute w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 rounded-full border border-white/20 animate-ping opacity-70"></div>
            <div
              className="absolute w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 rounded-full border border-white/10 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/80 backdrop-blur-md"></div>
          </div>

          <div className="absolute w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full border border-white/10"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                <div
                  className={`
                  w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-white text-black"
                      : isRelated
                      ? "bg-white/50 text-black"
                      : "bg-black text-white"
                  }
                  border-2
                  ${
                    isExpanded
                      ? "border-white shadow-lg shadow-white/30"
                      : isRelated
                      ? "border-white animate-pulse"
                      : "border-white/40"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-150" : ""}
                `}
                >
                  <Icon size={windowWidth < 640 ? 12 : windowWidth < 768 ? 14 : 16} />
                </div>

                <div
                  className={`
                  absolute top-8 sm:top-10 md:top-12 whitespace-nowrap text-center
                  text-xs sm:text-sm font-semibold tracking-wider
                  transition-all duration-300 max-w-24 sm:max-w-32 md:max-w-none
                  ${isExpanded ? "text-white scale-125" : "text-white/70"}
                  ${windowWidth < 640 ? "text-[10px] leading-tight" : ""}
                `}
                  style={{
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: windowWidth < 640 ? '10px' : windowWidth < 768 ? '11px' : '12px'
                  }}
                >
                  {windowWidth < 640 ? item.title.split(' ').slice(0, 2).join(' ') : item.title}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}