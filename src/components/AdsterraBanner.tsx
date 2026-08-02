import React, { useEffect, useRef } from 'react';

interface AdsterraBannerProps {
  className?: string;
  bannerKey?: string;
  format?: 'banner728x90' | 'banner300x250';
}

export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({
  className = '',
  bannerKey = 'f858ce4c863276592bd9524a55dd3114',
  format = 'banner300x250',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const width = format === 'banner300x250' ? 300 : 728;
  const height = format === 'banner300x250' ? 250 : 90;

  useEffect(() => {
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (iframeDoc) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }
              </style>
            </head>
            <body>
              <script type="text/javascript">
                atOptions = {
                  'key': '${bannerKey}',
                  'format': 'iframe',
                  'height': ${height},
                  'width': ${width},
                  'params': {}
                };
              </script>
              <script type="text/javascript" src="https://www.highperformanceformat.com/${bannerKey}/invoke.js"></script>
            </body>
          </html>
        `;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
      }
    }
  }, [bannerKey, height, width]);

  return (
    <div className={`w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 my-4 flex flex-col justify-center items-center shadow-lg overflow-hidden relative ${className}`}>
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200/60">
          Advertisement
        </span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-mono">
          Adsterra Display
        </span>
      </div>

      <div className={`w-full flex justify-center items-center overflow-x-auto max-w-full ${format === 'banner300x250' ? 'min-h-[250px]' : 'min-h-[90px]'}`}>
        <iframe
          ref={iframeRef}
          width={width}
          height={height}
          style={{ border: 'none', overflow: 'hidden' }}
          title="Adsterra Display Banner"
          scrolling="no"
        />
      </div>
    </div>
  );
};

export default AdsterraBanner;

        
