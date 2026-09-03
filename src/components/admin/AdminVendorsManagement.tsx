import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  KeyRound, 
  Copy, 
  Check, 
  AlertCircle, 
  Phone, 
  Sparkles,
  Calendar,
  X
} from 'lucide-react';
import { 
  getVendorsList, 
  createVendorAccount, 
  toggleVendorStatus, 
  resetVendorPassword,
  generateRandomPassword
} from '../../lib/auth';
import { VendorUserRecord } from '../../types';

export const AdminVendorsManagement: React.FC = () => {
  const [vendors, setVendors] = useState<VendorUserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newPhone, setNewPhone] = useState('+228');
  const [customPassword, setCustomPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  // Success / Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalData, setPasswordModalData] = useState<{
    vendorNom: string;
    vendorPhone: string;
    password: string;
    isNew: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Refresh vendors list
  const refreshVendors = () => {
    setVendors(getVendorsList());
  };

  useEffect(() => {
    refreshVendors();
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = 
      v.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.telephone.includes(searchQuery);
    
    if (statusFilter === 'ACTIVE') return matchesSearch && v.actif;
    if (statusFilter === 'INACTIVE') return matchesSearch && !v.actif;
    return matchesSearch;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const result = createVendorAccount({
      nom: newNom,
      telephone: newPhone,
      motDePasse: autoGenPassword ? undefined : customPassword,
    });

    if (result.success && result.user && result.tempPassword) {
      refreshVendors();
      setShowCreateModal(false);
      setPasswordModalData({
        vendorNom: result.user.nom,
        vendorPhone: result.user.telephone,
        password: result.tempPassword,
        isNew: true,
      });
      setShowPasswordModal(true);

      // Reset form
      setNewNom('');
      setNewPhone('+228');
      setCustomPassword('');
      setAutoGenPassword(true);
    } else {
      setCreateError(result.error || 'Erreur lors de la création du compte vendeur.');
    }
  };

  const handleToggleStatus = (vendor: VendorUserRecord) => {
    const action = vendor.actif ? 'désactiver' : 'réactiver';
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} le compte de ${vendor.nom} (${vendor.telephone}) ?`)) {
      toggleVendorStatus(vendor.id);
      refreshVendors();
    }
  };

  const handleResetPassword = (vendor: VendorUserRecord) => {
    if (window.confirm(`Générer un nouveau mot de passe temporaire pour ${vendor.nom} ?`)) {
      const result = resetVendorPassword(vendor.id);
      if (result.success && result.tempPassword) {
        refreshVendors();
        setPasswordModalData({
          vendorNom: vendor.nom,
          vendorPhone: vendor.telephone,
          password: result.tempPassword,
          isNew: false,
        });
        setShowPasswordModal(true);
      }
    }
  };

  const handleCopyPassword = () => {
    if (!passwordModalData) return;
    const text = `Identifiants Signature One :\nTéléphone : ${passwordModalData.vendorPhone}\nMot de passe : ${passwordModalData.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="admin-vendors-page" className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5DDD0] shadow-xs">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#1F3D2E]">Comptes Vendeurs</h2>
          <p className="text-xs text-[#53685C]">
            Gestion des accès du personnel de vente ({vendors.length} vendeur{vendors.length > 1 ? 's' : ''} enregistré{vendors.length > 1 ? 's' : ''})
          </p>
        </div>

        <button
          id="btn-add-vendor"
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-[#C9A24B]" />
          <span>Créer un nouveau vendeur</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#FAF3E8] p-1 rounded-xl text-xs w-full sm:w-auto border border-[#E5DDD0]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-[#1F3D2E] text-[#FAF3E8] shadow-xs' : 'text-[#53685C] hover:text-[#1F3D2E]'
            }`}
          >
            Tous ({vendors.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-800 text-white shadow-xs' : 'text-[#53685C] hover:text-emerald-800'
            }`}
          >
            Actifs ({vendors.filter((v) => v.actif).length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'INACTIVE' ? 'bg-red-800 text-white shadow-xs' : 'text-[#53685C] hover:text-red-800'
            }`}
          >
            Désactivés ({vendors.filter((v) => !v.actif).length})
          </button>
        </div>
      </div>

      {/* Vendors Table / List */}
      <div className="bg-white rounded-2xl border border-[#E5DDD0] shadow-xs overflow-hidden">
        {filteredVendors.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#53685C]">
            Aucun compte vendeur correspondant trouvé.
          </div>
        ) : (
          <div className="divide-y divide-[#EFE9DF]">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF3E8]/40 transition-colors"
              >
                {/* Vendor Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1F3D2E]">{vendor.nom}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        vendor.actif
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {vendor.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#53685C]">
                    <span className="flex items-center gap-1 font-mono text-[#1F3D2E]">
                      <Phone className="w-3.5 h-3.5 text-[#C9A24B]" />
                      {vendor.telephone}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      Créé le {new Date(vendor.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-[10px] bg-[#FAF3E8] text-[#1F3D2E] px-1.5 py-0.2 rounded font-mono border border-[#E5DDD0]">
                      Role: VENDEUR
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Reset Password */}
                  <button
                    onClick={() => handleResetPassword(vendor)}
                    title="Générer un nouveau mot de passe"
                    className="bg-[#FAF3E8] hover:bg-[#EFE9DF] text-[#1F3D2E] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-[#E5DDD0]"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#C9A24B]" />
                    <span>Réinitialiser</span>
                  </button>

                  {/* Toggle Active/Inactive */}
                  <button
                    onClick={() => handleToggleStatus(vendor)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      vendor.actif
                        ? 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {vendor.actif ? (
                      <>
                        <UserX className="w-3.5 h-3.5 text-red-600" />
                        <span>Désactiver</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Réactiver</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Create Vendor */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF3E8] text-[#1F3D2E] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#E5DDD0] relative animate-in fade-in zoom-in-95 space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1F3D2E] text-[#C9A24B] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E]">Nouveau Compte Vendeur</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-[#1F3D2E] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block font-semibold text-[#1F3D2E] mb-1">
                  Nom complet du vendeur
                </label>
                <input
                  type="text"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  placeholder="Ex: Koffi Mensah"
                  required
                  className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F3D2E] mb-1">
                  Numéro de téléphone (Identifiant de connexion)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+228 90 00 00 00"
                  required
                  className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                />
              </div>

              {/* Password Option */}
              <div className="space-y-2 pt-1 border-t border-[#E5DDD0]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenPassword}
                    onChange={(e) => setAutoGenPassword(e.target.checked)}
                    className="rounded text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                  <span className="font-semibold text-[#1F3D2E]">
                    Générer automatiquement un mot de passe sécurisé
                  </span>
                </label>

                {!autoGenPassword && (
                  <div>
                    <label className="block text-[#53685C] mb-1">
                      Définir un mot de passe personnalisé
                    </label>
                    <input
                      type="text"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Mot de passe initial"
                      required={!autoGenPassword}
                      className="w-full px-3 py-2 bg-white border border-[#E5DDD0] rounded-xl font-mono focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-[#53685C] hover:bg-[#EFE9DF] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#1F3D2E] text-[#FAF3E8] font-semibold px-4 py-2 rounded-xl hover:bg-[#2A4D3B] transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>Créer le compte</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Temporary Password Display Modal (Shown Once) */}
      {showPasswordModal && passwordModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#E5DDD0] space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#1F3D2E]">
                  {passwordModalData.isNew ? 'Compte Vendeur Créé' : 'Mot de passe réinitialisé'}
                </h3>
                <p className="text-xs text-[#53685C]">Transmettez ces identifiants au vendeur</p>
              </div>
            </div>

            <div className="bg-[#FAF3E8] p-4 rounded-xl border border-[#E5DDD0] space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#E5DDD0] pb-1">
                <span className="text-[#53685C]">Vendeur :</span>
                <span className="font-bold text-[#1F3D2E]">{passwordModalData.vendorNom}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5DDD0] pb-1">
                <span className="text-[#53685C]">Téléphone (Identifiant) :</span>
                <span className="font-mono font-bold text-[#1F3D2E]">{passwordModalData.vendorPhone}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[#53685C]">Mot de passe :</span>
                <span className="font-mono font-bold text-base text-[#1F3D2E] bg-white px-2 py-0.5 rounded border border-[#C9A24B]/40">
                  {passwordModalData.password}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⚠️ Ce mot de passe ne sera plus affiché après la fermeture de cette boîte. Copiez-le dès maintenant.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopyPassword}
                className="flex-1 bg-[#FAF3E8] hover:bg-[#EFE9DF] text-[#1F3D2E] font-semibold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-[#E5DDD0]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#C9A24B]" />}
                <span>{copied ? 'Copié dans le presse-papier !' : 'Copier les identifiants'}</span>
              </button>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="bg-[#1F3D2E] text-[#FAF3E8] font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-[#2A4D3B] transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
