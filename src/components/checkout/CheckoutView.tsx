import React, { useState } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Store,
  QrCode,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../../lib/CartContext';
import { createOrder } from '../../lib/orders';
import { TypeCommande, ModePaiement, Order } from '../../types';

interface CheckoutViewProps {
  initialTableId?: string | null;
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

const LOME_QUARTIERS = [
  'Agoè (Nyivé, Cacaveli, Assiyéyé)',
  'Tokoin (Doumasséssé, Solidarité, Witi)',
  'Totsi & GTA',
  'Hedzranawoé & Aéroport',
  'Bè (Château, Kpéhénou, Beach)',
  'Nyékonakpoè & Kodjoviakopé',
  'Adidogomé & Ségbé',
  'Baguida & Avépozo',
  'Kégué & Saint Joseph',
  'Autre quartier de Lomé'
];

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  initialTableId,
  onBack,
  onOrderSuccess,
}) => {
  const { items, totalAmount, totalCount, clearCart } = useCart();

  // Customer Form State
  const [nom, setNom] = useState<string>('');
  const [prenom, setPrenom] = useState<string>('');
  const [telephone, setTelephone] = useState<string>('+228 ');

  // Order Type State (Default to LIVRAISON or SUR_PLACE if table provided)
  const [typeCommande, setTypeCommande] = useState<TypeCommande>(
    initialTableId ? 'SUR_PLACE' : 'LIVRAISON'
  );

  // Delivery Fields
  const [quartier, setQuartier] = useState<string>(LOME_QUARTIERS[0]);
  const [adresse, setAdresse] = useState<string>('');
  const [indications, setIndications] = useState<string>('');

  // Table Field (Sur place)
  const [tableNumber, setTableNumber] = useState<string>(
    initialTableId ? initialTableId.replace('tbl_', '').replace('#', '') : '1'
  );

  // Payment Mode State
  const [modePaiement, setModePaiement] = useState<ModePaiement>('TMONEY');

  // Submit & Error states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update available payment methods when order type changes
  const handleTypeChange = (type: TypeCommande) => {
    setTypeCommande(type);
    if (type === 'LIVRAISON' && modePaiement === 'SUR_PLACE') {
      setModePaiement('LIVRAISON');
    } else if (type === 'RETRAIT' && modePaiement === 'LIVRAISON') {
      setModePaiement('SUR_PLACE');
    } else if (type === 'SUR_PLACE' && modePaiement === 'LIVRAISON') {
      setModePaiement('SUR_PLACE');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Votre panier est vide.');
      return;
    }

    if (!nom.trim() || !telephone.trim() || telephone.trim() === '+228') {
      setErrorMessage('Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    if (typeCommande === 'LIVRAISON' && !adresse.trim() && !quartier.trim()) {
      setErrorMessage('Veuillez préciser le quartier et l’adresse de livraison.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        clientNom: nom.trim(),
        clientPrenom: prenom.trim() || undefined,
        clientTel: telephone.trim(),
        typeCommande,
        tableId: typeCommande === 'SUR_PLACE' ? `Table #${tableNumber}` : null,
        adresseLivraison: adresse.trim() || null,
        quartier: typeCommande === 'LIVRAISON' ? quartier : undefined,
        indications: typeCommande === 'LIVRAISON' ? indications.trim() : undefined,
        modePaiement,
        items: items.map((i) => ({
          productId: i.product.id,
          quantite: i.quantite,
          prixUnitaire: i.product.prix,
        })),
      };

      const result = await createOrder(orderPayload);

      if (result.success && result.order) {
        clearCart();
        onOrderSuccess(result.order);
      } else {
        setErrorMessage(result.error || 'Une erreur est survenue lors de la création de la commande.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur inattendue.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-[#E5DDD0] text-center space-y-4 shadow-xs my-8">
        <ShoppingBag className="w-12 h-12 text-[#C9A24B] mx-auto" />
        <h2 className="font-serif text-xl font-bold text-[#1F3D2E]">Votre panier est vide</h2>
        <p className="text-xs text-[#53685C]">
          Veuillez ajouter des articles avant de finaliser votre commande.
        </p>
        <button
          onClick={onBack}
          className="bg-[#1F3D2E] text-[#FAF3E8] text-xs font-semibold px-5 py-3 rounded-xl hover:bg-[#2A4D3B] transition-all"
        >
          Retourner au catalogue
        </button>
      </div>
    );
  }

  return (
    <div id="checkout-container" className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Checkout Header */}
      <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[#53685C] hover:text-[#1F3D2E] p-1.5 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1F3D2E]">Finaliser ma Commande</h1>
            <p className="text-xs text-[#53685C]">Tunnel de commande Signature One</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[#53685C] block">Total</span>
          <span className="font-serif font-bold text-lg text-[#1F3D2E]">
            {totalAmount.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Client Details, Reception, Payment */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Coordonnées Client */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EFE9DF] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] text-[#1F3D2E] flex items-center justify-center font-bold text-xs border border-[#C9A24B]/30">
                1
              </div>
              <h2 className="font-serif font-bold text-base text-[#1F3D2E]">Coordonnées de contact</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-[#1F3D2E]">
                  Nom de famille <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#53685C]" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mensah"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F3D2E]">
                  Prénom(s)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Koffi"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block font-semibold text-[#1F3D2E]">
                  Numéro de téléphone WhatsApp / Appel <span className="text-red-700">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#53685C]" />
                  <input
                    type="tel"
                    required
                    placeholder="+228 90 00 00 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl font-mono focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                  />
                </div>
                <p className="text-[10px] text-[#53685C]">
                  Utilisé pour le suivi et les notifications de livraison.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Mode de Réception */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EFE9DF] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] text-[#1F3D2E] flex items-center justify-center font-bold text-xs border border-[#C9A24B]/30">
                2
              </div>
              <h2 className="font-serif font-bold text-base text-[#1F3D2E]">Mode de réception</h2>
            </div>

            {/* Type selector buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleTypeChange('LIVRAISON')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  typeCommande === 'LIVRAISON'
                    ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Truck className={`w-5 h-5 ${typeCommande === 'LIVRAISON' ? 'text-[#1F3D2E]' : 'text-[#53685C]'}`} />
                  {typeCommande === 'LIVRAISON' && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A24B]"></span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-serif font-bold text-xs text-[#1F3D2E] block">Livraison</span>
                  <span className="text-[10px] text-[#53685C]">À votre domicile/bureau</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('RETRAIT')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  typeCommande === 'RETRAIT'
                    ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Store className={`w-5 h-5 ${typeCommande === 'RETRAIT' ? 'text-[#1F3D2E]' : 'text-[#53685C]'}`} />
                  {typeCommande === 'RETRAIT' && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A24B]"></span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-serif font-bold text-xs text-[#1F3D2E] block">Retrait</span>
                  <span className="text-[10px] text-[#53685C]">Au comptoir Signature</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('SUR_PLACE')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  typeCommande === 'SUR_PLACE'
                    ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <QrCode className={`w-5 h-5 ${typeCommande === 'SUR_PLACE' ? 'text-[#1F3D2E]' : 'text-[#53685C]'}`} />
                  {typeCommande === 'SUR_PLACE' && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A24B]"></span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-serif font-bold text-xs text-[#1F3D2E] block">Sur Place</span>
                  <span className="text-[10px] text-[#53685C]">Dégustation au salon</span>
                </div>
              </button>
            </div>

            {/* Conditional Fields based on Type */}
            {typeCommande === 'LIVRAISON' && (
              <div className="pt-3 space-y-3 text-xs animate-in fade-in">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F3D2E]">
                    Quartier de Lomé <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                  >
                    {LOME_QUARTIERS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F3D2E]">
                    Adresse précise ou repère géographique <span className="text-red-700">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#53685C]" />
                    <textarea
                      rows={2}
                      required
                      placeholder="Ex: Face à la pharmacie du Point, 2ème ruelle après l'école, portail noir"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#53685C]">
                    Indications complémentaires (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sonner à l'interphone 2, appeler en arrivant"
                    value={indications}
                    onChange={(e) => setIndications(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl focus:ring-2 focus:ring-[#1F3D2E] outline-hidden text-[#1F3D2E]"
                  />
                </div>
              </div>
            )}

            {typeCommande === 'SUR_PLACE' && (
              <div className="pt-2 space-y-2 text-xs animate-in fade-in">
                <label className="block font-semibold text-[#1F3D2E]">
                  Numéro de table <span className="text-red-700">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-24 px-3 py-2.5 bg-[#FAF3E8]/40 border border-[#E5DDD0] rounded-xl font-bold font-mono text-[#1F3D2E] text-center"
                  />
                  <span className="text-[#53685C] text-xs">
                    Vérifiez le numéro inscrit sur votre chevalet de table Signature One.
                  </span>
                </div>
              </div>
            )}

            {typeCommande === 'RETRAIT' && (
              <div className="p-3 bg-[#FAF3E8] rounded-xl text-xs text-[#53685C] border border-[#E5DDD0]">
                Votre commande sera préparée et mise de côté au comptoir boutique Signature One pour un retrait rapide sans file d'attente.
              </div>
            )}
          </div>

          {/* Step 3: Mode de Paiement */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#EFE9DF] pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FAF3E8] text-[#1F3D2E] flex items-center justify-center font-bold text-xs border border-[#C9A24B]/30">
                3
              </div>
              <h2 className="font-serif font-bold text-base text-[#1F3D2E]">Mode de paiement</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* TMoney */}
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  modePaiement === 'TMONEY'
                    ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-900 border border-amber-500/20 flex items-center justify-center font-bold text-[11px]">
                    TM
                  </div>
                  <div>
                    <span className="font-bold text-[#1F3D2E] block">TMoney (Togocom)</span>
                    <span className="text-[10px] text-[#53685C]">Mobile Money Togo</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="modePaiement"
                  value="TMONEY"
                  checked={modePaiement === 'TMONEY'}
                  onChange={() => setModePaiement('TMONEY')}
                  className="text-[#1F3D2E] focus:ring-[#1F3D2E]"
                />
              </label>

              {/* Flooz */}
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  modePaiement === 'FLOOZ'
                    ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                    : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-900 border border-blue-500/20 flex items-center justify-center font-bold text-[11px]">
                    FL
                  </div>
                  <div>
                    <span className="font-bold text-[#1F3D2E] block">Flooz (Moov Money)</span>
                    <span className="text-[10px] text-[#53685C]">Mobile Money Togo</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="modePaiement"
                  value="FLOOZ"
                  checked={modePaiement === 'FLOOZ'}
                  onChange={() => setModePaiement('FLOOZ')}
                  className="text-[#1F3D2E] focus:ring-[#1F3D2E]"
                />
              </label>

              {/* Paiement à la livraison (if LIVRAISON) */}
              {typeCommande === 'LIVRAISON' && (
                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    modePaiement === 'LIVRAISON'
                      ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                      : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-900 border border-emerald-500/20 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="font-bold text-[#1F3D2E] block">Paiement à la livraison</span>
                      <span className="text-[10px] text-[#53685C]">Espèces ou TMoney au livreur</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="modePaiement"
                    value="LIVRAISON"
                    checked={modePaiement === 'LIVRAISON'}
                    onChange={() => setModePaiement('LIVRAISON')}
                    className="text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                </label>
              )}

              {/* Paiement sur place (if SUR_PLACE or RETRAIT) */}
              {(typeCommande === 'SUR_PLACE' || typeCommande === 'RETRAIT') && (
                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    modePaiement === 'SUR_PLACE'
                      ? 'border-[#1F3D2E] bg-[#FAF3E8] shadow-xs'
                      : 'border-[#E5DDD0] bg-white hover:border-[#1F3D2E]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-900 border border-emerald-500/20 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="font-bold text-[#1F3D2E] block">Paiement sur place</span>
                      <span className="text-[10px] text-[#53685C]">Au serveur ou au comptoir</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="modePaiement"
                    value="SUR_PLACE"
                    checked={modePaiement === 'SUR_PLACE'}
                    onChange={() => setModePaiement('SUR_PLACE')}
                    className="text-[#1F3D2E] focus:ring-[#1F3D2E]"
                  />
                </label>
              )}

            </div>
{/* Mobile Money — instructions de transfert (auto-rapprochement SMS) */}
            {(modePaiement === 'TMONEY' || modePaiement === 'FLOOZ') && (
              <div className="mt-4 bg-[#FAF3E8]/50 border border-[#C9A24B]/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#1F3D2E] font-bold">
                  <Smartphone className="w-4 h-4 text-[#C9A24B]" />
                  <span>Transfert Mobile Money</span>
                </div>
                <p className="text-[#53685C]">
                  Envoyez exactement{' '}
                  <strong className="text-[#1F3D2E]">
                    {totalAmount.toLocaleString('fr-FR')} FCFA
                  </strong>{' '}
                  à ce numéro :
                </p>
                <div className="bg-white rounded-xl border border-[#E5DDD0] p-3 text-center">
                  <span className="text-base font-mono font-bold text-[#1F3D2E] tracking-wide">
                    +228 92 00 00 00
                  </span>
                  <span className="block text-[10px] text-[#C9A24B] mt-1">
                    {modePaiement === 'TMONEY' ? 'TMoney (Togocom)' : 'Flooz (Moov Money)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#53685C]">
                  <span className="font-semibold text-[#1F3D2E]">Montant à envoyer :</span>{' '}
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-[11px] text-[#53685C]">
                  Dès réception de votre transfert, votre commande sera automatiquement
                  confirmée sans action de votre part.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Order Summary & Confirmation Button */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E5DDD0] shadow-xs space-y-4 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-[#1F3D2E] border-b border-[#EFE9DF] pb-3">
              Récapitulatif de la commande
            </h3>

            {/* Item list */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs">
              {items.map(({ product, quantite }) => (
                <div key={product.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-xs bg-[#FAF3E8] text-[#1F3D2E] px-2 py-0.5 rounded border border-[#E5DDD0]">
                      {quantite}x
                    </span>
                    <div className="truncate">
                      <span className="font-medium text-[#1F3D2E] truncate block">{product.nom}</span>
                      <span className="text-[10px] text-[#53685C]">{product.format}</span>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-xs text-[#1F3D2E] shrink-0">
                    {(product.prix * quantite).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-[#EFE9DF] pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-[#53685C]">
                <span>Sous-total ({totalCount} articles)</span>
                <span>{totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-[#53685C]">
                <span>Frais de service / Préparation</span>
                <span className="text-emerald-800 font-semibold">Inclus (0 FCFA)</span>
              </div>
              <div className="flex justify-between items-center font-serif font-bold text-lg text-[#1F3D2E] pt-2 border-t border-[#EFE9DF]">
                <span>Total à régler</span>
                <span className="text-[#1F3D2E]">
                  {totalAmount.toLocaleString('fr-FR')}{' '}
                  <span className="text-xs font-normal text-[#C9A24B]">FCFA</span>
                </span>
              </div>
            </div>

            {/* Validation Button */}
            <button
              id="btn-confirm-order"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1F3D2E] hover:bg-[#2A4D3B] text-[#FAF3E8] font-bold text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Création de la commande...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#C9A24B]" />
                  <span>Confirmer la commande</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-[10px] text-[#53685C] justify-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>Garantie fraîcheur & préparation artisanale</span>
            </div>

          </div>
        </div>

      </form>

    </div>
  );
};
