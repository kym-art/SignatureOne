import React, { useState } from 'react';
import { Lock, Phone, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, Sparkles, UserCheck, ArrowLeft } from 'lucide-react';
import { loginWithPhone } from '../../lib/auth';
import { AuthSession } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  onCancel?: () => void;
  redirectReason?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onCancel, redirectReason }) => {
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithPhone({
        telephone,
        motDePasse,
      });

      if (result.success && result.session) {
        onLoginSuccess(result.session);
      } else {
        setError(result.error || 'Échec de connexion.');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-view-container" className="max-w-md mx-auto py-6 sm:py-10 space-y-6">
      
      {/* Back button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil public</span>
        </button>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DDD0] shadow-xl relative overflow-hidden space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF3E8] p-2 mx-auto flex items-center justify-center shadow-xs border border-[#C9A24B]/40">
            <img src="/icon.svg" alt="Signature One" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F3D2E]">Espace Professionnel</h1>
          <p className="text-xs text-[#53685C]">
            Connexion réservée aux Administrateurs et Vendeurs Signature One
          </p>
        </div>

        {/* Redirect Notice if user was redirected from protected route */}
        {redirectReason && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentification requise</p>
              <p className="text-amber-800 text-[11px]">{redirectReason}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Erreur de connexion</p>
              <p className="text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F3D2E]">
              Numéro de téléphone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-login-phone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+228 90 00 00 00"
                required
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] focus:border-transparent outline-hidden font-mono transition-all text-[#1F3D2E]"
              />
            </div>
            <p className="text-[10px] text-[#53685C]">Format togolais : +228 XX XX XX XX</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F3D2E]">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] focus:border-transparent outline-hidden font-mono transition-all text-[#1F3D2E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-[#1F3D2E] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={loading}
            className="w-full bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-semibold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 text-[#C9A24B]" />
            <span>{loading ? 'Vérification...' : 'Se connecter'}</span>
          </button>

        </form>

      </div>

      <div className="text-center text-[11px] text-stone-500">
        <p>Pas de self-inscription. Les comptes sont créés et gérés exclusivement par l'administrateur.</p>
      </div>

    </div>
  );
};
