import React, { useState, useEffect } from 'react';
import { Home, Search, Layers, Settings, Wifi, BatteryMedium, Signal, Smartphone, Maximize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab: 'home' | 'find' | 'memory' | 'settings';
  onTabChange: (tab: 'home' | 'find' | 'memory' | 'settings') => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const [timeStr, setTimeStr] = useState('10:42');
  const [isFrameMode, setIsFrameMode] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#EAEBED] text-[#1D2430] flex flex-col items-center justify-start p-0 md:p-6 lg:p-8 antialiased selection:bg-[#315B8A]/20">
      {/* Top Header for Desktop Viewers */}
      <div className="hidden md:flex items-center justify-between w-full max-w-[420px] mb-3 px-2 text-xs text-[#687385]">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#315B8A]"></span>
          <span className="text-[#1D2430] font-semibold">FIND-BACK</span>
          <span>· Real Mobile Prototype</span>
        </div>
        <button
          onClick={() => setIsFrameMode(!isFrameMode)}
          className="flex items-center gap-1 hover:text-[#1D2430] transition-colors py-1 px-2.5 rounded-lg bg-white border border-[#E4E8ED] shadow-xs text-[11px]"
        >
          {isFrameMode ? (
            <>
              <Maximize2 className="w-3 h-3" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3 h-3" />
              <span>Device Frame</span>
            </>
          )}
        </button>
      </div>

      {/* Smartphone Chassis */}
      <div
        className={`w-full transition-all duration-300 flex flex-col relative overflow-hidden bg-[#F7F8FA] text-[#1D2430] ${
          isFrameMode
            ? 'max-w-[412px] h-[860px] max-h-[96vh] rounded-[42px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-[8px] border-[#2A2E35] ring-1 ring-black/10'
            : 'max-w-md min-h-screen border-x border-[#E4E8ED] shadow-xl'
        }`}
      >
        {/* Android Punch-hole Camera Cutout */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1A1D20] z-50 pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2A2E35]"></div>
        </div>

        {/* Android Status Bar */}
        <div className="relative z-40 w-full pt-3 pb-2 px-6 flex items-center justify-between text-xs font-medium text-[#1D2430] select-none bg-[#F7F8FA]/90 backdrop-blur-md">
          <span className="font-semibold text-[13px] tracking-tight pl-1">{timeStr}</span>
          <div className="flex items-center gap-2 pr-1 text-[#687385]">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-[#1D2430]">88%</span>
              <BatteryMedium className="w-4 h-4 text-[#1D2430]" />
            </div>
          </div>
        </div>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col pb-20">
          {children}
        </div>

        {/* Minimal Bottom Navigation: HOME, FIND, MEMORY, SETTINGS */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E4E8ED] px-4 pt-2 pb-5 flex items-center justify-around shadow-xs">
          <button
            onClick={() => onTabChange('home')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
              activeTab === 'home' ? 'text-[#315B8A] font-semibold' : 'text-[#687385] hover:text-[#1D2430]'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">HOME</span>
          </button>

          <button
            onClick={() => onTabChange('find')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
              activeTab === 'find' ? 'text-[#315B8A] font-semibold' : 'text-[#687385] hover:text-[#1D2430]'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">FIND</span>
          </button>

          <button
            onClick={() => onTabChange('memory')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
              activeTab === 'memory' ? 'text-[#315B8A] font-semibold' : 'text-[#687385] hover:text-[#1D2430]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">MEMORY</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
              activeTab === 'settings' ? 'text-[#315B8A] font-semibold' : 'text-[#687385] hover:text-[#1D2430]'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">SETTINGS</span>
          </button>
        </nav>

        {/* Android Gesture Navigation Pill at Bottom */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-[#1D2430]/20 rounded-full pointer-events-none z-50"></div>
      </div>
    </div>
  );
};
