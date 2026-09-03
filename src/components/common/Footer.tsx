import React from 'react';
import { Store, Bike, Smartphone, Clock, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  /** Navigation interne (utilisée par le discret accès équipe) */
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer id="main-footer" className="bg-[#1E1915] text-[#D5C7B8] border-t border-[#3B322A] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#C28E5C] text-[#1E1915] font-serif font-bold flex items-center justify-center text-xs">
                S1
              </div>
              <span className="font-bold text-[#FFFDF9] text-sm font-serif">Signature One</span>
            </div>
            <p className="text-[#A8988B] leading-relaxed">
              Dèguè artisanal, yaourts frais et boissons gourmandes préparés avec soin au Togo. Commandez en ligne, en boutique ou à votre table.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-[#FFFDF9] mb-2 uppercase tracking-wider text-[11px] text-[#C28E5C]">
              Nos Services
            </h4>
            <ul className="space-y-1.5 text-[#A8988B]">
              <li className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>Boutique en ligne & retrait</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>Livraison à domicile</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>Paiement Mobile Money (Flooz, TMoney)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>Commande sur place & sur table (QR)</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-[#FFFDF9] mb-2 uppercase tracking-wider text-[11px] text-[#C28E5C]">
              Nous Contacter
            </h4>
            <ul className="space-y-1.5 text-[#A8988B]">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>+228 90 00 00 00</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C28E5C]" />
                <span>Lomé, Togo</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#3B322A] mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8C7D70]">
          <span className="flex items-center gap-1">
            ©
            {/* Accès discret réservé à l'équipe — ressemble au point du © */}
            {onNavigate ? (
              <button
                type="button"
                aria-label="Espace professionnel"
                onClick={() => onNavigate('connexion')}
                className="w-3 h-3 rounded-full bg-[#8C7D70]/40 hover:bg-[#C28E5C]/80 transition-colors cursor-pointer"
              />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            )}
            {new Date().getFullYear()} Signature One. Tous droits réservés.
          </span>
          <div className="flex items-center gap-1.5">
            <span>Dèguè, Yaourts & Boissons artisanales — Togo</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
