import React, { useEffect, useRef } from 'react';

interface AdsterraNativeProps {
  className?: string;
  adKey?: string;
}

export const AdsterraNative: React.FC<AdsterraNativeProps> = ({
  className = '',
  adKey = '54be31a9ecb4f14835a9fa3ac205c0af',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (iframeDoc) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 0; background: transparent; }
              </style>
            </head>
            <body>
              <script async="async" data-cfasync="false" src="https://pl30635924.effectivecpmnetwork.com/${adKey}/invoke.js"></script>
              <div id="container-${adKey}"></div>
            </body>
          </html>
        `;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
      }
    }
  }, [adKey]);

  return (
    <div className={`w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 my-4 flex flex-col justify-center items-center min-h-[140px] shadow-lg overflow-hidden relative group ${className}`}>
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200/60 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Sponsored Insights (Native)
        </span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
          Adsterra
        </span>
      </div>

      <div className="w-full flex justify-center items-center min-h-[160px] overflow-x-auto hide-scrollbar">
        <iframe
          ref={iframeRef}
          className="w-full border-none overflow-hidden"
          style={{ height: '280px', border: 'none' }}
          title="Adsterra Native Ad"
          scrolling="no"
        />
      </div>
    </div>
  );
};

export default AdsterraNative;

