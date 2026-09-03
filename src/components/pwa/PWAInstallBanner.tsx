import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, CheckCircle, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Listen for Chrome/Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <div id="pwa-installed-badge" className="bg-[#1E1915] text-[#E8C382] px-4 py-2 text-xs flex items-center justify-between border-b border-[#C28E5C]/30">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#C28E5C]" />
          <span>Application Signature One installée (Mode Standalone PWA)</span>
        </div>
        <span className="text-[11px] bg-[#C28E5C]/20 text-[#E8C382] px-2 py-0.5 rounded font-mono">PWA Active</span>
      </div>
    );
  }

  if (isDismissed) return null;

  return (
    <>
      <div id="pwa-install-banner" className="bg-gradient-to-r from-[#2C241E] to-[#1E1915] text-[#FAF8F5] px-4 py-3 border-b border-[#C28E5C]/40 shadow-sm transition-all duration-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] p-1 flex items-center justify-center shrink-0 shadow-inner">
              <img src="/icon.svg" alt="Signature One Icon" className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-[#FFFDF9]">Installer Signature One</p>
                <span className="text-[10px] bg-[#C28E5C] text-[#1E1915] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">PWA Mobile</span>
              </div>
              <p className="text-xs text-[#D5C7B8]">Commandez plus vite depuis votre écran d'accueil sans passer par les stores.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-install-pwa"
              onClick={handleInstallClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C28E5C] hover:bg-[#B07B4A] text-[#1E1915] font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? "Ajouter sur iPhone/iPad" : "Installer l'application"}</span>
            </button>
            <button
              id="btn-dismiss-pwa"
              onClick={() => setIsDismissed(true)}
              aria-label="Fermer le bandeau d'installation"
              className="text-[#A8988B] hover:text-[#FAF8F5] p-2 transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FAF8F5] text-[#2C241E] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#E8C382]/50 relative animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#1E1915] p-2 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-[#C28E5C]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1E1915]">Installer sur iOS (Safari)</h3>
                <p className="text-xs text-stone-600">Ajouter à l'écran d'accueil en 2 étapes</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-stone-700 mb-6 bg-white p-4 rounded-xl border border-stone-200">
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-stone-900 bg-stone-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                <span>
                  Appuyez sur le bouton de <strong>Partage</strong> <Share className="inline w-3.5 h-3.5 mx-1 text-blue-600" /> dans la barre de navigation Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-stone-900 bg-stone-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                <span>
                  Faites défiler puis touchez <strong>« Sur l'écran d'accueil »</strong> (icône carrée avec un +).
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-[#1E1915] text-[#FAF8F5] text-xs font-semibold py-2.5 rounded-xl hover:bg-[#2C241E] transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
