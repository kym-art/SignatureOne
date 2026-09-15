import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Nom du portail protégé (affiché dans les logs console). */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Garde-fou UI : une erreur de rendu dans un portail (admin/vendeur) ne doit
 * JAMAIS laisser une page blanche sans diagnostic. Affiche un message clair
 * avec la cause et un bouton de rechargement, au lieu de faire planter tout
 * l'arbre React (page blanche totale).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  readonly state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(
      `[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}] Erreur de rendu:`,
      error,
      info?.componentStack
    );
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="bg-white p-8 rounded-3xl border border-red-200 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[#1F3D2E]">Une erreur est survenue</h3>
          <p className="text-xs text-[#53685C] break-words font-mono bg-[#FAF3E8]/60 p-3 rounded-xl border border-[#E5DDD0]">
            {this.state.error.message || 'Erreur inconnue'}
          </p>
          <p className="text-[11px] text-[#53685C]">
            Le portail n'a pas pu s'afficher. Rechargez la page ; si le problème persiste, videz le cache du navigateur.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-[#1F3D2E] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2A4D3B] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}