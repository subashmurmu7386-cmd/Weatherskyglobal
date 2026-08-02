import React, { useEffect, useRef } from 'react';

interface AdsterraBannerProps {
  className?: string;
  bannerKey?: string;
  format?: 'banner728x90' | 'banner300x250';
}

export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({
  className = '',
<script>
  atOptions = {
    'key' : 'f858ce4c863276592bd9524a55dd3114',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://www.highperformanceformat.com/f858ce4c863276592bd9524a55dd3114/invoke.js"></script>
  
  format = 'banner300x250'
}) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!bannerRef.current || isLoadedRef.current) return;
    isLoadedRef.current = true;

    try {
      const width = format === 'banner300x250' ? 300 : 728;
      const height = format === 'banner300x250' ? 250 : 90;

      (window as any).atOptions = {
        key: bannerKey,
        format: 'iframe',
        height: height,
        width: width,
        params: {}
      };

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${bannerKey}/invoke.js`;
      invokeScript.async = true;

      if (bannerRef.current) {
        bannerRef.current.appendChild(invokeScript);
      }
    } catch (e) {
      console.warn('Adsterra banner script load error:', e);
    }

    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = '';
      }
    };
  }, [bannerKey, format]);

  return (
    <div className={`w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 my-4 flex flex-col justify-center items-center shadow-lg overflow-hidden relative ${className}`}>
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200/60">
          Advertisement
        </span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">Adsterra Display</span>
      </div>
      <div 
        ref={bannerRef} 
        className={`w-full flex justify-center items-center overflow-x-auto max-w-full ${format === 'banner300x250' ? 'min-h-[250px]' : 'min-h-[90px]'}`}
      />
    </div>
  );
};

export default AdsterraBanner;
