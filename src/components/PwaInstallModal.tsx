import { useState } from 'react';
import { Download, X, Smartphone, Monitor, CheckCircle, Share, MoreVertical, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onNativeInstall: () => void;
}

export function PwaInstallModal({ isOpen, onClose, deferredPrompt, onNativeInstall }: PwaInstallModalProps) {
  const [activeOs, setActiveOs] = useState<'android' | 'ios' | 'desktop'>('android');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-lg bg-slate-900 border border-cyan-400/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(34,211,238,0.2)] text-white relative overflow-hidden"
        >
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500"></div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
            aria-label="Close Modal"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 rounded-2xl text-cyan-300 shadow-lg shrink-0">
              <Download size={26} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                Install Weather Sky Global
              </h3>
              <p className="text-xs text-cyan-200/80 font-medium mt-0.5">
                Fast, offline weather forecasting app experience
              </p>
            </div>
          </div>

          {/* Native Install Prompt Action Banner if available */}
          {deferredPrompt && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-indigo-600/30 border border-cyan-400/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" /> Direct Install Ready!
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Click below to trigger instant browser app installation.
                </p>
              </div>
              <button
                onClick={onNativeInstall}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all text-xs tracking-wide shrink-0 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={16} /> Install App Now
              </button>
            </div>
          )}

          {/* OS Platform Tabs */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 mb-6 gap-1">
            <button
              onClick={() => setActiveOs('android')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeOs === 'android'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={14} /> Android
            </button>
            <button
              onClick={() => setActiveOs('ios')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeOs === 'ios'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone size={14} /> iOS (iPhone/iPad)
            </button>
            <button
              onClick={() => setActiveOs('desktop')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeOs === 'desktop'
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor size={14} /> Desktop (PC/Mac)
            </button>
          </div>

          {/* Instruction Content per OS */}
          <div className="space-y-3.5 mb-8">
            {activeOs === 'android' && (
              <>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    Open this website in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5 flex items-center gap-1.5 flex-wrap">
                    Tap the <strong>three dots menu</strong> <MoreVertical size={14} className="text-cyan-300 inline" /> in the top-right corner.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong> to complete download.
                  </p>
                </div>
              </>
            )}

            {activeOs === 'ios' && (
              <>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5 flex items-center gap-1.5 flex-wrap">
                    Open this website in <strong>Safari</strong> and tap the <strong>Share button</strong> <Share size={14} className="text-cyan-300 inline" /> at the bottom bar.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5 flex items-center gap-1.5 flex-wrap">
                    Scroll down in the action list and select <strong>"Add to Home Screen"</strong> <PlusSquare size={14} className="text-cyan-300 inline" />.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    Tap <strong>"Add"</strong> in the top-right corner. The app icon will appear instantly on your iPhone home screen!
                  </p>
                </div>
              </>
            )}

            {activeOs === 'desktop' && (
              <>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    Look at the right side of your browser <strong>address bar</strong> (top right).
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5 flex items-center gap-1.5 flex-wrap">
                    Click the <strong>Install icon</strong> <Download size={14} className="text-cyan-300 inline" /> or <strong>"Install Weather Sky Global"</strong> option.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-200 leading-relaxed pt-0.5">
                    Enjoy native standalone desktop application window with full offline access!
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-white/10 transition-colors text-xs cursor-pointer"
            >
              Got it, Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
