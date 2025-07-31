import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const SimulateurRentabilite = () => {
  const [activeTab, setActiveTab] = useState('main'); // 'main' ou 'volume'
  const [volume, setVolume] = useState(20000000);
  const [abatsParKg, setAbatsParKg] = useState(200);
  const [peration, setPeration] = useState(0.1);
  
  // Nouveaux états pour la simulation de volume
  const [selectedProduct, setSelectedProduct] = useState('Poulet');
  const [additionalVolume, setAdditionalVolume] = useState(5000000);
  
  const [produits, setProduits] = useState({
    'Boeuf': {
      repartition: 0.7017824621363722,
      prixAchat: 3150,
      prixVente: 3550,
      editable: true,
      hasAbats: true
    },
    'Veau': {
      repartition: 0.04459239053187431,
      prixAchat: 3350,
      prixVente: 3900,
      editable: true,
      hasAbats: true
    },
    'Ovin': {
      repartition: 0.05224405260523153,
      prixAchat: 4000,
      prixVente: 4500,
      editable: true,
      hasAbats: false
    },
    'Poulet': {
      repartition: 0.10293212414146351,
      prixAchat: 2600,
      prixVente: 3400,
      editable: true,
      hasAbats: false
    },
    'Oeuf': {
      repartition: 0.047725982941789515,
      prixAchat: 2250,
      prixVente: 2500,
      editable: true,
      hasAbats: false
    },
    'Autres': {
      repartition: 0.036695010434228736,
      prixAchat: null,
      prixVente: null,
      editable: false,
      hasAbats: false
    },
    'Pack': {
      repartition: 0.014027977209040234,
      prixAchat: null,
      prixVente: null,
      editable: false,
      hasAbats: false
    }
  });

  // Calcul du volume ajusté pour la simulation
  const getAdjustedVolume = () => {
    if (activeTab === 'volume') {
      return volume + additionalVolume;
    }
    return volume;
  };

  // Calcul des répartitions ajustées pour la simulation
  const getAdjustedRepartitions = () => {
    if (activeTab === 'volume') {
      const adjustedProduits = { ...produits };
      const totalVolume = volume + additionalVolume;
      
      // Calculer le nouveau volume pour le produit sélectionné
      const selectedProductVolume = produits[selectedProduct].repartition * volume + additionalVolume;
      const newRepartition = selectedProductVolume / totalVolume;
      
      // Ajuster la répartition du produit sélectionné
      adjustedProduits[selectedProduct] = {
        ...adjustedProduits[selectedProduct],
        repartition: newRepartition
      };
      
      // Ajuster les répartitions des autres produits
      const otherProductsVolume = volume - (produits[selectedProduct].repartition * volume);
      Object.keys(adjustedProduits).forEach(nom => {
        if (nom !== selectedProduct) {
          const currentVolume = adjustedProduits[nom].repartition * volume;
          adjustedProduits[nom].repartition = currentVolume / totalVolume;
        }
      });
      
      return adjustedProduits;
    }
    return produits;
  };

  const calculerMargeMoyenne = () => {
    const produitsEditables = Object.entries(produits).filter(([nom, data]) => 
      data.editable && data.prixAchat && data.prixVente
    );
    const marges = produitsEditables.map(([nom, data]) => {
      if (data.hasAbats) {
        return (((data.prixVente + abatsParKg) * (1 - peration)) / data.prixAchat) - 1;
      } else {
        return (data.prixVente / data.prixAchat) - 1;
      }
    });
    return marges.length > 0 ? marges.reduce((sum, marge) => sum + marge, 0) / marges.length : 0;
  };

  const calculerMargeBrute = (produitData) => {
    if (!produitData.prixVente || !produitData.prixAchat) return 0;
    
    if (produitData.hasAbats) {
      return (((produitData.prixVente + abatsParKg) * (1 - peration)) / produitData.prixAchat) - 1;
    } else {
      return (produitData.prixVente / produitData.prixAchat) - 1;
    }
  };

  const calculerBenefice = (margeBrute, repartition, volume) => {
    return margeBrute * repartition * volume;
  };

  const updatePrix = (produit, type, valeur) => {
    setProduits(prev => ({
      ...prev,
      [produit]: {
        ...prev[produit],
        [type]: valeur === '' ? 0 : parseFloat(valeur) || 0
      }
    }));
  };

  const augmenterTousPrix = (montant, typePrix = 'prixVente') => {
    setProduits(prev => {
      const nouveauxProduits = { ...prev };
      Object.keys(nouveauxProduits).forEach(nom => {
        if (nouveauxProduits[nom].editable && nouveauxProduits[nom][typePrix]) {
          nouveauxProduits[nom][typePrix] += montant;
        }
      });
      return nouveauxProduits;
    });
  };

  const resetPrix = () => {
    setProduits({
      'Boeuf': { repartition: 0.7017824621363722, prixAchat: 3150, prixVente: 3550, editable: true, hasAbats: true },
      'Veau': { repartition: 0.04459239053187431, prixAchat: 3350, prixVente: 3900, editable: true, hasAbats: true },
      'Ovin': { repartition: 0.05224405260523153, prixAchat: 4000, prixVente: 4500, editable: true, hasAbats: false },
      'Poulet': { repartition: 0.10293212414146351, prixAchat: 2600, prixVente: 3400, editable: true, hasAbats: false },
      'Oeuf': { repartition: 0.047725982941789515, prixAchat: 2250, prixVente: 2500, editable: true, hasAbats: false },
      'Autres': { repartition: 0.036695010434228736, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
      'Pack': { repartition: 0.014027977209040234, prixAchat: null, prixVente: null, editable: false, hasAbats: false }
    });
    setVolume(20000000);
    setAbatsParKg(200);
    setPeration(0.1);
    setAdditionalVolume(5000000);
    setSelectedProduct('Poulet');
  };

  const margeMoyenne = calculerMargeMoyenne();
  const adjustedVolume = getAdjustedVolume();
  const adjustedProduits = getAdjustedRepartitions();
  let beneficeTotal = 0;

  const produitsAvecCalculs = Object.entries(adjustedProduits).map(([nom, data]) => {
    let margeBrute;
    if (data.editable && data.prixAchat && data.prixVente) {
      margeBrute = calculerMargeBrute(data);
    } else {
      margeBrute = margeMoyenne;
    }
    
    const benefice = calculerBenefice(margeBrute, data.repartition, adjustedVolume);
    beneficeTotal += benefice;
    
    return { nom, ...data, margeBrute, benefice };
  });

  const chartData = produitsAvecCalculs.map(p => ({
    nom: p.nom,
    benefice: Math.round(p.benefice),
    marge: p.margeBrute * 100,
    repartition: p.repartition * 100
  }));

  const pieColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];

  const renderMainContent = () => (
    <>
      {/* Paramètres globaux */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-800">🎛️ Paramètres Globaux</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume point de vente</label>
            <input 
              type="number"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abats par kg (Bœuf/Veau)</label>
            <input 
              type="number"
              value={abatsParKg}
              onChange={(e) => setAbatsParKg(parseFloat(e.target.value) || 0)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pération % (Bœuf/Veau)</label>
            <input 
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={peration}
              onChange={(e) => setPeration(parseFloat(e.target.value) || 0)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">{(peration * 100).toFixed(1)}%</div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={resetPrix}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm sm:text-base min-h-[44px]"
            >
              🔄 Reset Tout
            </button>
          </div>
        </div>
      </div>

      {/* Validation de la répartition */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-orange-800">⚠️ Contrôle des Répartitions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <div className="text-sm text-gray-600">Total des répartitions:</div>
            <div className={`text-base sm:text-lg font-bold ${
              Math.abs(Object.values(adjustedProduits).reduce((sum, p) => sum + p.repartition, 0) - 1) < 0.001 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {(Object.values(adjustedProduits).reduce((sum, p) => sum + p.repartition, 0) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Écart par rapport à 100%:</div>
            <div className={`text-base sm:text-lg font-bold ${
              Math.abs(Object.values(adjustedProduits).reduce((sum, p) => sum + p.repartition, 0) - 1) < 0.001 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {((Object.values(adjustedProduits).reduce((sum, p) => sum + p.repartition, 0) - 1) * 100).toFixed(2)}%
            </div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => {
                const total = Object.values(adjustedProduits).reduce((sum, p) => sum + p.repartition, 0);
                if (total > 0) {
                  setProduits(prev => {
                    const nouveauxProduits = { ...prev };
                    Object.keys(nouveauxProduits).forEach(nom => {
                      nouveauxProduits[nom].repartition = nouveauxProduits[nom].repartition / total;
                    });
                    return nouveauxProduits;
                  });
                }
              }}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm min-h-[44px]"
            >
              🔧 Normaliser à 100%
            </button>
          </div>
        </div>
      </div>

      {/* Actions rapides étendues */}
      <div className="bg-gray-100 p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-700">⚡ Actions Rapides</h3>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">Prix de vente:</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => augmenterTousPrix(50)} className="px-3 py-2 sm:px-4 sm:py-3 bg-green-500 text-white rounded text-sm hover:bg-green-600 min-h-[44px] min-w-[60px]">+50</button>
              <button onClick={() => augmenterTousPrix(100)} className="px-3 py-2 sm:px-4 sm:py-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 min-h-[44px] min-w-[60px]">+100</button>
              <button onClick={() => augmenterTousPrix(200)} className="px-3 py-2 sm:px-4 sm:py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600 min-h-[44px] min-w-[60px]">+200</button>
              <button onClick={() => augmenterTousPrix(-100)} className="px-3 py-2 sm:px-4 sm:py-3 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 min-h-[44px] min-w-[60px]">-100</button>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">Prix d'achat:</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => augmenterTousPrix(50, 'prixAchat')} className="px-3 py-2 sm:px-4 sm:py-3 bg-green-600 text-white rounded text-sm hover:bg-green-700 min-h-[44px] min-w-[60px]">+50</button>
              <button onClick={() => augmenterTousPrix(-50, 'prixAchat')} className="px-3 py-2 sm:px-4 sm:py-3 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 min-h-[44px] min-w-[60px]">-50</button>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé global */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📊 Résumé Global</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <div className="text-sm text-gray-600">Volume point de vente:</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800">{adjustedVolume.toLocaleString()}</div>
            {activeTab === 'volume' && (
              <div className="text-xs text-blue-600">(+{additionalVolume.toLocaleString()})</div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600">Bénéfice Total:</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">{Math.round(beneficeTotal).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Marge Moyenne:</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">{(margeMoyenne * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Paramètres Bœuf/Veau:</div>
            <div className="text-sm text-gray-700">Abats: {abatsParKg} | Pération: {(peration * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </>
  );

  const renderVolumeSimulationContent = () => (
    <>
      {/* Paramètres de simulation de volume */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-purple-800">📈 Simulation Augmentation Volume Produit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit à augmenter</label>
            <select 
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            >
              {Object.keys(produits).filter(nom => produits[nom].editable).map(nom => (
                <option key={nom} value={nom}>{nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume à ajouter</label>
            <input 
              type="number"
              value={additionalVolume}
              onChange={(e) => setAdditionalVolume(parseFloat(e.target.value) || 0)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="flex items-end">
            <div className="w-full p-2 sm:p-3 bg-purple-100 rounded text-sm">
              <div className="text-purple-800 font-medium">Volume total: {adjustedVolume.toLocaleString()}</div>
              <div className="text-purple-600 text-xs">Base: {volume.toLocaleString()} + Ajout: {additionalVolume.toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        {/* Aperçu des changements */}
        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="text-sm font-semibold text-purple-800 mb-2">📊 Aperçu des Changements</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Volume {selectedProduct}:</div>
              <div className="text-sm">
                <span className="text-gray-500">Avant: </span>
                <span className="font-medium">{(produits[selectedProduct].repartition * volume).toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">Après: </span>
                <span className="font-medium text-green-600">{(adjustedProduits[selectedProduct].repartition * adjustedVolume).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Répartition {selectedProduct}:</div>
              <div className="text-sm">
                <span className="text-gray-500">Avant: </span>
                <span className="font-medium">{(produits[selectedProduct].repartition * 100).toFixed(2)}%</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">Après: </span>
                <span className="font-medium text-green-600">{(adjustedProduits[selectedProduct].repartition * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu identique au premier onglet mais avec les données ajustées */}
      {renderMainContent()}
    </>
  );

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6 md:mb-8 pb-2 sm:pb-3 md:pb-4 border-b-2 sm:border-b-3 md:border-b-4 border-blue-500">
          🧮 Simulateur Interactif - Analyse de Rentabilité Avancée
        </h1>

        {/* Onglets */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'main'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Simulation Principale
          </button>
          <button
            onClick={() => setActiveTab('volume')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'volume'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📈 Simulation Volume Produit
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'main' ? renderMainContent() : renderVolumeSimulationContent()}

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Histogramme des bénéfices */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">📊 Bénéfices par Produit</h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Bénéfice']} />
                <Bar dataKey="benefice" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique en secteurs de la répartition */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">🥧 Répartition des Bénéfices</h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="benefice"
                  label={({nom, percent}) => `${nom}: ${(percent * 100).toFixed(1)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Bénéfice']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique des marges */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border mb-4 sm:mb-6 md:mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">📈 Marges Brutes par Produit</h3>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Marge Brute']} />
              <Bar dataKey="marge" fill="#2ecc71" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau détaillé - Version mobile optimisée */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Produit</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Répartition</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Prix A</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Prix V</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Marge %</th>
                    <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Bénéfice</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {produitsAvecCalculs.map((produit, index) => {
                    const isEditable = produit.editable;
                    const pourcentageTotal = (produit.benefice / beneficeTotal) * 100;
                    
                    return (
                      <tr key={produit.nom} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800">
                          <div>{produit.nom}</div>
                          {produit.hasAbats && <div className="text-xs text-blue-600">🥩 Avec abats</div>}
                          {!isEditable && <div className="text-xs text-gray-500">(calculé)</div>}
                          {activeTab === 'volume' && produit.nom === selectedProduct && (
                            <div className="text-xs text-purple-600">📈 Volume augmenté</div>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <input 
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
                            value={produit.repartition}
                            onChange={(e) => updatePrix(produit.nom, 'repartition', e.target.value)}
                            className="w-16 sm:w-20 p-1 sm:p-2 text-center border border-gray-300 rounded text-xs sm:text-sm"
                            style={{ fontSize: '16px' }}
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {(produit.repartition * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          {isEditable ? (
                            <input 
                              type="number"
                              value={produit.prixAchat || ''}
                              onChange={(e) => updatePrix(produit.nom, 'prixAchat', e.target.value)}
                              className="w-16 sm:w-20 p-1 sm:p-2 text-center border border-gray-300 rounded text-xs sm:text-sm"
                              style={{ fontSize: '16px' }}
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          {isEditable ? (
                            <input 
                              type="number"
                              value={produit.prixVente || ''}
                              onChange={(e) => updatePrix(produit.nom, 'prixVente', e.target.value)}
                              className="w-16 sm:w-20 p-1 sm:p-2 text-center border border-gray-300 rounded text-xs sm:text-sm"
                              style={{ fontSize: '16px' }}
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <span className={`text-xs sm:text-sm font-bold ${
                            produit.margeBrute > 0.2 ? "text-green-600" : 
                            produit.margeBrute > 0.1 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {(produit.margeBrute * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <div className="text-xs sm:text-sm font-bold text-green-600">
                            {Math.round(produit.benefice).toLocaleString()}
                          </div>
                          <div className={`px-1 sm:px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                            pourcentageTotal > 50 ? 'bg-red-500' : 
                            pourcentageTotal > 20 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}>
                            {pourcentageTotal.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 bg-gray-100 p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-gray-600">
          <strong>💡 Informations:</strong><br/>
          • <strong>Formule standard:</strong> Marge brute % = (Prix vente / Prix achat) - 1<br/>
          • <strong>Formule Bœuf/Veau:</strong> Marge brute % = ((Prix vente + Abats par kg) × (1 - Pération)) / Prix achat - 1<br/>
          • <strong>Bénéfice:</strong> Marge brute % × Répartition × Volume point de vente<br/>
          • <strong>Autres et Pack</strong> utilisent la marge moyenne des autres produits<br/>
          • <strong>Simulation Volume:</strong> Augmente le volume d'un produit spécifique et ajuste automatiquement les répartitions<br/>
          • <strong>Répartitions:</strong> Somme doit égaler 100% - utilisez le bouton "Normaliser" si nécessaire<br/>
          • Couleurs des marges: 🟢 &gt;20% | 🟡 10-20% | 🔴 &lt;10%
        </div>
      </div>
    </div>
  );
};

export default SimulateurRentabilite; 