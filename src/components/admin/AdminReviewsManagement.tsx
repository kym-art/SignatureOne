import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  EyeOff,
  Trash2,
  ShieldCheck,
  Clock,
  ThumbsUp,
  AlertCircle,
  X
} from 'lucide-react';
import { Review } from '../../types';
import {
  getAllReviews,
  getPendingReviews,
  getApprovedReviews,
  getFeaturedReviews,
  approveReview,
  hideReview,
  deleteReview,
  subscribeReviews
} from '../../lib/reviews';

export const AdminReviewsManagement: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>(getAllReviews());
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setReviews(getAllReviews());
    const unsub = subscribeReviews(() => setReviews(getAllReviews()));
    return unsub;
  }, []);

  const handleApprove = async (id: string) => {
    const res = await approveReview(id);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Avis client validé et publié avec succès.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors de la validation.' });
    }
  };

  const handleHide = async (id: string) => {
    const res = await hideReview(id);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Avis masqué de la vue publique.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors du masquage.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous définitivement supprimer cet avis ?')) {
      const res = await deleteReview(id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Avis supprimé.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la suppression.' });
      }
    }
  };

  const pendingCount = reviews.filter((r) => !r.valide).length;
  const approvedCount = reviews.filter((r) => r.valide).length;
  // Note : la « mise en avant » des avis (misEnAvant) a été retirée du schéma
  // et de la base → pas de compteur dédié.

  const displayedReviews = reviews.filter((r) => {
    if (activeFilter === 'pending') return !r.valide;
    if (activeFilter === 'approved') return r.valide;
    return true;
  });

  return (
    <div id="admin-reviews-management" className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#C9A24B] font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Modération & Témoignages Clients</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">
            Modération des Avis Clients
          </h2>
          <p className="text-xs text-[#53685C]">
            Validez les retours d'expérience post-commande et mettez en avant les meilleurs avis sur la page d'accueil.
          </p>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl font-bold">
            {pendingCount} en attente
          </span>
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold">
            {approvedCount} validés
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-500 hover:text-stone-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 bg-[#FAF3E8] p-1 rounded-2xl border border-[#E5DDD0] text-xs">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeFilter === 'pending'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          En attente de validation ({pendingCount})
        </button>
        <button
          onClick={() => setActiveFilter('approved')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeFilter === 'approved'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          Avis Validés ({approvedCount})
        </button>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeFilter === 'all'
              ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs'
              : 'text-[#53685C] hover:text-[#1F3D2E]'
          }`}
        >
          Tous les avis ({reviews.length})
        </button>
      </div>

      {/* Reviews Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedReviews.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-3xl p-10 border border-[#E5DDD0] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-[#1F3D2E]">Aucun avis dans cette catégorie</h4>
            <p className="text-[#53685C] text-xs">
              Les avis soumis par les clients après une commande terminée apparaîtront ici.
            </p>
          </div>
        ) : (
          displayedReviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                rev.valide
                  ? 'border-[#E5DDD0]'
                  : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              <div className="space-y-2.5">
                
                {/* Top Row: Stars + Date + Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.note
                            ? 'text-[#C9A24B] fill-[#C9A24B]'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                    <span className="font-bold text-xs text-[#1F3D2E] ml-1">{rev.note}/5</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-stone-500 bg-[#FAF3E8] px-2 py-0.5 rounded border border-[#E5DDD0]">
                      Réf: {rev.orderId}
                    </span>

                    {rev.valide ? (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Validé
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                        En attente
                      </span>
                    )}

                  </div>
                </div>

                {/* Comment */}
                {rev.commentaire ? (
                  <p className="text-xs text-[#1F3D2E] italic bg-[#FAF3E8]/60 p-3 rounded-2xl border border-[#EFE9DF]">
                    « {rev.commentaire} »
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 italic">Sans commentaire textuel.</p>
                )}

                {/* Client info & Timestamp */}
                <div className="flex items-center justify-between text-[11px] text-[#53685C] pt-1">
                  <span>
                    Client : <strong>{rev.prenom || 'Client Anonyme'}</strong>
                  </span>
                  <span>
                    {new Date(rev.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#EFE9DF]">
                
                {!rev.valide ? (
                  <button
                    onClick={() => handleApprove(rev.id)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accepter & Publier</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleHide(rev.id)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Masquer</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(rev.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Supprimer définitivement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
