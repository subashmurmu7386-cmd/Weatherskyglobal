import React, { useEffect, useRef } from 'react';

interface AdsterraNativeProps {
  className?: string;
  adKey?: string;
}

export const AdsterraNative: React.FC<AdsterraNativeProps> = ({
  className = '',
  adKey = '54be31a9ecb4f14835a9fa3ac205c0af'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return;
    loadedRef.current = true;

    try {
      // Create container for Adsterra native ad
      const scriptContainer = document.createElement('div');
      scriptContainer.id = `container-${adKey}`;

      // Global Options for Adsterra
      (window as any).atOptions = {
        key: adKey,
        format: 'iframe',
        height: 160,
        width: 600,
        params: {}
      };

      // Create Script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://pl30635924.effectivecpmnetwork.com/${adKey}/invoke.js`;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');

      if (containerRef.current) {
        containerRef.current.appendChild(scriptContainer);
        containerRef.current.appendChild(script);
      }
    } catch (e) {
      console.warn('Adsterra native script load error:', e);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adKey]);

  return (
    <div className={`w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 my-4 flex flex-col items-center justify-center min-h-[140px] shadow-lg overflow-hidden relative group ${className}`}>
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200/60 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Sponsored Insights (Native 1x2)
        </span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">Adsterra</span>
      </div>

      <div ref={containerRef} className="w-full flex justify-center items-center min-h-[100px] overflow-x-auto hide-scrollbar">
        {/* Adsterra Native Target Container */}
      </div>
    </div>
  );
};

export default AdsterraNative;

