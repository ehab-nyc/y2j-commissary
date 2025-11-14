import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface ThemeAnimationPreviewProps {
  theme: 'halloween' | 'christmas';
  enabled: boolean;
  speed?: 'slow' | 'normal' | 'fast';
  selectedEmojis: string[];
  emojiOptions: Array<{ value: string; emoji: string }>;
}

export const ThemeAnimationPreview = ({
  theme,
  enabled,
  speed = 'normal',
  selectedEmojis,
  emojiOptions,
}: ThemeAnimationPreviewProps) => {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewRef.current || !enabled) return;

    const preview = previewRef.current;
    const existingElements = preview.querySelectorAll('.falling-emoji');
    existingElements.forEach(el => el.remove());

    if (selectedEmojis.length === 0) return;

    // Speed multipliers
    const speedMultipliers = {
      slow: 1.5,
      normal: 1,
      fast: 0.6,
    };

    const multiplier = speedMultipliers[speed];

    // Get emojis to show
    const emojisToShow = emojiOptions
      .filter(opt => selectedEmojis.includes(opt.value))
      .map(opt => opt.emoji);

    if (emojisToShow.length === 0) return;

    // Create falling elements
    const positions = [10, 25, 40, 55, 70, 85];
    const animations = theme === 'halloween' 
      ? ['fall', 'fall-sway']
      : ['snowfall', 'snowfall-drift'];

    positions.forEach((left, index) => {
      const element = document.createElement('div');
      const emoji = emojisToShow[index % emojisToShow.length];
      element.textContent = emoji;
      element.className = 'falling-emoji';
      
      const baseDuration = 8 + Math.random() * 4;
      const duration = baseDuration * multiplier;
      const delay = Math.random() * 3;
      const animationType = animations[index % animations.length];
      const size = 1.5 + Math.random() * 0.8;

      element.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: -10%;
        font-size: ${size}rem;
        pointer-events: none;
        z-index: 1;
        animation: ${animationType} ${duration}s linear infinite ${delay}s;
        opacity: 0;
      `;

      preview.appendChild(element);
    });

    return () => {
      const elements = preview.querySelectorAll('.falling-emoji');
      elements.forEach(el => el.remove());
    };
  }, [theme, enabled, speed, selectedEmojis, emojiOptions]);

  if (!enabled) {
    return (
      <Card className="h-48 flex items-center justify-center bg-muted/30 border-dashed">
        <p className="text-sm text-muted-foreground">
          Enable animations to see preview
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-48 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div ref={previewRef} className="absolute inset-0">
        {/* Preview content area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2 opacity-30">
            <div className="text-6xl">
              {theme === 'halloween' ? '🎃' : '🎄'}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Animation Preview
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(250px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes fall-sway {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(125px) translateX(20px) rotate(180deg);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(250px) translateX(-15px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes snowfall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(250px) translateX(15px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes snowfall-drift {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          25% {
            transform: translateY(62px) translateX(-10px) rotate(90deg);
          }
          50% {
            transform: translateY(125px) translateX(10px) rotate(180deg);
          }
          75% {
            transform: translateY(187px) translateX(-8px) rotate(270deg);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(250px) translateX(5px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </Card>
  );
};
