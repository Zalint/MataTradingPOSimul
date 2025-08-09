import React from 'react';

const FormulesHypotheses = () => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">📚 Formules et Hypothèses DCF</h3>
      
      {/* Formules principales */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">🧮 Formules Principales</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Marge Moyenne (ventes)</div>
            <div className="text-sm text-gray-600">Marge = Σ(Bénéfices par produit) / Volume Total</div>
            <div className="text-xs text-gray-500 mt-1">Rentabilité par FCFA de chiffre d'affaires</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">EBITDA (Earnings Before Interest, Taxes, D&A)</div>
            <div className="text-sm text-gray-600">EBITDA = Bénéfice Total - Charges Opérationnelles</div>
            <div className="text-xs text-gray-500 mt-1">Résultat opérationnel avant D&A</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">EBIT (Earnings Before Interest and Taxes)</div>
            <div className="text-sm text-gray-600">EBIT = EBITDA - D&A mensuel</div>
            <div className="text-xs text-gray-500 mt-1">Résultat opérationnel après D&A</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">NOPAT (Net Operating Profit After Taxes)</div>
            <div className="text-sm text-gray-600">NOPAT = EBIT × (1 - Taux d'imposition)</div>
            <div className="text-xs text-gray-500 mt-1">Résultat net d'exploitation après impôts</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">FCF (Free Cash Flow)</div>
            <div className="text-sm text-gray-600">FCF = NOPAT + D&A mensuel</div>
            <div className="text-xs text-gray-500 mt-1">CAPEX et ΔBFR = 0 (one-shot initial)</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">D&A (Dépréciation et Amortissement)</div>
            <div className="text-sm text-gray-600">D&A mensuel = (CAPEX / 24) où 24 mois</div>
            <div className="text-xs text-gray-500 mt-1">Amortissement sur 24 mois</div>
          </div>
        </div>
      </div>

      {/* Formules par produit */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">🥩 Formules par Produit</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">CA par Produit</div>
            <div className="text-sm text-gray-600">CA_p = Volume Total × Répartition_p</div>
            <div className="text-xs text-gray-500 mt-1">Chiffre d'affaires par produit</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Marge Brute (markup)</div>
            <div className="text-sm text-gray-600">Marge = (PV - PA) / PA</div>
            <div className="text-xs text-gray-500 mt-1">Formule markup pour tous les produits</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Bénéfice avec Abats</div>
            <div className="text-sm text-gray-600">B = CA × (1-pération) + Abats - COGS</div>
            <div className="text-xs text-gray-500 mt-1">Pour Bœuf et Veau (hasAbats: true)</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Bénéfice sans Abats</div>
            <div className="text-sm text-gray-600">B = CA - COGS</div>
            <div className="text-xs text-gray-500 mt-1">Pour autres produits (hasAbats: false)</div>
          </div>
        </div>
      </div>

      {/* Ratios et Seuils */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">🎯 Ratios et Seuils de Rentabilité</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Seuil de Rentabilité</div>
            <div className="text-sm text-gray-600">Seuil CA = Charges Mensuelles / Marge Moyenne (ventes)</div>
            <div className="text-xs text-gray-500 mt-1">CA minimum pour couvrir les charges</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Marge EBITDA</div>
            <div className="text-sm text-gray-600">Marge EBITDA = EBITDA / Volume Total</div>
            <div className="text-xs text-gray-500 mt-1">Rentabilité opérationnelle avant D&A</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Marge NOPAT</div>
            <div className="text-sm text-gray-600">Marge NOPAT = NOPAT / Volume Total</div>
            <div className="text-xs text-gray-500 mt-1">Rentabilité nette d'exploitation</div>
          </div>
{/* ROI supprimé - seul ROIC affiché */}
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">ROIC (Return on Invested Capital)</div>
            <div className="text-sm text-gray-600">ROIC mensuel = NOPAT / (CAPEX + BFR - Trésorerie)</div>
            <div className="text-sm text-gray-600">ROIC annuel = (1 + ROIC mensuel)^12 - 1</div>
            <div className="text-xs text-gray-500 mt-1">Retour sur capital investi net (composé)</div>
          </div>
        </div>
      </div>

      {/* Formules DCF */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Formules DCF</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Valeur Terminale</div>
            <div className="text-sm text-gray-600">VT = FCF × (1 + g) / (WACC - g)</div>
            <div className="text-xs text-gray-500 mt-1">Valeur à perpétuité</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Enterprise Value</div>
            <div className="text-sm text-gray-600">EV = Σ(FCF actualisés) + VT actualisée</div>
            <div className="text-xs text-gray-500 mt-1">Valeur d'entreprise</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Equity Value</div>
            <div className="text-sm text-gray-600">EV = Enterprise Value - Dette + Trésorerie</div>
            <div className="text-xs text-gray-500 mt-1">Valeur des capitaux propres</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Taux d'Actualisation Mensuel</div>
            <div className="text-sm text-gray-600">r = (1 + WACC)^(1/12) - 1</div>
            <div className="text-xs text-gray-500 mt-1">Conversion annuel vers mensuel</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Payback Simple</div>
            <div className="text-sm text-gray-600">Payback = I₀ / FCF mensuel</div>
            <div className="text-xs text-gray-500 mt-1">Temps de récupération en mois</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Payback Actualisé</div>
            <div className="text-sm text-gray-600">Min T : Σ(FCF/(1+r)ᵗ) ≥ I₀</div>
            <div className="text-xs text-gray-500 mt-1">Récupération avec actualisation</div>
          </div>
        </div>
      </div>

      {/* Hypothèses */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Hypothèses Clés</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Modèle d'Affaires</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Consignation : pas d'investissement en stocks</div>
              <div>• Paiement immédiat des clients</div>
              <div>• BFR = 250,000 FCFA (one-shot initial)</div>
              <div>• CAPEX = 5,000,000 FCFA (one-shot initial)</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Paramètres Financiers</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• WACC : 12% par défaut</div>
              <div>• Croissance terminale : 3%</div>
              <div>• Taux d'imposition : 30%</div>
              <div>• Durée amortissement : 24 mois</div>
              <div>• D&A annuel = CAPEX / 24 × 12</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Calculs</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• FCF calculé en mensuel puis converti en annuel</div>
              <div>• Amortissements exclus des charges mensuelles</div>
              <div>• Marge moyenne = Σ(bénéfices) / volume total</div>
              <div>• Valeurs négatives protégées (retournent 0)</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Structure Financière</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Dette : 0 FCFA</div>
              <div>• Trésorerie : 500,000 FCFA</div>
              <div>• I₀ = CAPEX + BFR = 5,250,000 FCFA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interprétation */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">💡 Interprétation des Résultats</h4>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600 space-y-2">
            <div><strong>VAN {'>'}0 :</strong> Projet rentable, crée de la valeur</div>
            <div><strong>TRI {'>'} WACC :</strong> Projet viable, rendement supérieur au coût du capital</div>
            <div><strong>Indice de Profitabilité {'>'} 1 :</strong> Projet viable, rapport bénéfice/coût favorable</div>
            <div><strong>Payback Actualisé :</strong> Temps de récupération de l'investissement</div>
            <div><strong>FCF positif :</strong> L'entreprise génère des liquidités après investissements</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulesHypotheses; 