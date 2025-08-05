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
            <div className="font-medium text-gray-800 mb-2">EBIT (Earnings Before Interest and Taxes)</div>
            <div className="text-sm text-gray-600">EBIT = Bénéfice Total - Charges Opérationnelles</div>
            <div className="text-xs text-gray-500 mt-1">Bénéfice avant intérêts et impôts</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)</div>
            <div className="text-sm text-gray-600">EBITDA = EBIT + D&A</div>
            <div className="text-xs text-gray-500 mt-1">Bénéfice avant intérêts, impôts, D&A</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">NOPAT (Net Operating Profit After Taxes)</div>
            <div className="text-sm text-gray-600">NOPAT = EBIT × (1 - Taux d'imposition)</div>
            <div className="text-xs text-gray-500 mt-1">Résultat net d'exploitation après impôts</div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">FCF (Free Cash Flow)</div>
            <div className="text-sm text-gray-600">FCF = NOPAT - CAPEX</div>
            <div className="text-xs text-gray-500 mt-1">Flux de trésorerie disponible</div>
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
              <div>• BFR = 0 (pas de besoin en fonds de roulement)</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Paramètres Financiers</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• WACC : 12% par défaut</div>
              <div>• Croissance terminale : 3%</div>
              <div>• Taux d'imposition : 30%</div>
                              <div>• D&A : Charges fixes ÷ Durée amortissement × 12</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Calculs</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• FCF calculé en mensuel puis converti en annuel</div>
              <div>• Pas de double comptabilisation D&A</div>
              <div>• Valeurs négatives protégées (retournent 0)</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <div className="font-medium text-gray-800 mb-2">Structure Financière</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Dette : 5,000,000 FCFA</div>
              <div>• Trésorerie : 5,000,000 FCFA</div>
              <div>• Net : 0 FCFA (s'annulent)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interprétation */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">💡 Interprétation des Résultats</h4>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600 space-y-2">
            <div><strong>VAN > 0 :</strong> Projet rentable, crée de la valeur</div>
            <div><strong>TRI > WACC :</strong> Projet viable, rendement supérieur au coût du capital</div>
            <div><strong>Indice de Profitabilité > 1 :</strong> Projet viable, rapport bénéfice/coût favorable</div>
            <div><strong>Payback Actualisé :</strong> Temps de récupération de l'investissement</div>
            <div><strong>FCF positif :</strong> L'entreprise génère des liquidités après investissements</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulesHypotheses; 