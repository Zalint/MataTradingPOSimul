import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const SimulateurRentabilite = () => {
  const [volume, setVolume] = useState(20000000);
  const [abatsParKg, setAbatsParKg] = useState(200);
  const [peration, setPeration] = useState(0.1);
  
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
  };

  const margeMoyenne = calculerMargeMoyenne();
  let beneficeTotal = 0;

  const produitsAvecCalculs = Object.entries(produits).map(([nom, data]) => {
    let margeBrute;
    if (data.editable && data.prixAchat && data.prixVente) {
      margeBrute = calculerMargeBrute(data);
    } else {
      margeBrute = margeMoyenne;
    }
    
    const benefice = calculerBenefice(margeBrute, data.repartition, volume);
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-8">
        
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8 pb-4 border-b-4 border-blue-500">
          🧮 Simulateur Interactif - Analyse de Rentabilité Avancée
        </h1>

        {/* Paramètres globaux */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">🎛️ Paramètres Globaux</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume point de vente</label>
              <input 
                type="number"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abats par kg (Bœuf/Veau)</label>
              <input 
                type="number"
                value={abatsParKg}
                onChange={(e) => setAbatsParKg(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded"
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
                className="w-full p-2 border border-gray-300 rounded"
              />
              <div className="text-xs text-gray-500 mt-1">{(peration * 100).toFixed(1)}%</div>
            </div>
            <div className="flex items-end">
              <button 
                onClick={resetPrix}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                🔄 Reset Tout
              </button>
            </div>
          </div>
        </div>

        {/* Validation de la répartition */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-semibold mb-2 text-orange-800">⚠️ Contrôle des Répartitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total des répartitions:</div>
              <div className={`text-lg font-bold ${
                Math.abs(Object.values(produits).reduce((sum, p) => sum + p.repartition, 0) - 1) < 0.001 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {(Object.values(produits).reduce((sum, p) => sum + p.repartition, 0) * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Écart par rapport à 100%:</div>
              <div className={`text-lg font-bold ${
                Math.abs(Object.values(produits).reduce((sum, p) => sum + p.repartition, 0) - 1) < 0.001 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {((Object.values(produits).reduce((sum, p) => sum + p.repartition, 0) - 1) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {
                  const total = Object.values(produits).reduce((sum, p) => sum + p.repartition, 0);
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
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
              >
                🔧 Normaliser à 100%
              </button>
            </div>
          </div>
        </div>

        {/* Actions rapides étendues */}
        <div className="bg-gray-100 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">⚡ Actions Rapides</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Prix de vente:</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => augmenterTousPrix(50)} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">+50</button>
                <button onClick={() => augmenterTousPrix(100)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">+100</button>
                <button onClick={() => augmenterTousPrix(200)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">+200</button>
                <button onClick={() => augmenterTousPrix(-100)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">-100</button>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Prix d'achat:</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => augmenterTousPrix(50, 'prixAchat')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">+50</button>
                <button onClick={() => augmenterTousPrix(-50, 'prixAchat')} className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">-50</button>
              </div>
            </div>
          </div>
        </div>

        {/* Résumé global */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-green-800">📊 Résumé Global</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Volume point de vente:</div>
              <div className="text-xl font-bold text-gray-800">{volume.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Bénéfice Total:</div>
              <div className="text-xl font-bold text-green-600">{Math.round(beneficeTotal).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Marge Moyenne:</div>
              <div className="text-xl font-bold text-blue-600">{(margeMoyenne * 100).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Paramètres Bœuf/Veau:</div>
              <div className="text-sm text-gray-700">Abats: {abatsParKg} | Pération: {(peration * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Histogramme des bénéfices */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">📊 Bénéfices par Produit</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Bénéfice']} />
                <Bar dataKey="benefice" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique en secteurs de la répartition */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">🥧 Répartition des Bénéfices</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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
        <div className="bg-white p-6 rounded-lg shadow-md border mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📈 Marges Brutes par Produit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nom" />
              <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Marge Brute']} />
              <Bar dataKey="marge" fill="#2ecc71" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau détaillé */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse shadow-md">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <th className="p-4 text-left">Produit</th>
                <th className="p-4 text-center">Répartition</th>
                <th className="p-4 text-center">Prix d'achat</th>
                <th className="p-4 text-center">Prix de vente</th>
                <th className="p-4 text-center">Formule</th>
                <th className="p-4 text-center">Marge brute %</th>
                <th className="p-4 text-center">Bénéfice</th>
                <th className="p-4 text-center">% du total</th>
              </tr>
            </thead>
            <tbody>
              {produitsAvecCalculs.map((produit, index) => {
                const isEditable = produit.editable;
                const pourcentageTotal = (produit.benefice / beneficeTotal) * 100;
                
                return (
                  <tr key={produit.nom} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-3 font-semibold text-gray-800">
                      {produit.nom}
                      {produit.hasAbats && <div className="text-xs text-blue-600">🥩 Avec abats</div>}
                      {!isEditable && <div className="text-xs text-gray-500">(calculé)</div>}
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={produit.repartition}
                        onChange={(e) => updatePrix(produit.nom, 'repartition', e.target.value)}
                        className="w-20 p-2 text-center border border-gray-300 rounded"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {(produit.repartition * 100).toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {isEditable ? (
                        <input 
                          type="number"
                          value={produit.prixAchat || ''}
                          onChange={(e) => updatePrix(produit.nom, 'prixAchat', e.target.value)}
                          className="w-20 p-2 text-center border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditable ? (
                        <input 
                          type="number"
                          value={produit.prixVente || ''}
                          onChange={(e) => updatePrix(produit.nom, 'prixVente', e.target.value)}
                          className="w-20 p-2 text-center border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-xs">
                      {produit.hasAbats ? (
                        <div className="text-blue-600">
                          ((PV+{abatsParKg})×(1-{(peration*100).toFixed(1)}%))/PA-1
                        </div>
                      ) : (
                        <div className="text-gray-600">PV/PA-1</div>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      <span className={
                        produit.margeBrute > 0.2 ? "text-green-600" : 
                        produit.margeBrute > 0.1 ? "text-yellow-600" : "text-red-600"
                      }>
                        {(produit.margeBrute * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-green-600">
                      {Math.round(produit.benefice).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
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

        {/* Graphiques de simulation Bœuf/Veau */}
        <div className="mt-8 space-y-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            🎯 Comparaison Stratégique - Bœuf & Veau
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>💡 Analyse Comparative:</strong> 
              <span className="text-green-700 font-medium">Augmenter les prix de vente</span> vs 
              <span className="text-blue-700 font-medium">Diminuer les prix d'achat</span> - 
              Quelle stratégie est la plus rentable ?
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Simulation augmentations */}
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-lg font-semibold mb-4 text-green-700">📈 Impact Augmentations de Prix</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={(() => {
                  const augmentations = [0, 50, 100, 150, 200];
                  return augmentations.map(aug => {
                    let beneficeTotalSimule = 0;
                    
                    Object.entries(produits).forEach(([nom, data]) => {
                      let margeBruteSimulee;
                      let prixVenteSimule = data.prixVente;
                      
                      if ((nom === 'Boeuf' || nom === 'Veau') && data.prixVente) {
                        prixVenteSimule = data.prixVente + aug;
                      }
                      
                      if (data.editable && data.prixAchat && prixVenteSimule) {
                        if (data.hasAbats) {
                          margeBruteSimulee = (((prixVenteSimule + abatsParKg) * (1 - peration)) / data.prixAchat) - 1;
                        } else {
                          margeBruteSimulee = (prixVenteSimule / data.prixAchat) - 1;
                        }
                      } else {
                        margeBruteSimulee = margeMoyenne;
                      }
                      
                      const beneficeSimule = margeBruteSimulee * data.repartition * volume;
                      beneficeTotalSimule += beneficeSimule;
                    });
                    
                    return {
                      augmentation: `+${aug}`,
                      beneficeTotal: Math.round(beneficeTotalSimule),
                      gain: Math.round(beneficeTotalSimule - beneficeTotal)
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="augmentation" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'beneficeTotal' ? value.toLocaleString() : `+${value.toLocaleString()}`,
                      name === 'beneficeTotal' ? 'Bénéfice Total' : 'Gain'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="beneficeTotal" 
                    stroke="#27ae60" 
                    strokeWidth={3}
                    dot={{ fill: '#27ae60', strokeWidth: 2, r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gain" 
                    stroke="#3498db" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#3498db', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-green-600"></div>
                    <span>Bénéfice Total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-blue-500 border-dashed"></div>
                    <span>Gain par rapport à l'actuel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulation diminutions prix d'achat */}
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-lg font-semibold mb-4 text-blue-700">📉 Impact Diminutions Prix d'Achat</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={(() => {
                  const diminutions = [0, -50, -100, -150, -200];
                  return diminutions.map(dim => {
                    let beneficeTotalSimule = 0;
                    
                    Object.entries(produits).forEach(([nom, data]) => {
                      let margeBruteSimulee;
                      let prixAchatSimule = data.prixAchat;
                      
                      if ((nom === 'Boeuf' || nom === 'Veau') && data.prixAchat) {
                        prixAchatSimule = data.prixAchat + dim;
                      }
                      
                      if (data.editable && prixAchatSimule && data.prixVente) {
                        if (data.hasAbats) {
                          margeBruteSimulee = (((data.prixVente + abatsParKg) * (1 - peration)) / prixAchatSimule) - 1;
                        } else {
                          margeBruteSimulee = (data.prixVente / prixAchatSimule) - 1;
                        }
                      } else {
                        margeBruteSimulee = margeMoyenne;
                      }
                      
                      const beneficeSimule = margeBruteSimulee * data.repartition * volume;
                      beneficeTotalSimule += beneficeSimule;
                    });
                    
                    return {
                      diminution: dim === 0 ? '0' : `${dim}`,
                      beneficeTotal: Math.round(beneficeTotalSimule),
                      gain: Math.round(beneficeTotalSimule - beneficeTotal)
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="diminution" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'beneficeTotal' ? value.toLocaleString() : `+${value.toLocaleString()}`,
                      name === 'beneficeTotal' ? 'Bénéfice Total' : 'Gain'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="beneficeTotal" 
                    stroke="#3498db" 
                    strokeWidth={3}
                    dot={{ fill: '#3498db', strokeWidth: 2, r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gain" 
                    stroke="#27ae60" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#27ae60', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-blue-500"></div>
                    <span>Bénéfice Total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-green-600 border-dashed"></div>
                    <span>Gain par rapport à l'actuel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau récapitulatif des simulations */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 Tableau Récapitulatif - Impact sur Bœuf & Veau</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Tableau augmentations */}
              <div>
                <h4 className="font-medium text-green-700 mb-3">📈 Augmentations</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="border p-2 text-left">Augmentation</th>
                      <th className="border p-2 text-right">Bénéfice Total</th>
                      <th className="border p-2 text-right">Gain</th>
                      <th className="border p-2 text-right">% Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 50, 100, 150, 200].map(aug => {
                      let beneficeTotalSimule = 0;
                      
                      Object.entries(produits).forEach(([nom, data]) => {
                        let margeBruteSimulee;
                        let prixVenteSimule = data.prixVente;
                        
                        if ((nom === 'Boeuf' || nom === 'Veau') && data.prixVente) {
                          prixVenteSimule = data.prixVente + aug;
                        }
                        
                        if (data.editable && data.prixAchat && prixVenteSimule) {
                          if (data.hasAbats) {
                            margeBruteSimulee = (((prixVenteSimule + abatsParKg) * (1 - peration)) / data.prixAchat) - 1;
                          } else {
                            margeBruteSimulee = (prixVenteSimule / data.prixAchat) - 1;
                          }
                        } else {
                          margeBruteSimulee = margeMoyenne;
                        }
                        
                        const beneficeSimule = margeBruteSimulee * data.repartition * volume;
                        beneficeTotalSimule += beneficeSimule;
                      });
                      
                      const gain = beneficeTotalSimule - beneficeTotal;
                      const pourcentageGain = (gain / beneficeTotal) * 100;
                      
                      return (
                        <tr key={aug} className={aug === 0 ? "bg-gray-100 font-medium" : ""}>
                          <td className="border p-2">+{aug}</td>
                          <td className="border p-2 text-right">{Math.round(beneficeTotalSimule).toLocaleString()}</td>
                          <td className="border p-2 text-right text-green-600">+{Math.round(gain).toLocaleString()}</td>
                          <td className="border p-2 text-right text-green-600">+{pourcentageGain.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tableau diminutions prix d'achat */}
              <div>
                <h4 className="font-medium text-blue-700 mb-3">📉 Diminutions Prix d'Achat</h4>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border p-2 text-left">Diminution PA</th>
                      <th className="border p-2 text-right">Bénéfice Total</th>
                      <th className="border p-2 text-right">Gain</th>
                      <th className="border p-2 text-right">% Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, -50, -100, -150, -200].map(dim => {
                      let beneficeTotalSimule = 0;
                      
                      Object.entries(produits).forEach(([nom, data]) => {
                        let margeBruteSimulee;
                        let prixAchatSimule = data.prixAchat;
                        
                        if ((nom === 'Boeuf' || nom === 'Veau') && data.prixAchat) {
                          prixAchatSimule = data.prixAchat + dim;
                        }
                        
                        if (data.editable && prixAchatSimule && data.prixVente) {
                          if (data.hasAbats) {
                            margeBruteSimulee = (((data.prixVente + abatsParKg) * (1 - peration)) / prixAchatSimule) - 1;
                          } else {
                            margeBruteSimulee = (data.prixVente / prixAchatSimule) - 1;
                          }
                        } else {
                          margeBruteSimulee = margeMoyenne;
                        }
                        
                        const beneficeSimule = margeBruteSimulee * data.repartition * volume;
                        beneficeTotalSimule += beneficeSimule;
                      });
                      
                      const gain = beneficeTotalSimule - beneficeTotal;
                      const pourcentageGain = (gain / beneficeTotal) * 100;
                      
                      return (
                        <tr key={dim} className={dim === 0 ? "bg-gray-100 font-medium" : ""}>
                          <td className="border p-2">{dim === 0 ? '0' : dim}</td>
                          <td className="border p-2 text-right">{Math.round(beneficeTotalSimule).toLocaleString()}</td>
                          <td className="border p-2 text-right text-green-600">+{Math.round(gain).toLocaleString()}</td>
                          <td className="border p-2 text-right text-green-600">+{pourcentageGain.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gray-100 p-4 rounded-lg text-sm text-gray-600">
          <strong>💡 Informations:</strong><br/>
          • <strong>Formule standard:</strong> Marge brute % = (Prix vente / Prix achat) - 1<br/>
          • <strong>Formule Bœuf/Veau:</strong> Marge brute % = ((Prix vente + Abats par kg) × (1 - Pération)) / Prix achat - 1<br/>
          • <strong>Bénéfice:</strong> Marge brute % × Répartition × Volume point de vente<br/>
          • <strong>Autres et Pack</strong> utilisent la marge moyenne des autres produits<br/>
          • <strong>Simulations:</strong> Comparaison entre augmentation des prix de vente (+50 à +200) et diminution des prix d'achat (-50 à -200) sur Bœuf & Veau<br/>
          • <strong>Répartitions:</strong> Somme doit égaler 100% - utilisez le bouton "Normaliser" si nécessaire<br/>
          • Couleurs des marges: 🟢 &gt;20% | 🟡 10-20% | 🔴 &lt;10%
        </div>
      </div>
    </div>
  );
};

export default SimulateurRentabilite; 