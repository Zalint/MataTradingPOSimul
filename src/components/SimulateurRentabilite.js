import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FormulesHypotheses from './FormulesHypotheses';

// Fonctions utilitaires pour la gestion des cookies
const setCookie = (name, value, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const SimulateurRentabilite = () => {
  // Debug: Vérifier les variables d'environnement au démarrage
  console.log('🚀 DEBUG - Variables d\'environnement au démarrage:');
  // API key logging removed for security
  console.log('🔑 Toutes les variables env:', process.env);
  
  // États d'authentification avec persistence des cookies
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedAuth = getCookie('mata_authenticated');
    return savedAuth === 'true';
  });
  const [username, setUsername] = useState(() => {
    return getCookie('mata_username') || '';
  });
  const [password, setPassword] = useState(() => {
    return getCookie('mata_password') || '';
  });
  const [loginError, setLoginError] = useState('');

  // Tous les autres hooks doivent être déclarés avant toute condition
  const mainContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'volume', 'charges', 'dcf', 'dcfSimulation', 'solver' ou 'faq'
  const [pageFluxDCF, setPageFluxDCF] = useState(1);
  const [pageFluxDCFSimulation, setPageFluxDCFSimulation] = useState(1);
  const [itemsPerPage] = useState(12);
  const [volume, setVolume] = useState('20000000');
  const [gainProduitsNobleFoieYellParKg, setGainProduitsNobleFoieYellParKg] = useState('200');
  const [peration, setPeration] = useState('0.13');
  
  // Nouveaux états pour la simulation de volume
  const [selectedProduct, setSelectedProduct] = useState('Poulet');
  const [additionalVolume, setAdditionalVolume] = useState('0');
  
  // État pour le produit sélectionné pour les variations de prix
  const [selectedProductForPricing, setSelectedProductForPricing] = useState('Tous');
  
  // États pour l'interprétation IA
  const [interpretationVisible, setInterpretationVisible] = useState(false);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [interpretationText, setInterpretationText] = useState('');
  
  // États pour l'analyse contextuelle (seconde analyse)
  const [analyseContextuelleVisible, setAnalyseContextuelleVisible] = useState(false);
  const [analyseContextuelleLoading, setAnalyseContextuelleLoading] = useState(false);
  const [analyseContextuelleText, setAnalyseContextuelleText] = useState('');
  const [contexteSupplementaire, setContexteSupplementaire] = useState('');
  
  // États pour l'analyse complète personnalisée
  const [analyseCompleteVisible, setAnalyseCompleteVisible] = useState(false);
  const [analyseCompleteLoading, setAnalyseCompleteLoading] = useState(false);
  const [analyseCompleteText, setAnalyseCompleteText] = useState('');
  const [contextePersonnalise, setContextePersonnalise] = useState('');
  
  // État pour le modèle ChatGPT sélectionné
  const [modeleChatGPT, setModeleChatGPT] = useState('gpt-4o-mini');
  
  // État pour afficher les données clés
  const [keyDataVisible, setKeyDataVisible] = useState(false);
  
  // État pour contrôler la visibilité globale des analyses IA
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  
  // État pour l'explication de la marge
  const [margeExplicationVisible, setMargeExplicationVisible] = useState(false);
  
  // État pour l'explication du bénéfice net
  const [beneficeExplicationVisible, setBeneficeExplicationVisible] = useState(false);

  // États pour le Solveur (Goal Seek)
  const [solverConstraints, setSolverConstraints] = useState({
    beneficeNet: { fixed: false, value: '' },
    margeBoeuf: { fixed: false, value: '' },
    margeVeau: { fixed: false, value: '' },
    margeOvin: { fixed: false, value: '' },
    margePoulet: { fixed: false, value: '' },
    margeOeuf: { fixed: false, value: '' },
    volumeMensuel: { fixed: false, value: '' },
    chargesTotales: { fixed: false, value: '' },
    peration: { fixed: false, value: '' },
    gainProduitsNobleFoieYellParKg: { fixed: false, value: '' }
  });
  const [solverVariable, setSolverVariable] = useState('chargesTotales'); // Variable à résoudre
  const [solverResult, setSolverResult] = useState(null);
  const [solverLoading, setSolverLoading] = useState(false);
  const [solverIterations, setSolverIterations] = useState([]);

  // Fonction pour mettre à jour les valeurs par défaut du solveur avec les vraies marges
  const updateSolverDefaults = () => {
    const vraiesMarges = {};
    Object.entries(produits).forEach(([nom, data]) => {
      if (data.editable && data.prixAchat && data.prixVente) {
        if (data.hasAbats) {
          vraiesMarges[`marge${nom}`] = ((data.prixVente * (1 - getNumericPeration()) + getNumericGainProduitsNobleFoieYellParKg()) / data.prixAchat - 1) * 100;
        } else {
          vraiesMarges[`marge${nom}`] = ((data.prixVente / data.prixAchat) - 1) * 100;
        }
      }
    });

    setSolverConstraints(prev => ({
      ...prev,
      margeBoeuf: { ...prev.margeBoeuf, value: vraiesMarges.margeBoeuf ? vraiesMarges.margeBoeuf.toFixed(2) : '' },
      margeVeau: { ...prev.margeVeau, value: vraiesMarges.margeVeau ? vraiesMarges.margeVeau.toFixed(2) : '' },
      margeOvin: { ...prev.margeOvin, value: vraiesMarges.margeOvin ? vraiesMarges.margeOvin.toFixed(2) : '' },
      margePoulet: { ...prev.margePoulet, value: vraiesMarges.margePoulet ? vraiesMarges.margePoulet.toFixed(2) : '' },
      margeOeuf: { ...prev.margeOeuf, value: vraiesMarges.margeOeuf ? vraiesMarges.margeOeuf.toFixed(2) : '' },
      peration: { ...prev.peration, value: getNumericPeration() ? (getNumericPeration() * 100).toFixed(2) : '' },
              gainProduitsNobleFoieYellParKg: { ...prev.gainProduitsNobleFoieYellParKg, value: getNumericGainProduitsNobleFoieYellParKg() ? getNumericGainProduitsNobleFoieYellParKg().toString() : '' }
    }));
  };

  // Fonction pour vérifier et ajuster la variable à résoudre si elle devient fixe
  const checkAndAdjustSolverVariable = (newConstraints) => {
    if (newConstraints[solverVariable] && newConstraints[solverVariable].fixed) {
      // La variable actuellement sélectionnée est maintenant fixe, on doit en choisir une autre
      const availableVariables = Object.entries(newConstraints)
        .filter(([key, constraint]) => !constraint.fixed)
        .map(([key]) => key);
      
      if (availableVariables.length > 0) {
        setSolverVariable(availableVariables[0]);
      }
    }
  };

  // Fonction pour générer l'explication détaillée de la marge moyenne sur ventes
  const genererExplicationMarge = () => {
    const produitsActuels = getNumericAdditionalVolume() > 0 ? getAdjustedRepartitions() : produits;
    const volumeActuel = getNumericAdditionalVolume() > 0 ? getAdjustedVolume() : getNumericVolume();
    const estSimulation = getNumericAdditionalVolume() > 0;
    
    let beneficeTotal = 0;
    const detailsProduits = [];
    
    // Utiliser la nouvelle fonction calculerAgregats pour obtenir les détails par produit
    const agregats = calculerAgregats();
    
    // Traiter chaque produit avec ses métriques calculées
    Object.entries(produitsActuels).forEach(([nom, data]) => {
      const metriques = agregats.detailsProduits[nom] || { benefice: 0, margeBrute: 0 };
      
      let calculDetail = '';
      const volumeProduit = data.repartition * volumeActuel;
      
      if (data.editable && data.prixAchat && data.prixVente) {
        if (data.hasAbats) {
          calculDetail = `CA: ${Math.round(volumeProduit).toLocaleString()} → Bénéfice: ${Math.round(metriques.benefice).toLocaleString()} FCFA`;
        } else {
          calculDetail = `CA: ${Math.round(volumeProduit).toLocaleString()} → Bénéfice: ${Math.round(metriques.benefice).toLocaleString()} FCFA`;
        }
      } else {
        calculDetail = `Produit non-éditable → Bénéfice: ${Math.round(metriques.benefice).toLocaleString()} FCFA`;
      }
      
      beneficeTotal += metriques.benefice;
      
      detailsProduits.push({
        nom,
        repartition: data.repartition,
        repartitionPourcentage: (data.repartition * 100).toFixed(2),
        marge: metriques.margeBrute,
        margePourcentage: (metriques.margeBrute * 100).toFixed(2),
        benefice: metriques.benefice,
        beneficeArrondi: Math.round(metriques.benefice),
        calculDetail,
        volumeProduit: Math.round(volumeProduit),
        hasAbats: data.hasAbats,
        prixAchat: data.prixAchat,
        prixVente: data.prixVente,
        estEditable: data.editable && data.prixAchat && data.prixVente
      });
    });

    // Marge moyenne sur ventes = beneficeTotal / volumeTotal
    const margeFinale = volumeActuel > 0 ? beneficeTotal / volumeActuel : 0;

    return {
      estSimulation,
      volumeTotal: volumeActuel,
      volumeOriginal: getNumericVolume(),
      volumeAjoute: getNumericAdditionalVolume(),
      produitAjoute: selectedProduct,
      margeFinale,
      margeFinalePourcentage: (margeFinale * 100).toFixed(2),
      beneficeTotal,
      detailsProduits,
      parametres: {
        peration: getNumericPeration(),
        perationPourcentage: (getNumericPeration() * 100).toFixed(1),
        abatsParKg: getNumericGainProduitsNobleFoieYellParKg()
      }
    };
  };

  // État pour garder les prix originaux pour les graphiques de sensibilité
  const [produitsOriginaux] = useState({
    'Boeuf': { repartition: 0.701782462, prixAchat: 3150, prixVente: 3550, editable: true, hasAbats: true },
    'Veau': { repartition: 0.044592391, prixAchat: 3350, prixVente: 3900, editable: true, hasAbats: true },
    'Ovin': { repartition: 0.052244053, prixAchat: 4000, prixVente: 4500, editable: true, hasAbats: false },
    'Oeuf': { repartition: 0.0477725983, prixAchat: 2250, prixVente: 2500, editable: true, hasAbats: false },
    'Autres': { repartition: 0.03669501, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
    'Pack': { repartition: 0.014027977, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
    'Poulet': { repartition: 0.102932124, prixAchat: 2600, prixVente: 3400, editable: true, hasAbats: false }
  });
  
  // États pour les charges
  const [chargesFixes, setChargesFixes] = useState('0');
  const [dureeAmortissement, setDureeAmortissement] = useState('24'); // Durée en mois
  const [amortissementAnnuel, setAmortissementAnnuel] = useState('2500000'); // Amortissement fixe par an
  const [salaire, setSalaire] = useState('250000');
  const [electricite, setElectricite] = useState('25000');
  const [eau, setEau] = useState('5000');
  const [internet, setInternet] = useState('10000');
  const [sacsLivraison, setSacsLivraison] = useState('30000');
  const [chargesTransport, setChargesTransport] = useState('150000');
  const [loyer, setLoyer] = useState('250000');
  const [autresCharges, setAutresCharges] = useState('0');
  
  // États pour le DCF
  const [tauxActualisationAnnuel, setTauxActualisationAnnuel] = useState('12'); // 12% par défaut
  const [dureeAnalyse, setDureeAnalyse] = useState('60'); // 5 ans par défaut
  
  // États pour le DCF avancé
  const [capex, setCapex] = useState('5000000'); // 5M par défaut
  const [bfr, setBfr] = useState('250000'); // 250K par défaut
  const [wacc, setWacc] = useState('12'); // 12% par défaut (corrigé)
  const [croissanceTerminale, setCroissanceTerminale] = useState('3'); // 3% par défaut
  const [dette, setDette] = useState('0'); // 0 par défaut
  const [tresorerie, setTresorerie] = useState('500000'); // 500K par défaut
  const [tauxImposition, setTauxImposition] = useState('30'); // 30% par défaut
  const [depreciationAmortissement, setDepreciationAmortissement] = useState(''); // Calculé automatiquement
  
  // États pour les formules personnalisées
  const [formulesPersonnalisees, setFormulesPersonnalisees] = useState({
    ebitda: 'beneficeTotal - chargesMensuelles',
    ebit: 'ebitda - daMensuel',
    nopat: 'ebit * (1 - tauxImposition / 100)',
    fcfMensuel: 'nopat + daMensuel',
    fcfAnnuel: 'fcfMensuel * 12',
    roicMensuel: 'nopat / (capex + bfr - tresorerie)',
    roicAnnuel: 'Math.pow(1 + roicMensuel, 12) - 1',
    beneficeNetMensuel: 'beneficeTotal - chargesTotales',
    vanFluxOperationnels: '0', // Sera calculé avec boucle DCF
    vanValeurTerminale: 'valeurTerminale / Math.pow(1 + tauxActualisation, dureeAnalyse)',
    investissementInitial: 'capex + bfr',
    van: 'vanFluxOperationnels + vanValeurTerminale - investissementInitial'
  });
  const [editeurFormuleVisible, setEditeurFormuleVisible] = useState(false);
  
  // Charger les formules sauvegardées au démarrage
  useEffect(() => {
    const savedFormules = getCookie('mata_formules_personnalisees');
    if (savedFormules) {
      try {
        const formules = JSON.parse(savedFormules);
        // S'assurer que toutes les nouvelles formules sont présentes (rétrocompatibilité)
        if (!formules.van) {
          formules.van = 'vanFluxOperationnels + vanValeurTerminale - investissementInitial';
        }
        if (!formules.vanFluxOperationnels) {
          formules.vanFluxOperationnels = '0'; // Sera calculé avec boucle DCF
        }
        if (!formules.vanValeurTerminale) {
          formules.vanValeurTerminale = 'valeurTerminale / Math.pow(1 + tauxActualisation, dureeAnalyse)';
        }
        if (!formules.investissementInitial) {
          formules.investissementInitial = 'capex + bfr';
        }
        setFormulesPersonnalisees(formules);
        console.log('📐 Formules personnalisées chargées depuis le cookie');
      } catch (error) {
        console.error('❌ Erreur lors du chargement des formules:', error);
      }
    } else {
      // Si aucune formule sauvegardée, s'assurer que VAN est dans l'état par défaut
      setFormulesPersonnalisees(prev => ({
        ...prev,
        van: prev.van || 'vanFluxOperationnels + vanValeurTerminale - investissementInitial'
      }));
    }
  }, []);
  
  const [produits, setProduits] = useState({
    'Boeuf': {
      repartition: 0.701782462,
      prixAchat: 3150,
      prixVente: 3550,
      editable: true,
      hasAbats: true
    },
    'Veau': {
      repartition: 0.044592391,
      prixAchat: 3350,
      prixVente: 3900,
      editable: true,
      hasAbats: true
    },
    'Ovin': {
      repartition: 0.052244053,
      prixAchat: 4000,
      prixVente: 4500,
      editable: true,
      hasAbats: false
    },
    'Oeuf': {
      repartition: 0.0477725983,
      prixAchat: 2250,
      prixVente: 2500,
      editable: true,
      hasAbats: false
    },
    'Autres': {
      repartition: 0.03669501,
      prixAchat: null,
      prixVente: null,
      editable: false,
      hasAbats: false
    },
    'Pack': {
      repartition: 0.014027977,
      prixAchat: null,
      prixVente: null,
      editable: false,
      hasAbats: false
    },
    'Poulet': {
      repartition: 0.102932124,
      prixAchat: 2600,
      prixVente: 3400,
      editable: true,
      hasAbats: false
    }
  });

  // Fonctions helper pour convertir les chaînes en nombres
  const getNumericValue = (value) => parseFloat(value) || 0;
  
  // Fonction pour formater les millions
  const formatMillions = (value) => {
    const numValue = typeof value === 'string' ? getNumericValue(value) : value;
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(0)}K`;
    }
    return numValue.toLocaleString();
  };
  const getNumericVolume = () => getNumericValue(volume);
  const getNumericGainProduitsNobleFoieYellParKg = () => getNumericValue(gainProduitsNobleFoieYellParKg);
  const getNumericPeration = () => getNumericValue(peration);
  const getNumericAdditionalVolume = () => getNumericValue(additionalVolume);
  const getNumericChargesFixes = () => getNumericValue(chargesFixes);
  const getNumericDureeAmortissement = () => getNumericValue(dureeAmortissement);
  const getNumericSalaire = () => getNumericValue(salaire);
  const getNumericElectricite = () => getNumericValue(electricite);
  const getNumericEau = () => getNumericValue(eau);
  const getNumericInternet = () => getNumericValue(internet);
  const getNumericSacsLivraison = () => getNumericValue(sacsLivraison);
  const getNumericChargesTransport = () => getNumericValue(chargesTransport);
  const getNumericLoyer = () => getNumericValue(loyer);
  const getNumericAutresCharges = () => getNumericValue(autresCharges);
  const getNumericAmortissementAnnuel = () => getNumericValue(amortissementAnnuel);
  const getNumericTauxActualisationAnnuel = () => getNumericValue(tauxActualisationAnnuel);
  const getNumericDureeAnalyse = () => getNumericValue(dureeAnalyse);
  const getNumericCapex = () => getNumericValue(capex);
  const getNumericBfr = () => getNumericValue(bfr);
  const getNumericWacc = () => getNumericValue(wacc);
  const getNumericCroissanceTerminale = () => getNumericValue(croissanceTerminale);
  const getNumericDette = () => getNumericValue(dette);
  const getNumericTresorerie = () => getNumericValue(tresorerie);
  const getNumericTauxImposition = () => getNumericValue(tauxImposition);
  // Fonction pour calculer automatiquement le DA basé sur les charges fixes et durée d'amortissement
  const calculerDAAutomatique = () => {
    const chargesFixes = getNumericChargesFixes();
    const dureeAmortissement = getNumericDureeAmortissement();
    
    if (chargesFixes > 0 && dureeAmortissement > 0) {
      // DA = Charges fixes / Durée amortissement (mois) * 12
      return (chargesFixes / dureeAmortissement) * 12;
    }
    
    // Valeur par défaut si pas de calcul possible
    return 1250000;
  };

  const getNumericDepreciationAmortissement = () => {
    // D&A = CAPEX / durée d'amortissement (en mois) × 12 pour obtenir l'annuel
    const capex = getNumericCapex();
    const duree = getNumericDureeAmortissement();
    if (capex > 0 && duree > 0) {
      return (capex / duree) * 12; // Conversion en annuel
    }
    // Fallback vers la valeur manuelle si définie
    return getNumericAmortissementAnnuel();
  };

  // Calcul du volume ajusté pour la simulation
  const getAdjustedVolume = () => {
    if (getNumericAdditionalVolume() > 0) {
      return getNumericVolume() + getNumericAdditionalVolume();
    }
    return getNumericVolume();
  };

  // Répartitions originales (fixes)
  const originalRepartitions = {
    'Boeuf': 0.701782462,
    'Veau': 0.044592391,
    'Ovin': 0.052244053,
    'Oeuf': 0.0477725983,
    'Autres': 0.03669501,
    'Pack': 0.014027977,
    'Poulet': 0.102932124
  };

  // Calcul des répartitions ajustées pour la simulation
  const getAdjustedRepartitions = () => {
    if (getNumericAdditionalVolume() > 0) {
      const adjustedProduits = { ...produits };
      const totalVolume = getNumericVolume() + getNumericAdditionalVolume();
      
      // Calculer les volumes absolus de chaque produit
      const volumes = {};
      Object.keys(adjustedProduits).forEach(nom => {
        if (nom === selectedProduct) {
          // Pour le produit sélectionné : volume original + volume ajouté
          volumes[nom] = originalRepartitions[nom] * getNumericVolume() + getNumericAdditionalVolume();
        } else {
          // Pour les autres produits : volume original (inchangé)
          volumes[nom] = originalRepartitions[nom] * getNumericVolume();
        }
      });
      
      // Calculer les nouvelles répartitions basées sur les volumes absolus
      Object.keys(adjustedProduits).forEach(nom => {
        adjustedProduits[nom].repartition = volumes[nom] / totalVolume;
      });
      
      return adjustedProduits;
    }
    return produits;
  };

  const calculerMargeMoyenne = () => {
    const agregats = calculerAgregats();
    console.log('🔍 CALCUL MARGE MOYENNE - Utilisation nouvelles formules');
    console.log(`🎯 RÉSULTAT: ${(agregats.margeMoyenne * 100).toFixed(2)}%`);
    return agregats.margeMoyenne;
  };

  const calculerMargeBrute = (produitData) => {
    if (!produitData.prixVente || !produitData.prixAchat) return 0;
    
    // Markup (PV-PA)/PA harmonisé avec calculerMetriquesProduit
    if (produitData.hasAbats) {
      return ((produitData.prixVente * (1 - getNumericPeration()) + getNumericGainProduitsNobleFoieYellParKg()) / produitData.prixAchat) - 1;
    } else {
      return (produitData.prixVente / produitData.prixAchat) - 1;
    }
  };

  // ==========================================
  // NOUVELLES FORMULES FINANCIÈRES STANDARDISÉES
  // ==========================================

  // 1) Calcul par produit selon les nouvelles formules
  const calculerMetriquesProduit = (produitData, nom, volumeTotal) => {
    // CA_p = volumeTotal * repartitionProduits[p].repartition
    const CA_p = volumeTotal * produitData.repartition;
    
    // Pour les produits non-éditables (pas de prix), retourner des valeurs nulles
    if (!produitData.editable || !produitData.prixAchat || !produitData.prixVente) {
      return {
        CA_p,
        COGS_p: 0,
        Abats_p: 0,
        Pertes_p: 0,
        benefice: 0,
        margeBrute: 0
      };
    }
    
    // COGS_p = CA_p * (prixAchat / prixVente)
    const COGS_p = CA_p * (produitData.prixAchat / produitData.prixVente);
    
    // Abats_p = (hasAbats ? (abatsParKg * CA_p / prixVente) : 0)
    const Abats_p = produitData.hasAbats ? 
      (getNumericGainProduitsNobleFoieYellParKg() * CA_p / produitData.prixVente) : 0;
    
    // Pertes_p = peration * CA_p (uniquement pour les produits à carcasse)
    const Pertes_p = produitData.hasAbats ? (getNumericPeration() * CA_p) : 0;
    
    // benefice = max(0, CA_p - COGS_p - Pertes_p + Abats_p)
    const benefice = Math.max(0, CA_p - COGS_p - Pertes_p + Abats_p);
    
    // margeBrute = markup (PV-PA)/PA pour harmoniser avec les calculs existants
    let margeBrute = 0;
    if (produitData.editable && produitData.prixAchat && produitData.prixVente) {
      if (produitData.hasAbats) {
        // Pour les produits à abats : ((PV × (1-peration) + abats) / PA) - 1
        margeBrute = ((produitData.prixVente * (1 - getNumericPeration()) + getNumericGainProduitsNobleFoieYellParKg()) / produitData.prixAchat) - 1;
      } else {
        // Pour les autres produits : (PV / PA) - 1
        margeBrute = (produitData.prixVente / produitData.prixAchat) - 1;
      }
    }
    
    return {
      CA_p,
      COGS_p,
      Abats_p,
      Pertes_p,
      benefice,
      margeBrute
    };
  };

  // 2) Agrégats
  const calculerAgregats = () => {
    const volumeTotal = getNumericVolume() + getNumericAdditionalVolume();
    const produitsActuels = getNumericAdditionalVolume() > 0 ? getAdjustedRepartitions() : produits;
    
    // ÉTAPE 1: Calculer d'abord les produits éditables pour obtenir margeMoyenneVentes
    let beneficeTotalEditables = 0;
    let volumeTotalEditables = 0;
    const detailsProduitsEditables = {};
    
    Object.entries(produitsActuels).forEach(([nom, data]) => {
      if (data.editable && data.prixAchat && data.prixVente) {
        const metriques = calculerMetriquesProduit(data, nom, volumeTotal);
        detailsProduitsEditables[nom] = metriques;
        beneficeTotalEditables += metriques.benefice;
        volumeTotalEditables += metriques.CA_p;
      }
    });
    
    // margeMoyenneVentes des produits éditables seulement
    const margeMoyenneVentesEditables = volumeTotalEditables > 0 ? 
      beneficeTotalEditables / volumeTotalEditables : 0;
    
    console.log(`📊 MARGE MOYENNE VENTES ÉDITABLES: ${(margeMoyenneVentesEditables * 100).toFixed(2)}%`);
    console.log(`💰 Bénéfice éditables: ${beneficeTotalEditables.toLocaleString()} FCFA`);
    console.log(`📦 Volume éditables: ${volumeTotalEditables.toLocaleString()} FCFA`);
    
    // ÉTAPE 2: Calculer tous les produits (éditables + non-éditables avec margeMoyenneVentesEditables)
    let beneficeTotal = 0;
    const detailsProduits = {};
    
    Object.entries(produitsActuels).forEach(([nom, data]) => {
      if (data.editable && data.prixAchat && data.prixVente) {
        // Produits éditables: utiliser le calcul normal
        const metriques = calculerMetriquesProduit(data, nom, volumeTotal);
        detailsProduits[nom] = metriques;
        beneficeTotal += metriques.benefice;
      } else {
        // Produits non-éditables (Autres, Pack): utiliser margeMoyenneVentesEditables
        const CA_p = volumeTotal * data.repartition;
        const benefice = CA_p * margeMoyenneVentesEditables;
        
        console.log(`🔧 ${nom}: CA=${CA_p.toLocaleString()}, Marge=${(margeMoyenneVentesEditables*100).toFixed(2)}%, Bénéfice=${benefice.toLocaleString()}`);
        
        detailsProduits[nom] = {
          CA_p,
          COGS_p: 0,
          Abats_p: 0,
          Pertes_p: 0,
          benefice,
          margeBrute: margeMoyenneVentesEditables
        };
        beneficeTotal += benefice;
      }
    });
      
    // margeMoyenne = moyenne pondérée des markups (PV-PA)/PA
    let margeMoyenne = 0;
    Object.entries(produitsActuels).forEach(([nom, data]) => {
      let markup = 0;
      if (data.editable && data.prixAchat && data.prixVente) {
      if (data.hasAbats) {
          markup = ((data.prixVente * (1 - getNumericPeration()) + getNumericGainProduitsNobleFoieYellParKg()) / data.prixAchat) - 1;
      } else {
          markup = (data.prixVente / data.prixAchat) - 1;
        }
      }
      margeMoyenne += markup * data.repartition;
    });
    
    // margeMoyenneVentes = beneficeTotal / volumeTotal (marge sur ventes)
    const margeMoyenneVentes = volumeTotal > 0 ? beneficeTotal / volumeTotal : 0;
    
    return {
      volumeTotal,
      beneficeTotal,
      margeMoyenne,
      margeMoyenneVentes,
      detailsProduits
    };
  };

  // 3) Charges et résultats d'exploitation (mensualisés)
  const calculerChargesEtResultats = () => {
    const agregats = calculerAgregats();
    
    // chargesMensuelles = charges détaillées (déjà mensuelles)
    const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + 
                             getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + 
                             getNumericLoyer() + getNumericAutresCharges();
    
    // daMensuel = depreciationAmortissement / 12
    const daMensuel = getNumericDepreciationAmortissement() / 12;
    
    // Variables disponibles pour les formules personnalisées
    const variables = {
      beneficeTotal: agregats.beneficeTotal,
      chargesMensuelles,
      chargesTotales: chargesMensuelles, // Alias pour compatibilité
      daMensuel,
      tauxImposition: getNumericTauxImposition(),
      capex: getNumericCapex(),
      bfr: getNumericBfr(),
      tresorerie: getNumericTresorerie()
    };
    
    // Calculer EBITDA (avec formule personnalisée si définie)
    let ebitda;
    if (formulesPersonnalisees.ebitda && formulesPersonnalisees.ebitda.trim()) {
      try {
        ebitda = evaluerFormule(formulesPersonnalisees.ebitda, variables);
      } catch (error) {
        console.warn('Erreur dans la formule EBITDA personnalisée:', error);
        ebitda = agregats.beneficeTotal - chargesMensuelles; // Formule par défaut
      }
        } else {
      ebitda = agregats.beneficeTotal - chargesMensuelles; // Formule par défaut
    }
    
    // Ajouter EBITDA aux variables pour les calculs suivants
    variables.ebitda = ebitda;
    
    // Calculer EBIT (avec formule personnalisée si définie)
    let ebit;
    if (formulesPersonnalisees.ebit && formulesPersonnalisees.ebit.trim()) {
      try {
        ebit = evaluerFormule(formulesPersonnalisees.ebit, variables);
      } catch (error) {
        console.warn('Erreur dans la formule EBIT personnalisée:', error);
        ebit = ebitda - daMensuel; // Formule par défaut
        }
      } else {
      ebit = ebitda - daMensuel; // Formule par défaut
    }
    
    // Ajouter EBIT aux variables pour les calculs suivants
    variables.ebit = ebit;
    
    // Calculer NOPAT (avec formule personnalisée si définie)
    let nopat;
    if (formulesPersonnalisees.nopat && formulesPersonnalisees.nopat.trim()) {
      try {
        nopat = evaluerFormule(formulesPersonnalisees.nopat, variables);
      } catch (error) {
        console.warn('Erreur dans la formule NOPAT personnalisée:', error);
        nopat = ebit * (1 - getNumericTauxImposition() / 100); // Formule par défaut
      }
    } else {
      nopat = ebit * (1 - getNumericTauxImposition() / 100); // Formule par défaut
    }
    
    return {
      ...agregats,
      chargesMensuelles,
      ebitda,
      daMensuel,
      ebit,
      nopat
    };
  };

  // 4) Free Cash Flow selon nouvelles formules
  const calculerFCFStandardise = () => {
    const resultats = calculerChargesEtResultats();
    
    // Variables disponibles pour les formules FCF personnalisées
    const variables = {
      beneficeTotal: resultats.beneficeTotal,
      chargesMensuelles: resultats.chargesMensuelles,
      chargesTotales: resultats.chargesMensuelles, // Alias pour compatibilité
      daMensuel: resultats.daMensuel,
      tauxImposition: getNumericTauxImposition(),
      capex: getNumericCapex(),
      bfr: getNumericBfr(),
      tresorerie: getNumericTresorerie(),
      ebitda: resultats.ebitda,
      ebit: resultats.ebit,
      nopat: resultats.nopat
    };
    
    // Calculer FCF Mensuel (avec formule personnalisée si définie)
    let fcfMensuel;
    if (formulesPersonnalisees.fcfMensuel && formulesPersonnalisees.fcfMensuel.trim()) {
      try {
        fcfMensuel = evaluerFormule(formulesPersonnalisees.fcfMensuel, variables);
      } catch (error) {
        console.warn('Erreur dans la formule FCF Mensuel personnalisée:', error);
        fcfMensuel = resultats.nopat + resultats.daMensuel; // Formule par défaut
      }
    } else {
      fcfMensuel = resultats.nopat + resultats.daMensuel; // Formule par défaut
    }
    
    // Ajouter FCF mensuel aux variables pour le calcul annuel
    variables.fcfMensuel = fcfMensuel;
    
    // Calculer FCF Annuel (avec formule personnalisée si définie)
    let fcfAnnuel;
    if (formulesPersonnalisees.fcfAnnuel && formulesPersonnalisees.fcfAnnuel.trim()) {
      try {
        fcfAnnuel = evaluerFormule(formulesPersonnalisees.fcfAnnuel, variables);
      } catch (error) {
        console.warn('Erreur dans la formule FCF Annuel personnalisée:', error);
        fcfAnnuel = 12 * fcfMensuel; // Formule par défaut
      }
    } else {
      fcfAnnuel = 12 * fcfMensuel; // Formule par défaut
    }
    
    return {
      ...resultats,
      fcfMensuel,
      fcfAnnuel
    };
  };

  // 5) Bénéfice Net Mensuel avec formules personnalisées
  const calculerBeneficeNetMensuel = () => {
    const resultats = calculerChargesEtResultats();
    
    // Variables disponibles pour la formule de bénéfice net personnalisée
    const variables = {
      beneficeTotal: resultats.beneficeTotal,
      chargesMensuelles: resultats.chargesMensuelles,
      chargesTotales: resultats.chargesMensuelles, // Alias pour compatibilité
      daMensuel: resultats.daMensuel,
      tauxImposition: getNumericTauxImposition(),
      capex: getNumericCapex(),
      bfr: getNumericBfr(),
      tresorerie: getNumericTresorerie(),
      ebitda: resultats.ebitda,
      ebit: resultats.ebit,
      nopat: resultats.nopat
    };
    
    // Calculer Bénéfice Net Mensuel (avec formule personnalisée si définie)
    let beneficeNetMensuel;
    if (formulesPersonnalisees.beneficeNetMensuel && formulesPersonnalisees.beneficeNetMensuel.trim()) {
      try {
        beneficeNetMensuel = evaluerFormule(formulesPersonnalisees.beneficeNetMensuel, variables);
      } catch (error) {
        console.warn('Erreur dans la formule Bénéfice Net Mensuel personnalisée:', error);
        beneficeNetMensuel = resultats.beneficeTotal - resultats.chargesMensuelles; // Formule par défaut
      }
    } else {
      beneficeNetMensuel = resultats.beneficeTotal - resultats.chargesMensuelles; // Formule par défaut
    }
    
    return {
      ...resultats,
      beneficeNetMensuel
    };
  };

  // 6) Seuil de rentabilité avec margeMoyenneVentes
  const calculerSeuilRentabilite = () => {
    const resultats = calculerChargesEtResultats();
    
    // seuilCA = chargesMensuelles / margeMoyenneVentes
    const seuilCA = resultats.margeMoyenneVentes > 0 ? 
      resultats.chargesMensuelles / resultats.margeMoyenneVentes : 0;
    
    return {
      seuilCA,
      margeMoyenneVentes: resultats.margeMoyenneVentes,
      chargesMensuelles: resultats.chargesMensuelles
    };
  };

  // 6) Ratios et seuils avec margeMoyenneVentes (selon nouvelles formules)
  const calculerRatiosAvecMargeMoyenneVentes = () => {
    const resultats = calculerChargesEtResultats();
    
    // margeEBITDA = ebitda / volumeTotal
    const margeEBITDA = resultats.volumeTotal > 0 ? resultats.ebitda / resultats.volumeTotal : 0;
    
    // margeEBIT = ebit / volumeTotal  
    const margeEBIT = resultats.volumeTotal > 0 ? resultats.ebit / resultats.volumeTotal : 0;
    
    // margeNOPAT = nopat / volumeTotal
    const margeNOPAT = resultats.volumeTotal > 0 ? resultats.nopat / resultats.volumeTotal : 0;
    
    // Seuil de rentabilité = seuilCA = chargesMensuelles / margeMoyenneVentes
    const seuilCA = resultats.margeMoyenneVentes > 0 ? 
      resultats.chargesMensuelles / resultats.margeMoyenneVentes : 0;
    
    return {
      ...resultats,
      margeEBITDA,
      margeEBIT, 
      margeNOPAT,
      seuilCA
    };
  };

  // Fonction de compatibilité (ancien nom)
  const calculerBenefice = (margeBrute, repartition, volume) => {
    return margeBrute * repartition * volume;
  };

  // Fonction pour calculer le bénéfice total avec une variation de prix sur le bœuf
  const calculerBeneficeAvecVariationPrix = (produitNom, typePrix, variation) => {
    // Utiliser les données appropriées selon l'onglet actif
    const produitsActifs = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
    const volumeActif = getNumericAdditionalVolume() > 0 ? adjustedVolume : getNumericVolume();
    
    let beneficeTotal = 0;
    
    Object.entries(produitsActifs).forEach(([nom, data]) => {
      // Pour les produits non-éditables (pas de prix), pas de bénéfice
      if (!data.editable || !data.prixAchat || !data.prixVente) {
        return;
      }
      
        // Appliquer la variation seulement au produit spécifié
        let prixAchat = data.prixAchat;
        let prixVente = data.prixVente;
        
        if (nom === produitNom) {
          if (typePrix === 'prixAchat') {
            prixAchat += variation;
          } else if (typePrix === 'prixVente') {
            prixVente += variation;
          }
        }
        
      // Utiliser la nouvelle logique de calcul directement
      const CA_p = volumeActif * data.repartition;
      const COGS_p = CA_p * (prixAchat / prixVente);
      const Abats_p = data.hasAbats ? 
        (getNumericGainProduitsNobleFoieYellParKg() * CA_p / prixVente) : 0;
      const Pertes_p = data.hasAbats ? (getNumericPeration() * CA_p) : 0;
      const benefice = Math.max(0, CA_p - COGS_p - Pertes_p + Abats_p);
      
      beneficeTotal += benefice;
    });
    
    return beneficeTotal;
  };

  // Fonction pour calculer le bénéfice total avec une variation de prix (cohérente avec augmenterTousPrix)
  const calculerBeneficeAvecVariationPrixCorrige = (typePrix, variation) => {
    // Utiliser les données appropriées selon l'onglet actif
    const produitsActifs = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
    const volumeActif = getNumericAdditionalVolume() > 0 ? adjustedVolume : (getNumericVolume() || 0);
    
    // Vérifications de sécurité
    if (!volumeActif || volumeActif <= 0) {
      console.warn(`⚠️ Volume invalide: ${volumeActif}`);
      return 0;
    }
    
    if (!produitsActifs || Object.keys(produitsActifs).length === 0) {
      console.warn(`⚠️ Produits invalides:`, produitsActifs);
      return 0;
    }
    
    // Calculer d'abord la marge moyenne ventes des produits éditables
    let beneficeTotalEditables = 0;
    let volumeTotalEditables = 0;
    
    Object.entries(produitsActifs).forEach(([nom, data]) => {
      if (data.editable && data.prixAchat && data.prixVente) {
        let prixAchat = data.prixAchat || 0;
        let prixVente = data.prixVente || 1;
        
        if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
          if (typePrix === 'prixAchat') {
            prixAchat += (variation || 0);
          } else if (typePrix === 'prixVente') {
            prixVente += (variation || 0);
          }
        }
        
        const CA_p = volumeActif * (data.repartition || 0);
        const COGS_p = CA_p * (prixAchat / prixVente);
        const Abats_p = data.hasAbats ? 
          ((getNumericGainProduitsNobleFoieYellParKg() || 0) * CA_p / prixVente) : 0;
        const Pertes_p = data.hasAbats ? ((getNumericPeration() || 0) * CA_p) : 0;
        const benefice = Math.max(0, CA_p - COGS_p - Pertes_p + Abats_p);
        
        beneficeTotalEditables += (benefice || 0);
        volumeTotalEditables += CA_p;
      }
    });
    
    const margeMoyenneVentesEditables = volumeTotalEditables > 0 ? 
      beneficeTotalEditables / volumeTotalEditables : 0;
    
    // Maintenant calculer le bénéfice total avec tous les produits
    let beneficeTotal = 0;
    
    Object.entries(produitsActifs).forEach(([nom, data]) => {
      if (data.editable && data.prixAchat && data.prixVente) {
        // Produits éditables: refaire le calcul normal
        let prixAchat = data.prixAchat || 0;
        let prixVente = data.prixVente || 1;
        
        if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
          if (typePrix === 'prixAchat') {
            prixAchat += (variation || 0);
          } else if (typePrix === 'prixVente') {
            prixVente += (variation || 0);
          }
        }
        
        const CA_p = volumeActif * (data.repartition || 0);
        const COGS_p = CA_p * (prixAchat / prixVente);
        const Abats_p = data.hasAbats ? 
          ((getNumericGainProduitsNobleFoieYellParKg() || 0) * CA_p / prixVente) : 0;
        const Pertes_p = data.hasAbats ? ((getNumericPeration() || 0) * CA_p) : 0;
        const benefice = Math.max(0, CA_p - COGS_p - Pertes_p + Abats_p);
        
        beneficeTotal += (benefice || 0);
      } else {
        // Produits non-éditables: utiliser margeMoyenneVentesEditables
        const CA_p = volumeActif * (data.repartition || 0);
        const benefice = CA_p * margeMoyenneVentesEditables;
        beneficeTotal += (benefice || 0);
      }
    });
    
    return beneficeTotal;
  };

  // Fonction simple pour calculer le bénéfice avec variation de prix (pour les graphiques uniquement)
  const calculerBeneficeAvecVariationPrixExact = (typePrix, variation) => {
    // Utiliser la fonction existante qui fonctionne déjà
    return calculerBeneficeAvecVariationPrixCorrige(typePrix, variation);
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
    console.log('🚀 BUMP MANUEL - Début');
    console.log(`📈 Montant: ${montant}, Type: ${typePrix}, Produit: ${selectedProductForPricing}`);
    
    setProduits(prev => {
      const nouveauxProduits = { ...prev };
      console.log('📊 Prix AVANT bump:');
      Object.keys(nouveauxProduits).forEach(nom => {
        if (nouveauxProduits[nom].editable && nouveauxProduits[nom][typePrix]) {
          console.log(`   ${nom}: ${nouveauxProduits[nom][typePrix]}`);
        }
      });
      
      Object.keys(nouveauxProduits).forEach(nom => {
        if (nouveauxProduits[nom].editable && nouveauxProduits[nom][typePrix]) {
          // Si un produit spécifique est sélectionné, appliquer seulement à ce produit
          if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
            const ancienPrix = nouveauxProduits[nom][typePrix];
            nouveauxProduits[nom][typePrix] += montant;
            console.log(`✅ ${nom}: ${ancienPrix} → ${nouveauxProduits[nom][typePrix]} (+${montant})`);
          }
        }
      });
      
      console.log('🚀 BUMP MANUEL - Fin');
      return nouveauxProduits;
    });
  };

  // Fonction pour générer l'interprétation avec ChatGPT
  const genererInterpretation = async () => {
    setInterpretationLoading(true);
    setInterpretationVisible(true);
    
    try {
      // Debug: Vérifier la clé API
          // API key logging removed for security
      
      // Préparer les données pour l'analyse (ROI supprimé, ROIC utilisé)
      
      // Utiliser les données appropriées selon s'il y a un volume supplémentaire
      const volumeActuel = getNumericAdditionalVolume() > 0 ? getAdjustedVolume() : getNumericVolume();
      const produitsActuels = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
      const volumeSupplementaire = getNumericAdditionalVolume();
      
      // Données complètes incluant DCF et métriques financières
      const donneesAnalyse = {
        volumePointVente: getNumericVolume(),
        volumeSupplementaire: volumeSupplementaire,
        produitVolumeSupplementaire: volumeSupplementaire > 0 ? selectedProduct : null,
        volumeTotal: volumeActuel,
        parametresGlobaux: {
          volumeMensuel: volumeActuel,
          gainProduitsNobleFoieYellParKg: getNumericGainProduitsNobleFoieYellParKg(),
          peration: getNumericPeration(),
          beneficeBrut: Math.round(getBeneficeTotalActif()),
          beneficeNet: Math.round(calculerEBIT()),
          chargesTotales: Math.round(chargesTotales),
          margeMoyenneVentes: margeMoyenneVentes.toFixed(4),
          margeMoyenneVentesPct: (margeMoyenneVentes * 100).toFixed(2) + '%',

          capexInvestissement: getNumericCapex()
        },
        repartitionProduits: Object.fromEntries(
          Object.entries(produitsActuels).map(([nom, data]) => [nom, {
            repartition: data.repartition,
            prixAchat: data.prixAchat,
            prixVente: data.prixVente,
            editable: data.editable,
            hasAbats: data.hasAbats
          }])
        ),
        produits: Object.entries(produitsActuels).map(([nom, data]) => ({
          nom,
          repartition: data.repartition,
          prixAchat: data.prixAchat,
          prixVente: data.prixVente,
          margeBrute: data.editable && data.prixAchat && data.prixVente ? 
            calculerMargeBrute(data) : margeMoyenne,
          volume: Math.round(data.repartition * volumeActuel),
          benefice: Math.round(data.editable && data.prixAchat && data.prixVente ? 
            calculerBenefice(calculerMargeBrute(data), data.repartition, volumeActuel) :
            calculerBenefice(margeMoyenne, data.repartition, volumeActuel))
        })),
        charges: {
          chargesFixes: getNumericChargesFixes(),
          dureeAmortissement: getNumericDureeAmortissement(),
          salaire: getNumericSalaire(),
          electricite: getNumericElectricite(),
          eau: getNumericEau(),
          internet: getNumericInternet(),
          sacsLivraison: getNumericSacsLivraison(),
          chargesTransport: getNumericChargesTransport(),
          loyer: getNumericLoyer(),
          autresCharges: getNumericAutresCharges(),
          total: Math.round(chargesTotales)
        },
        metriquesFinancieres: {
          ebit: Math.round(calculerEBIT()),
          ebitda: Math.round(calculerEBITDA()),
          nopat: Math.round(calculerNOPAT()),
          fcf: Math.round(calculerFCF()),
          valeurTerminale: Math.round(calculerValeurTerminale()),
          enterpriseValue: Math.round(calculerEnterpriseValue()),
          equityValue: Math.round(calculerEquityValue())
        },
        analyseDCF: {
          parametres: {
            tauxActualisation: getNumericTauxActualisationAnnuel(),
            dureeAnalyse: getNumericDureeAnalyse(),
            capex: getNumericCapex(),
            bfr: getNumericBfr(),
            wacc: getNumericWacc(),
            croissanceTerminale: getNumericCroissanceTerminale(),
            dette: getNumericDette(),
            tresorerie: getNumericTresorerie(),
            tauxImposition: getNumericTauxImposition(),
            depreciationAmortissement: getNumericDepreciationAmortissement()
          },
          indicateurs: calculerIndicateursDCF()
        }
      };

      const prompt = `En tant qu'analyste financier expert spécialisé dans les business plans pour investisseurs, rédigez une analyse financière professionnelle d'un point de vente MATA Trading au Sénégal, prête à être intégrée dans un dossier de levée de fonds.

CONTEXTE MATA GROUP SA:
Créé en août 2024, MATA Group SA est une société anonyme sénégalaise à vocation agroalimentaire, structurée autour de plusieurs entités opérationnelles spécialisées. Sa mission : construire une chaîne de valeur agroalimentaire intégrée, efficiente, digitalisée et rentable.
Sa vision : devenir une "Data Driven Meat Integration Company", en combinant maîtrise opérationnelle, structuration industrielle et pilotage par la donnée.

Les entités du groupe :
• MATA GROUP SA – Société Mère : Supervise les fonctions transversales, arbitre et finance les projets des entités, garantit la cohérence stratégique.
• MATA Logistique & Conciergerie (MLC) : Logistique pour toutes les entités + plateforme de services de proximité.
• MATA Volaille : Production avicole intégrée (9 000 sujets/mois → objectif 100 000 en 2028).
• MATA Production : Élevage bovin, ovin et caprin (levée de fonds achevée, création en cours).
• MATA Trading : Développement de réseau de distribution hybride (franchises, supérettes, points de vente MATA) - EN COURS DE LEVÉE DE FONDS.
• MATA Restaurant & Traiteur : Valorisation culinaire (en projet).
• MATA Transformation : Unité industrielle (en projet).

OBJECTIF DE L'ANALYSE: Démontrer la viabilité économique d'un point de vente MATA Trading pour lever des fonds destinés à la création de cette entité. Ce modèle de point de vente, basé sur les données réelles de vos points de vente actuels, servira de référence pour le déploiement du réseau de distribution MATA Trading.

DONNÉES FINANCIÈRES DU POINT DE VENTE:
${JSON.stringify(donneesAnalyse, null, 2)}

IMPORTANT: Ce modèle de point de vente est basé sur un volume mensuel de 20,000,000 FCFA et une répartition des produits alignée sur vos points de vente actuels. ${volumeSupplementaire > 0 ? `Un volume supplémentaire de ${volumeSupplementaire.toLocaleString()} FCFA a été ajouté spécifiquement pour le produit "${selectedProduct}", portant le volume total à ${volumeActuel.toLocaleString()} FCFA.` : ''} Adaptez vos conclusions en précisant qu'il s'agit d'un modèle basé sur vos données réelles de vente.

Rédigez une analyse structurée style "due diligence" avec un ton formel et convaincant pour investisseurs, en positionnant ce point de vente comme le modèle de référence pour le réseau MATA Trading:

## ANALYSE FINANCIÈRE - POINT DE VENTE MATA TRADING

### 1. MODÈLE ÉCONOMIQUE BASÉ SUR LES DONNÉES RÉELLES
Démontrez la viabilité du modèle de point de vente MATA Trading:
- Performance financière basée sur vos données de vente actuelles
- Ratios clés (marge, ROI, cash flow) prouvant la solidité du modèle
- Synergies avec les entités MATA Group SA (approvisionnement, logistique)
- Validation du mix produits et des répartitions de vos points de vente

### 2. STRATÉGIE DE DÉPLOIEMENT RÉSEAU
Analysez le potentiel d'expansion basé sur ce modèle validé:
- Réplication du modèle éprouvé vers un réseau de distribution
- Validation du mix produits et des marges dans des conditions réelles
- Optimisation des processus opérationnels pour la scalabilité
- Plan de déploiement basé sur des données concrètes

### 3. PERFORMANCE ET OPTIMISATIONS DU MODÈLE
Présentez les enseignements tirés de vos points de vente actuels:
- Performance par segment de produits et optimisations identifiées
- Validation des synergies avec l'écosystème MATA Group SA
- Ajustements opérationnels et commerciaux validés
- Métriques de succès reproductibles pour le réseau

### 4. PROJECTION ET SCALABILITÉ DU MODÈLE ÉPROUVÉ
Démontrez le potentiel d'expansion basé sur vos données réelles:
- Multiplication du modèle validé vers un réseau de distribution
- Avantages concurrentiels confirmés par vos points de vente actuels
- Plan de déploiement basé sur des performances réelles
- Création de valeur exponentielle par réplication du modèle éprouvé

Positionnez ce point de vente comme le modèle de référence validé pour MATA Trading, réduisant significativement les risques d'investissement et prouvant le potentiel de scalabilité. Insistez sur l'importance de baser l'expansion sur des données réelles de vos points de vente actuels pour rassurer les investisseurs sur la solidité du business model. Utilisez un vocabulaire d'investissement (EBITDA, cash flow, ROI, scalabilité), des métriques précises, et un ton qui inspire confiance. Réponse en français business formel.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modeleChatGPT,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      setInterpretationText(data.choices[0].message.content);
      
    } catch (error) {
      console.error('Erreur lors de la génération de l\'interprétation:', error);
      setInterpretationText(`Erreur lors de la génération de l'interprétation: ${error.message}`);
    } finally {
      setInterpretationLoading(false);
    }
  };

  // Fonction pour générer l'analyse contextuelle (seconde analyse)
  const genererAnalyseContextuelle = async () => {
    if (!contexteSupplementaire.trim()) {
      alert('Veuillez saisir un contexte supplémentaire avant de générer l\'analyse.');
      return;
    }

    setAnalyseContextuelleLoading(true);
    setAnalyseContextuelleVisible(true);
    
    try {
      // Préparer les données complètes pour l'analyse contextuelle (ROI supprimé)
      
      // Utiliser les données appropriées selon s'il y a un volume supplémentaire
      const volumeActuel = getNumericAdditionalVolume() > 0 ? getAdjustedVolume() : getNumericVolume();
      const produitsActuels = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
      const volumeSupplementaire = getNumericAdditionalVolume();
      
      const donneesAnalyse = {
        volumePointVente: getNumericVolume(),
        volumeSupplementaire: volumeSupplementaire,
        produitVolumeSupplementaire: volumeSupplementaire > 0 ? selectedProduct : null,
        volumeTotal: volumeActuel,
        parametresGlobaux: {
          volumeMensuel: volumeActuel,
          gainProduitsNobleFoieYellParKg: getNumericGainProduitsNobleFoieYellParKg(),
          peration: getNumericPeration(),
          beneficeBrut: Math.round(getBeneficeTotalActif()),
          beneficeNet: Math.round(calculerEBIT()),
          chargesTotales: Math.round(chargesTotales),
          margeMoyenneVentes: margeMoyenneVentes.toFixed(4),
          margeMoyenneVentesPct: (margeMoyenneVentes * 100).toFixed(2) + '%',

          capexInvestissement: getNumericCapex()
        },
        repartitionProduits: Object.fromEntries(
          Object.entries(produitsActuels).map(([nom, data]) => [nom, {
            repartition: data.repartition,
            prixAchat: data.prixAchat,
            prixVente: data.prixVente,
            editable: data.editable,
            hasAbats: data.hasAbats
          }])
        ),
        produits: Object.entries(produitsActuels).map(([nom, data]) => ({
          nom,
          repartition: (data.repartition * 100).toFixed(1) + '%',
          prixAchat: data.prixAchat,
          prixVente: data.prixVente,
          marge: data.editable && data.prixAchat && data.prixVente ? 
            ((calculerMargeBrute(data) * 100).toFixed(1) + '%') : 'N/A',
          volume: Math.round(data.repartition * volumeActuel),
          benefice: Math.round(data.editable && data.prixAchat && data.prixVente ? 
            calculerBenefice(calculerMargeBrute(data), data.repartition, volumeActuel) :
            calculerBenefice(margeMoyenne, data.repartition, volumeActuel))
        })),
        charges: {
          chargesFixes: getNumericChargesFixes(),
          dureeAmortissement: getNumericDureeAmortissement(),
          salaire: getNumericSalaire(),
          electricite: getNumericElectricite(),
          eau: getNumericEau(),
          internet: getNumericInternet(),
          sacsLivraison: getNumericSacsLivraison(),
          chargesTransport: getNumericChargesTransport(),
          loyer: getNumericLoyer(),
          autresCharges: getNumericAutresCharges(),
          total: Math.round(chargesTotales)
        },
        metriquesFinancieres: {
          ebit: Math.round(calculerEBIT()),
          ebitda: Math.round(calculerEBITDA()),
          nopat: Math.round(calculerNOPAT()),
          fcf: Math.round(calculerFCF()),
          valeurTerminale: Math.round(calculerValeurTerminale()),
          enterpriseValue: Math.round(calculerEnterpriseValue()),
          equityValue: Math.round(calculerEquityValue())
        },
        analyseDCF: {
          parametres: {
            tauxActualisation: getNumericTauxActualisationAnnuel(),
            dureeAnalyse: getNumericDureeAnalyse(),
            capex: getNumericCapex(),
            bfr: getNumericBfr(),
            wacc: getNumericWacc(),
            croissanceTerminale: getNumericCroissanceTerminale(),
            dette: getNumericDette(),
            tresorerie: getNumericTresorerie(),
            tauxImposition: getNumericTauxImposition(),
            depreciationAmortissement: getNumericDepreciationAmortissement()
          },
          indicateurs: calculerIndicateursDCF()
        }
      };

      const prompt = `En tant qu'analyste financier expert spécialisé dans MATA Group SA, vous avez précédemment rédigé cette analyse du POINT DE VENTE MATA Trading pour la levée de fonds :

RAPPEL CONTEXTE MATA GROUP SA:
Créé en août 2024, MATA Group SA est une société anonyme sénégalaise à vocation agroalimentaire, structurée autour de plusieurs entités opérationnelles spécialisées. Sa mission : construire une chaîne de valeur agroalimentaire intégrée, efficiente, digitalisée et rentable. Sa vision : devenir une "Data Driven Meat Integration Company".

ANALYSE PRÉCÉDENTE DU POINT DE VENTE MATA TRADING:
${interpretationText}

DONNÉES FINANCIÈRES ACTUELLES DU POINT DE VENTE:
${JSON.stringify(donneesAnalyse, null, 2)}

IMPORTANT: Ce modèle de point de vente est basé sur un volume mensuel de 20,000,000 FCFA et une répartition des produits alignée sur vos points de vente actuels. ${volumeSupplementaire > 0 ? `Un volume supplémentaire de ${volumeSupplementaire.toLocaleString()} FCFA a été ajouté spécifiquement pour le produit "${selectedProduct}", portant le volume total à ${volumeActuel.toLocaleString()} FCFA.` : ''} Tenez compte de cette base de données réelles dans votre analyse.

CONTEXTE SUPPLÉMENTAIRE FOURNI:
${contexteSupplementaire}

Rédigez maintenant une analyse complémentaire sur le POINT DE VENTE MATA Trading qui :
1. Enrichit l'analyse précédente avec le nouveau contexte fourni
2. Renforce la validation du modèle économique basé sur vos données réelles
3. Évalue l'impact du contexte supplémentaire sur la stratégie de déploiement réseau
4. Approfondit les implications pour l'expansion basée sur vos points de vente actuels
5. Démontre comment le nouveau contexte confirme ou ajuste la viabilité du modèle éprouvé

Format attendu : Analyse stratégique focalisée sur le POINT DE VENTE comme modèle de référence. Évitez de répéter l'analyse précédente, concentrez-vous sur comment le nouveau contexte renforce ou nuance les conclusions sur ce modèle basé sur vos données réelles.

Positionnez cette analyse complémentaire comme un renforcement de la crédibilité du modèle de point de vente et de son rôle dans la validation de l'expansion réseau MATA Trading. Réponse en français business formel.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modeleChatGPT,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      setAnalyseContextuelleText(data.choices[0].message.content);
      
    } catch (error) {
      console.error('Erreur lors de la génération de l\'analyse contextuelle:', error);
      setAnalyseContextuelleText(`Erreur lors de la génération de l'analyse contextuelle: ${error.message}`);
    } finally {
      setAnalyseContextuelleLoading(false);
    }
  };

  // Fonction pour générer l'analyse complète personnalisée
  // Fonction pour générer les données clés utilisées dans les analyses
  const genererKeyData = () => {
    // Utiliser les nouvelles fonctions standardisées pour la cohérence
    const resultats = calculerChargesEtResultats();
    const fcfData = calculerFCFStandardise();
    
    const margeMoyenne = resultats.margeMoyenne;
    const margeMoyenneVentes = resultats.margeMoyenneVentes;
    const beneficeTotal = resultats.beneficeTotal;
    const ebit = resultats.ebit;
    const ebitda = resultats.ebitda;
    const nopat = resultats.nopat;
    const fcf = fcfData.fcfMensuel;
    // ROIC uniquement (ROI supprimé)
    const roicData = calculerROIC();
    const roicMensuel = roicData.mensuel;
    const roicAnnuel = roicData.annuel;
    
    const keyData = {
      // Données de base
      volumePointVente: getNumericVolume(),
      volumeSupplementaire: getNumericAdditionalVolume(),
      volumeTotal: getAdjustedVolume(),
      
      // Répartition des produits
      repartitionProduits: getAdjustedRepartitions(),
      
      // Prix et marges - utiliser les données standardisées
      produits: Object.keys(produits).map(nom => {
        const detailProduit = resultats.detailsProduits[nom] || { margeBrute: 0, benefice: 0 };
        return {
        nom,
        repartition: produits[nom].repartition,
        prixAchat: produits[nom].prixAchat,
        prixVente: produits[nom].prixVente,
          margeBrute: detailProduit.margeBrute,
          benefice: detailProduit.benefice
        };
      }),
      
      // Métriques financières
      margeMoyenne: margeMoyenne,
      margeMoyenneVentes: margeMoyenneVentes,
      seuilRentabilite: calculerSeuilRentabilite().seuilCA,
      ratiosAvecMargeMoyenneVentes: calculerRatiosAvecMargeMoyenneVentes(),
      beneficeTotal: beneficeTotal,
      ebit: ebit,
      ebitda: ebitda,
      nopat: nopat,
      fcf: fcf,
      // Seul ROIC inclus (ROI supprimé)
      roicMensuel: roicMensuel,
      roicAnnuel: roicAnnuel,
      
      // Charges
      charges: {
        fixes: getNumericChargesFixes(),
        salaire: getNumericSalaire(),
        electricite: getNumericElectricite(),
        eau: getNumericEau(),
        internet: getNumericInternet(),
        sacsLivraison: getNumericSacsLivraison(),
        chargesTransport: getNumericChargesTransport(),
        loyer: getNumericLoyer(),
        autresCharges: getNumericAutresCharges(),
        totalAmortissement: getNumericAmortissementAnnuel(),
        total: getNumericChargesFixes() + getNumericSalaire() + getNumericElectricite() + 
               getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + 
               getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges(),
        // Charges opérationnelles sans amortissements (gérés séparément dans D&A)
        totalChargesOperationnelles: getNumericSalaire() + getNumericElectricite() + 
               getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + 
               getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges()
      },
      
      // Paramètres DCF
      dcf: {
        tauxActualisation: getNumericTauxActualisationAnnuel(),
        dureeAnalyse: getNumericDureeAnalyse(),
        capex: getNumericCapex(),
        bfr: getNumericBfr(),
        wacc: getNumericWacc(),
        croissanceTerminale: getNumericCroissanceTerminale(),
        dette: getNumericDette(),
        tresorerie: getNumericTresorerie(),
        tauxImposition: getNumericTauxImposition(),
        depreciationAmortissement: getNumericDepreciationAmortissement()
      },
      
      // Paramètres spécifiques
      gainProduitsNobleFoieYellParKg: getNumericGainProduitsNobleFoieYellParKg(),
      peration: getNumericPeration(),
      dureeAmortissement: getNumericDureeAmortissement()
    };
    
    return keyData;
  };

  const genererAnalyseComplete = async () => {
    if (!contextePersonnalise.trim()) {
      alert('Veuillez saisir un contexte personnalisé avant de générer l\'analyse complète.');
      return;
    }

    setAnalyseCompleteLoading(true);
    setAnalyseCompleteVisible(true);
    
    try {
      // Debug: Vérifier la clé API
          // API key logging removed for security
      
      // Préparer toutes les données de l'application en temps réel
      // Seul ROIC utilisé (ROI supprimé)
      const roicData = calculerROIC();
      const fluxDCF = calculerFluxDCF();
      const indicateursDCF = calculerIndicateursDCF();
      const fluxDCFSimulation = calculerFluxDCFSimulation();
      const indicateursDCFSimulation = calculerIndicateursDCFSimulation();
      
      // Utiliser les données appropriées selon s'il y a un volume supplémentaire
      const volumeActuel = getNumericAdditionalVolume() > 0 ? getAdjustedVolume() : getNumericVolume();
      const produitsActuels = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
      const volumeSupplementaire = getNumericAdditionalVolume();
      
      // Optimisation : Réduire la taille des données pour éviter l'erreur 400
      const donneesComplete = {
        volumePointVente: getNumericVolume(),
        volumeSupplementaire: volumeSupplementaire,
        produitVolumeSupplementaire: volumeSupplementaire > 0 ? selectedProduct : null,
        volumeTotal: volumeActuel,
        parametresGlobaux: {
          volumeMensuel: volumeActuel,
          beneficeBrut: Math.round(getBeneficeTotalActif()),
          beneficeNet: Math.round(calculerEBIT()),
          chargesTotales: Math.round(chargesTotales),
          margeMoyenneVentes: margeMoyenneVentes.toFixed(4),
          margeMoyenneVentesPct: (margeMoyenneVentes * 100).toFixed(2) + '%',
          // Seul ROIC inclus (ROI supprimé)
          roicMensuel: (roicData.mensuel * 100).toFixed(2) + '%',
          roicAnnuel: (roicData.annuel * 100).toFixed(2) + '%',
          capexInvestissement: getNumericCapex()
        },
        repartitionProduits: Object.fromEntries(
          Object.entries(produitsActuels).map(([nom, data]) => [nom, {
            repartition: data.repartition,
            prixAchat: data.prixAchat,
            prixVente: data.prixVente,
            editable: data.editable,
            hasAbats: data.hasAbats
          }])
        ),
        produits: Object.entries(produitsActuels).map(([nom, data]) => ({
          nom,
          repartition: (data.repartition * 100).toFixed(1) + '%',
          prixAchat: data.prixAchat,
          prixVente: data.prixVente,
          marge: data.editable && data.prixAchat && data.prixVente ? 
            ((calculerMargeBrute(data) * 100).toFixed(1) + '%') : 'N/A',
          benefice: Math.round(data.editable && data.prixAchat && data.prixVente ? 
            calculerBenefice(calculerMargeBrute(data), data.repartition, volumeActuel) :
            calculerBenefice(margeMoyenne, data.repartition, volumeActuel))
        })),
        charges: {
          total: Math.round(chargesTotales),
          salaire: getNumericSalaire(),
          loyer: getNumericLoyer(),
          chargesTransport: getNumericChargesTransport()
        },
        metriquesFinancieres: {
          ebit: Math.round(calculerEBIT()),
          ebitda: Math.round(calculerEBITDA()),
          fcf: Math.round(calculerFCF()),
          enterpriseValue: Math.round(calculerEnterpriseValue()),
          equityValue: Math.round(calculerEquityValue())
        }
      };

      const prompt = `En tant qu'analyste financier expert spécialisé dans MATA Group SA, vous devez réaliser une ANALYSE COMPLÈTE ET PERSONNALISÉE du point de vente MATA Trading en tenant compte du contexte spécifique fourni et de toutes les données financières en temps réel.

CONTEXTE MATA GROUP SA:
Créé en août 2024, MATA Group SA est une société anonyme sénégalaise à vocation agroalimentaire, structurée autour de plusieurs entités opérationnelles spécialisées. Sa mission : construire une chaîne de valeur agroalimentaire intégrée, efficiente, digitalisée et rentable. Sa vision : devenir une "Data Driven Meat Integration Company".

CONTEXTE PERSONNALISÉ FOURNI:
${contextePersonnalise}

DONNÉES FINANCIÈRES COMPLÈTES EN TEMPS RÉEL:
${JSON.stringify(donneesComplete, null, 2)}

VOTRE MISSION:
Réalisez une analyse financière complète et personnalisée qui intègre :
1. Le contexte spécifique que vous avez fourni
2. Toutes les données financières actuelles (produits, charges, DCF, simulations)
3. Les métriques de performance (ROI, EBITDA, FCF, etc.)
4. Les scénarios de simulation (volume et DCF)
5. Les indicateurs de valorisation

Votre analyse doit être structurée, précise, et adaptée au contexte fourni. Utilisez un vocabulaire d'investissement professionnel et fournissez des recommandations concrètes basées sur les données réelles. Réponse en français business formel.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modeleChatGPT,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      setAnalyseCompleteText(data.choices[0].message.content);
      
    } catch (error) {
      console.error('Erreur lors de la génération de l\'analyse complète:', error);
      setAnalyseCompleteText(`Erreur lors de la génération de l'analyse complète: ${error.message}`);
    } finally {
      setAnalyseCompleteLoading(false);
    }
  };

  const genererAnalysePlusPlus = async () => {
    if (!contextePersonnalise.trim()) {
      alert('Veuillez saisir un contexte personnalisé avant de générer l\'analyse ++.');
      return;
    }

    setAnalyseCompleteLoading(true);
    setAnalyseCompleteVisible(true);
    
    try {
      const keyData = genererKeyData();
      
      // Créer un prompt pour générer 3 interprétations différentes
      const promptMultipleInterpretations = `
Tu es un expert financier spécialisé dans l'analyse de rentabilité des points de vente. 

CONTEXTE BUSINESS:
${contextePersonnalise}

DONNÉES FINANCIÈRES (toutes mensuelles):
${JSON.stringify(keyData, null, 2)}

MISSION: Génère exactement 3 interprétations différentes et complémentaires de ces résultats financiers.

INSTRUCTIONS:
1. Chaque interprétation doit avoir un angle d'analyse différent:
   - Interprétation 1: Focus RENTABILITÉ et PERFORMANCE OPÉRATIONNELLE
   - Interprétation 2: Focus RISQUES et POINTS D'ATTENTION  
   - Interprétation 3: Focus OPPORTUNITÉS et RECOMMANDATIONS STRATÉGIQUES

2. Chaque interprétation doit être complète (3-4 paragraphes) et autonome
3. Utilise les données financières précises pour argumenter
4. Reste factuel et professionnel

FORMAT DE RÉPONSE REQUIS:
=== INTERPRÉTATION 1: RENTABILITÉ ===
[Analyse complète 3-4 paragraphes]

=== INTERPRÉTATION 2: RISQUES ===  
[Analyse complète 3-4 paragraphes]

=== INTERPRÉTATION 3: OPPORTUNITÉS ===
[Analyse complète 3-4 paragraphes]
`;

      // Première requête : générer les 3 interprétations
      const responseMultiple = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modeleChatGPT,
          messages: [{
            role: 'user',
            content: promptMultipleInterpretations
          }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!responseMultiple.ok) {
        throw new Error(`Erreur API (multiple): ${responseMultiple.status}`);
      }

      const dataMultiple = await responseMultiple.json();
      const interpretationsMultiples = dataMultiple.choices[0].message.content;

      // Deuxième requête : sélectionner la meilleure interprétation
      const promptSelection = `
Tu es un expert en analyse financière. Je te présente 3 interprétations différentes d'une même analyse financière.

CONTEXTE BUSINESS:
${contextePersonnalise}

DONNÉES FINANCIÈRES:
${JSON.stringify(keyData, null, 2)}

LES 3 INTERPRÉTATIONS À ÉVALUER:
${interpretationsMultiples}

MISSION: Sélectionne et améliore la meilleure interprétation selon ces critères:
1. Pertinence par rapport au contexte business
2. Utilisation précise des données financières  
3. Qualité des insights et recommandations
4. Cohérence et clarté de l'analyse

INSTRUCTIONS:
1. Identifie la meilleure interprétation (1, 2 ou 3)
2. Améliore-la en intégrant les meilleurs éléments des 2 autres
3. Ajoute des recommandations concrètes et actionnables
4. Structure ta réponse de manière professionnelle

FORMAT DE RÉPONSE:
=== ANALYSE FINANCIÈRE OPTIMISÉE ===

**Interprétation sélectionnée:** [1, 2 ou 3] - [Justification rapide]

**Synthèse Executive:**
[2-3 phrases clés sur la situation]

**Analyse Détaillée:**
[Analyse complète intégrant les meilleurs éléments]

**Recommandations Prioritaires:**
1. [Action concrète 1]
2. [Action concrète 2] 
3. [Action concrète 3]

**Points de Vigilance:**
[Risques et éléments à surveiller]
`;

      // Deuxième requête pour sélectionner et améliorer
      const responseSelection = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modeleChatGPT,
          messages: [{
            role: 'user',
            content: promptSelection
          }],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!responseSelection.ok) {
        throw new Error(`Erreur API (sélection): ${responseSelection.status}`);
      }

      const dataSelection = await responseSelection.json();
      const analyseFinalePlusPlus = dataSelection.choices[0].message.content;

      // Afficher le résultat final optimisé
      setAnalyseCompleteText(analyseFinalePlusPlus);
      
    } catch (error) {
      console.error('Erreur lors de la génération de l\'analyse ++:', error);
      setAnalyseCompleteText(`Erreur lors de la génération de l'analyse ++: ${error.message}`);
    } finally {
      setAnalyseCompleteLoading(false);
    }
  };

  const resetPrix = () => {
    setProduits({
      'Boeuf': { repartition: 0.701782462, prixAchat: 3150, prixVente: 3550, editable: true, hasAbats: true },
      'Veau': { repartition: 0.044592391, prixAchat: 3350, prixVente: 3900, editable: true, hasAbats: true },
      'Ovin': { repartition: 0.052244053, prixAchat: 4000, prixVente: 4500, editable: true, hasAbats: false },
      'Oeuf': { repartition: 0.0477725983, prixAchat: 2250, prixVente: 2500, editable: true, hasAbats: false },
      'Autres': { repartition: 0.03669501, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
      'Pack': { repartition: 0.014027977, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
      'Poulet': { repartition: 0.102932124, prixAchat: 2600, prixVente: 3400, editable: true, hasAbats: false }
    });
    setVolume('20000000');
    setGainProduitsNobleFoieYellParKg('200');
    setPeration('0.13');
    setAdditionalVolume('0');
    setSelectedProduct('Poulet');
    // Reset des charges
    setChargesFixes('5000000');
    setDureeAmortissement('24');
    setSalaire('250000');
    setElectricite('25000');
    setEau('5000');
    setInternet('10000');
    setSacsLivraison('30000');
    setChargesTransport('150000');
    setLoyer('250000');
    setAutresCharges('0');
    // Reset DCF
    setTauxActualisationAnnuel('12');
    setDureeAnalyse('60');
    setCapex('2500000');
    setBfr('250000');
    setWacc('12');
    setCroissanceTerminale('3');
    setDette('0');
    setTresorerie('500000');
    setTauxImposition('30');
    setDepreciationAmortissement('');
    setSelectedProductForPricing('Tous');
  };

  // Fonction pour forcer la simulation principale (additionalVolume = 0)
  const forceMainSimulation = () => {
    setAdditionalVolume('0');
  };

  // Fonction pour réinitialiser la simulation volume
  const resetVolumeSimulation = () => {
    setAdditionalVolume('0');
    setSelectedProduct('Poulet');
  };

  // Fonction pour synchroniser toutes les répartitions
  const synchronizeRepartitions = () => {
    // Forcer un reset complet avec les nouvelles répartitions
    setProduits({
      'Boeuf': { repartition: 0.701782462, prixAchat: 3150, prixVente: 3550, editable: true, hasAbats: true },
      'Veau': { repartition: 0.044592391, prixAchat: 3350, prixVente: 3900, editable: true, hasAbats: true },
      'Ovin': { repartition: 0.052244053, prixAchat: 4000, prixVente: 4500, editable: true, hasAbats: false },
      'Oeuf': { repartition: 0.0477725983, prixAchat: 2250, prixVente: 2500, editable: true, hasAbats: false },
      'Autres': { repartition: 0.03669501, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
      'Pack': { repartition: 0.014027977, prixAchat: null, prixVente: null, editable: false, hasAbats: false },
      'Poulet': { repartition: 0.102932124, prixAchat: 2600, prixVente: 3400, editable: true, hasAbats: false }
    });
    // Forcer aussi un reset du volume de simulation
    setAdditionalVolume('0');
    setSelectedProduct('Poulet');
  };

  // Fonction d'export des données
  const exportData = () => {
    const dataToExport = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        // Paramètres globaux
        volume,
        gainProduitsNobleFoieYellParKg,
        peration,
        
        // Simulation de volume
        selectedProduct,
        additionalVolume,
        
        // Charges
        chargesFixes,
        dureeAmortissement,
        salaire,
        electricite,
        eau,
        internet,
        sacsLivraison,
        chargesTransport,
        loyer,
        autresCharges,
        
        // DCF
        tauxActualisationAnnuel,
        dureeAnalyse,
        capex,
        bfr,
        wacc,
        croissanceTerminale,
        dette,
        tresorerie,
        tauxImposition,
        depreciationAmortissement,
        
        // Produits
        produits
      }
    };
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mata-trading-simulation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fonction d'import des données
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Vérifier la version et la structure
        if (!importedData.version || !importedData.data) {
          alert('Format de fichier invalide. Veuillez utiliser un fichier exporté depuis cette application.');
          return;
        }
        
        const data = importedData.data;
        
        // Importer les données
        setVolume(data.volume || 20000000);
        setGainProduitsNobleFoieYellParKg(data.gainProduitsNobleFoieYellParKg || data.abatsParKg || 200);
        setPeration(data.peration || 0.1);
        setSelectedProduct(data.selectedProduct || 'Poulet');
        setAdditionalVolume(data.additionalVolume || 5000000);
        setChargesFixes(data.chargesFixes || 5000000);
        setDureeAmortissement(data.dureeAmortissement || 24);
        setSalaire(data.salaire || 250000);
        setElectricite(data.electricite || 25000);
        setEau(data.eau || 5000);
        setInternet(data.internet || 10000);
        setSacsLivraison(data.sacsLivraison || 30000);
        setChargesTransport(data.chargesTransport || 150000);
        setLoyer(data.loyer || 250000);
        setAutresCharges(data.autresCharges || 0);
        setTauxActualisationAnnuel(data.tauxActualisationAnnuel || 12);
        setDureeAnalyse(data.dureeAnalyse || 60);
        setCapex(data.capex || 1000000);
        setBfr(data.bfr || 250000);
        setWacc(data.wacc || 15);
        setCroissanceTerminale(data.croissanceTerminale || 3);
        setDette(data.dette || 5000000);
        setTresorerie(data.tresorerie || 5000000);
        setTauxImposition(data.tauxImposition || 30);
        setDepreciationAmortissement(data.depreciationAmortissement || 12000000);
        
        // Importer les produits
        if (data.produits) {
          setProduits(data.produits);
        }
        
        alert('Données importées avec succès !');
        
      } catch (error) {
        alert('Erreur lors de l\'import du fichier. Veuillez vérifier que le fichier est valide.');
        console.error('Import error:', error);
      }
    };
    
    reader.readAsText(file);
  };

  // Fonction de génération de PDF
  const generatePDF = async () => {
    if (!mainContainerRef.current) {
      alert('Erreur: Impossible de générer le PDF. Veuillez réessayer.');
      return;
    }

    try {
      // Afficher un message de chargement
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        font-size: 16px;
      `;
      loadingMessage.textContent = 'Génération du PDF en cours...';
      document.body.appendChild(loadingMessage);

      // Capturer le contenu de la page
      const canvas = await html2canvas(mainContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: mainContainerRef.current.scrollWidth,
        height: mainContainerRef.current.scrollHeight
      });

      // Créer le PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Marge de 10mm de chaque côté
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Ajouter un titre au PDF
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rapport de Simulation - Mata Trading', 105, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 105, 25, { align: 'center' });
      pdf.text(`Onglet actif: ${getTabName(activeTab)}`, 105, 32, { align: 'center' });
      
      // Ajouter l'image du contenu
      let heightLeft = imgHeight;
      let position = 40; // Commencer après le titre
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - position);
      
      // Ajouter des pages supplémentaires si nécessaire
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Sauvegarder le PDF
      const fileName = `mata-trading-report-${new Date().toISOString().split('T')[0]}-${activeTab}.pdf`;
      pdf.save(fileName);

      // Supprimer le message de chargement
      document.body.removeChild(loadingMessage);
      
      alert('PDF généré avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
      
      // Supprimer le message de chargement en cas d'erreur
      const loadingMessage = document.querySelector('div[style*="position: fixed"]');
      if (loadingMessage) {
        document.body.removeChild(loadingMessage);
      }
    }
  };

  // Fonction d'export des flux de trésorerie
  const exportFluxTresorerie = (fluxData, nomFichier) => {
    const csvContent = [
              ['Mois', 'NOPAT', 'D&A', 'CAPEX', 'ΔBFR', 'FCF', 'FCF Actualisé', 'Cumul Actualisé'],
      ...fluxData.map(flux => [
        flux.mois === 0 ? 'Mois 0' : `Mois ${flux.mois}`,
        flux.nopat.toLocaleString(),
        flux.depreciation.toLocaleString(),
        flux.capex.toLocaleString(),
        flux.deltaBfr.toLocaleString(),
        flux.fcf.toLocaleString(),
        flux.fcfActualise.toLocaleString(),
        flux.cumulActualise.toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', nomFichier);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction helper pour obtenir le nom de l'onglet
  const getTabName = (tab) => {
    const tabNames = {
      'main': 'Principal',
      'volume': 'Simulation Volume',
      'charges': 'Charges',
      'dcf': 'DCF Simple',
      'dcfSimulation': 'DCF Simulation',
      'faq': 'FAQ'
    };
    return tabNames[tab] || tab;
  };

  const margeMoyenne = calculerMargeMoyenne();
  // Fonctions de gestion des formules personnalisées
  const sauvegarderFormules = () => {
    setCookie('mata_formules_personnalisees', JSON.stringify(formulesPersonnalisees), 365);
    alert('Formules sauvegardées avec succès !');
  };

  const chargerFormules = () => {
    const savedFormules = getCookie('mata_formules_personnalisees');
    if (savedFormules) {
      try {
        const formules = JSON.parse(savedFormules);
        setFormulesPersonnalisees(formules);
        alert('Formules chargées avec succès !');
      } catch (error) {
        alert('Erreur lors du chargement des formules.');
      }
      } else {
      alert('Aucune formule sauvegardée trouvée.');
    }
  };

  const reinitialiserFormules = () => {
    if (window.confirm('Êtes-vous sûr de vouloir remettre les formules par défaut ?')) {
      setFormulesPersonnalisees({
        ebitda: 'beneficeTotal - chargesMensuelles',
        ebit: 'ebitda - daMensuel',
        nopat: 'ebit * (1 - tauxImposition / 100)',
        fcfMensuel: 'nopat + daMensuel',
        fcfAnnuel: 'fcfMensuel * 12',
        roicMensuel: 'nopat / (capex + bfr - tresorerie)',
        roicAnnuel: 'Math.pow(1 + roicMensuel, 12) - 1',
        beneficeNetMensuel: 'beneficeTotal - chargesTotales',
        vanFluxOperationnels: '0', // Sera calculé avec boucle DCF
        vanValeurTerminale: 'valeurTerminale / Math.pow(1 + tauxActualisation, dureeAnalyse)',
        investissementInitial: 'capex + bfr',
        van: 'vanFluxOperationnels + vanValeurTerminale - investissementInitial'
      });
      alert('Formules réinitialisées !');
    }
  };

  // Fonction pour évaluer une formule personnalisée
  const evaluerFormule = (formule, variables) => {
    try {
      // Créer une fonction qui évalue la formule avec les variables disponibles
      const func = new Function(...Object.keys(variables), `return ${formule}`);
      return func(...Object.values(variables));
    } catch (error) {
      console.error('Erreur lors de l\'évaluation de la formule:', formule, error);
      return 0;
    }
  };

  const margeMoyenneVentes = calculerAgregats().margeMoyenneVentes;
  const adjustedVolume = getAdjustedVolume();
  const adjustedProduits = getAdjustedRepartitions();
  
  // Calcul des charges totales (SANS amortissements - ils sont gérés séparément dans D&A)
  const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges();
  // Les amortissements ne sont plus inclus ici pour éviter la double comptabilisation
  // const amortissementChargesFixes = getNumericChargesFixes() / getNumericDureeAmortissement(); // Amortissement sur la durée définie (maintenant 0)
  // const amortissementFixeMensuel = getNumericAmortissementAnnuel() / 12; // Amortissement mensuel modifiable
  const chargesTotales = chargesMensuelles; // Charges opérationnelles uniquement
  
  // Utiliser les nouvelles formules standardisées
  const produitsAvecCalculs = Object.entries(produits).map(([nom, data]) => {
    const agregats = calculerAgregats();
    const metriques = agregats.detailsProduits[nom] || { benefice: 0, margeBrute: 0 };
    
    return { 
      nom, 
      ...data, 
      margeBrute: metriques.margeBrute, 
      benefice: metriques.benefice 
    };
  });

  // Calcul avec les données de simulation (utilise maintenant calculerAgregats())
  
  const produitsAvecCalculsSimulation = Object.entries(adjustedProduits).map(([nom, data]) => {
    const agregats = calculerAgregats(); // Utilise déjà les volumes ajustés quand applicable
    const metriques = agregats.detailsProduits[nom] || { benefice: 0, margeBrute: 0 };
    
    return { 
      nom, 
      ...data, 
      margeBrute: metriques.margeBrute, 
      benefice: metriques.benefice 
    };
  });

  // Utiliser les données appropriées selon l'onglet actif
  const produitsActifs = getNumericAdditionalVolume() > 0 ? produitsAvecCalculsSimulation : produitsAvecCalculs;
  const volumeActif = getNumericAdditionalVolume() > 0 ? adjustedVolume : getNumericVolume();
  
  const chartData = produitsActifs.map(p => ({
    nom: p.nom,
    benefice: Math.round(p.benefice),
    marge: p.margeBrute * 100,
    repartition: p.repartition * 100,
    volume: Math.round(p.repartition * volumeActif)
  }));

  const pieColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];

  // Fonction helper pour obtenir le bénéfice total approprié selon l'onglet
  const getBeneficeTotalActif = () => {
    const agregats = calculerAgregats();
    console.log(`💰 BÉNÉFICE TOTAL ACTUEL (Interface): ${agregats.beneficeTotal.toLocaleString()} FCFA`);
    return agregats.beneficeTotal;
  };

  // Calculs financiers avancés
  const calculerEBIT = () => {
    const resultats = calculerChargesEtResultats();
    return resultats.ebit;
  };

  const calculerEBITDA = () => {
    const resultats = calculerChargesEtResultats();
    return resultats.ebitda;
  };

  const calculerNOPAT = () => {
    const resultats = calculerChargesEtResultats();
    return resultats.nopat;
  };

  // Calcul du ROI traditionnel (Return on Investment)
  const calculerROI = () => {
    const investissement = getNumericCapex(); // CAPEX comme investissement initial
    const beneficeNetMensuel = calculerEBIT(); // EBIT comme proxy du bénéfice net
    const beneficeNetAnnuel = beneficeNetMensuel * 12;
    
    if (investissement === 0) return { mensuel: 0, annuel: 0 };
    
    return {
      mensuel: (beneficeNetMensuel / investissement), // Ratio sans multiplication par 100
      annuel: (beneficeNetAnnuel / investissement)   // Ratio sans multiplication par 100
    };
  };

  // Calcul du ROIC (Return on Invested Capital)
  const calculerROIC = () => {
    // Capital investi net = CAPEX + BFR - Trésorerie excédentaire
    const capitalInvesti = getNumericCapex() + getNumericBfr() - getNumericTresorerie();
    
    if (capitalInvesti === 0) return { mensuel: 0, annuel: 0 };
    
    // Obtenir NOPAT depuis les calculs standardisés
    const resultats = calculerChargesEtResultats();
    
    // Variables disponibles pour les formules ROIC personnalisées
    const variables = {
      beneficeTotal: resultats.beneficeTotal,
      chargesMensuelles: resultats.chargesMensuelles,
      chargesTotales: resultats.chargesMensuelles,
      daMensuel: resultats.daMensuel,
      tauxImposition: getNumericTauxImposition(),
      capex: getNumericCapex(),
      bfr: getNumericBfr(),
      tresorerie: getNumericTresorerie(),
      ebitda: resultats.ebitda,
      ebit: resultats.ebit,
      nopat: resultats.nopat
    };
    
    // Calculer ROIC Mensuel (avec formule personnalisée si définie)
    let roicMensuel;
    if (formulesPersonnalisees.roicMensuel && formulesPersonnalisees.roicMensuel.trim()) {
      try {
        roicMensuel = evaluerFormule(formulesPersonnalisees.roicMensuel, variables);
      } catch (error) {
        console.warn('Erreur dans la formule ROIC Mensuel personnalisée:', error);
        roicMensuel = resultats.nopat / capitalInvesti; // Formule par défaut
      }
    } else {
      roicMensuel = resultats.nopat / capitalInvesti; // Formule par défaut
    }
    
    // Ajouter ROIC mensuel aux variables pour le calcul annuel
    variables.roicMensuel = roicMensuel;
    
    // Calculer ROIC Annuel (avec formule personnalisée si définie)
    let roicAnnuel;
    if (formulesPersonnalisees.roicAnnuel && formulesPersonnalisees.roicAnnuel.trim()) {
      try {
        roicAnnuel = evaluerFormule(formulesPersonnalisees.roicAnnuel, variables);
      } catch (error) {
        console.warn('Erreur dans la formule ROIC Annuel personnalisée:', error);
        roicAnnuel = Math.pow(1 + roicMensuel, 12) - 1; // Formule par défaut
      }
    } else {
      roicAnnuel = Math.pow(1 + roicMensuel, 12) - 1; // Formule par défaut
    }
    
    return {
      mensuel: roicMensuel,
      annuel: roicAnnuel
    };
  };

  const calculerFCF = () => {
    const fcfData = calculerFCFStandardise();
    
    console.log('=== CALCUL FCF STANDARDISÉ ===');
    console.log(`Volume total: ${fcfData.volumeTotal.toLocaleString()} FCFA`);
    console.log(`Bénéfice brut total: ${fcfData.beneficeTotal.toLocaleString()} FCFA`);
    console.log(`Charges mensuelles: ${fcfData.chargesMensuelles.toLocaleString()} FCFA`);
    console.log(`EBITDA: ${fcfData.ebitda.toLocaleString()} FCFA`);
    console.log(`D&A mensuel: ${fcfData.daMensuel.toLocaleString()} FCFA`);
    console.log(`EBIT: ${fcfData.ebit.toLocaleString()} FCFA`);
    console.log(`NOPAT: ${fcfData.nopat.toLocaleString()} FCFA`);
    console.log(`FCF mensuel (NOPAT + D&A): ${fcfData.fcfMensuel.toLocaleString()} FCFA`);
    console.log(`FCF annuel: ${fcfData.fcfAnnuel.toLocaleString()} FCFA`);
    console.log('===============================');
    
    return fcfData.fcfAnnuel;
  };

  // 5) DCF et valorisation selon nouvelles formules
  const calculerDCFStandardise = () => {
    const fcfData = calculerFCFStandardise();
    
    // Paramètres (annuel → mensuel)
    const r = (getNumericWacc() || getNumericTauxActualisationAnnuel()) / 100;
    const r_m = Math.pow(1 + r, 1/12) - 1;
    const g = getNumericCroissanceTerminale() / 100;
    const g_m = Math.pow(1 + g, 1/12) - 1;
    const n = getNumericDureeAnalyse();
    
    // Investissement initial I0 = capex + bfr
    const I0 = getNumericCapex() + getNumericBfr();
    
    // Valeur terminale (fin mois n)
    const valeurTerminale = fcfData.fcfMensuel * (1 + g_m) / (r_m - g_m);
    
    // Variables de base disponibles pour les formules personnalisées
    const variables = {
      beneficeTotal: fcfData.beneficeTotal,
      chargesMensuelles: fcfData.chargesMensuelles,
      chargesTotales: fcfData.chargesMensuelles,
      daMensuel: fcfData.daMensuel,
      tauxImposition: getNumericTauxImposition(),
      capex: getNumericCapex(),
      bfr: getNumericBfr(),
      tresorerie: getNumericTresorerie(),
      ebitda: fcfData.ebitda,
      ebit: fcfData.ebit,
      nopat: fcfData.nopat,
      fcfMensuel: fcfData.fcfMensuel,
      fcfAnnuel: fcfData.fcfAnnuel,
      valeurTerminale,
      tauxActualisation: r_m,
      croissanceTerminale: g_m,
      dureeAnalyse: n
    };
    
    // 1. Calculer vanFluxOperationnels (avec formule personnalisée si définie)
    let vanFluxOperationnels;
    if (formulesPersonnalisees.vanFluxOperationnels && formulesPersonnalisees.vanFluxOperationnels.trim() && formulesPersonnalisees.vanFluxOperationnels !== '0') {
      try {
        vanFluxOperationnels = evaluerFormule(formulesPersonnalisees.vanFluxOperationnels, variables);
      } catch (error) {
        console.warn('Erreur dans la formule VAN Flux Opérationnels personnalisée:', error);
        // Calcul par défaut avec boucle
        vanFluxOperationnels = 0;
        for (let t = 1; t <= n; t++) {
          vanFluxOperationnels += fcfData.fcfMensuel / Math.pow(1 + r_m, t);
        }
      }
    } else {
      // Calcul par défaut avec boucle DCF
      vanFluxOperationnels = 0;
      for (let t = 1; t <= n; t++) {
        vanFluxOperationnels += fcfData.fcfMensuel / Math.pow(1 + r_m, t);
      }
    }
    
    // Ajouter vanFluxOperationnels aux variables
    variables.vanFluxOperationnels = vanFluxOperationnels;
    
    // 2. Calculer vanValeurTerminale (avec formule personnalisée si définie)
    let vanValeurTerminale;
    if (formulesPersonnalisees.vanValeurTerminale && formulesPersonnalisees.vanValeurTerminale.trim()) {
      try {
        vanValeurTerminale = evaluerFormule(formulesPersonnalisees.vanValeurTerminale, variables);
      } catch (error) {
        console.warn('Erreur dans la formule VAN Valeur Terminale personnalisée:', error);
        vanValeurTerminale = valeurTerminale / Math.pow(1 + r_m, n); // Formule par défaut
      }
    } else {
      vanValeurTerminale = valeurTerminale / Math.pow(1 + r_m, n); // Formule par défaut
    }
    
    // Ajouter vanValeurTerminale aux variables
    variables.vanValeurTerminale = vanValeurTerminale;
    
    // 3. Calculer investissementInitial (avec formule personnalisée si définie)
    let investissementInitial;
    if (formulesPersonnalisees.investissementInitial && formulesPersonnalisees.investissementInitial.trim()) {
      try {
        investissementInitial = evaluerFormule(formulesPersonnalisees.investissementInitial, variables);
      } catch (error) {
        console.warn('Erreur dans la formule Investissement Initial personnalisée:', error);
        investissementInitial = I0; // Formule par défaut
      }
    } else {
      investissementInitial = I0; // Formule par défaut
    }
    
    // Ajouter investissementInitial aux variables
    variables.investissementInitial = investissementInitial;
    
    // 4. Calculer VAN finale (avec formule personnalisée si définie)
    let van;
    if (formulesPersonnalisees.van && formulesPersonnalisees.van.trim()) {
      try {
        van = evaluerFormule(formulesPersonnalisees.van, variables);
      } catch (error) {
        console.warn('Erreur dans la formule VAN personnalisée:', error);
        van = vanFluxOperationnels + vanValeurTerminale - investissementInitial; // Formule par défaut
      }
    } else {
      van = vanFluxOperationnels + vanValeurTerminale - investissementInitial; // Formule par défaut
    }
    
    // Enterprise Value
    const enterpriseValue = vanFluxOperationnels + vanValeurTerminale;
    
    // Equity Value
    const equityValue = enterpriseValue - getNumericDette() + getNumericTresorerie();
    
    // Indice de profitabilité
    const indiceProfitabilite = enterpriseValue / I0;
    
    // Payback simple (mois)
    const paybackSimple = I0 / fcfData.fcfMensuel;
    
    // Payback actualisé (mois)
    let cumulActualise = 0;
    let paybackActualise = null;
    for (let t = 1; t <= n; t++) {
      cumulActualise += fcfData.fcfMensuel / Math.pow(1 + r_m, t);
      if (cumulActualise >= I0 && paybackActualise === null) {
        paybackActualise = t;
        break;
      }
    }
    
    return {
      ...fcfData,
      r,
      r_m,
      g,
      g_m,
      n,
      I0,
      valeurTerminale,
      van,
      enterpriseValue,
      equityValue,
      indiceProfitabilite,
      paybackSimple,
      paybackActualise
    };
  };

  const calculerValeurTerminale = () => {
    const dcfData = calculerDCFStandardise();
    
    console.log('=== CALCUL VALEUR TERMINALE STANDARDISÉ ===');
    console.log(`FCF mensuel: ${dcfData.fcfMensuel.toLocaleString()} FCFA`);
    console.log(`Taux mensuel (r_m): ${(dcfData.r_m * 100).toFixed(4)}%`);
    console.log(`Croissance mensuelle (g_m): ${(dcfData.g_m * 100).toFixed(4)}%`);
    console.log(`Valeur Terminale: ${dcfData.valeurTerminale.toLocaleString()} FCFA`);
    console.log('===========================================');
    
    return dcfData.valeurTerminale;
  };

  const calculerEnterpriseValue = () => {
    const dcfData = calculerDCFStandardise();
    
    console.log('=== CALCUL ENTERPRISE VALUE STANDARDISÉ ===');
    console.log(`Enterprise Value: ${dcfData.enterpriseValue.toLocaleString()} FCFA`);
    console.log('===========================================');
    
    return dcfData.enterpriseValue;
  };

  const calculerEquityValue = () => {
    const dcfData = calculerDCFStandardise();
    
    console.log('=== CALCUL EQUITY VALUE STANDARDISÉ ===');
    console.log(`Equity Value: ${dcfData.equityValue.toLocaleString()} FCFA`);
    console.log('=======================================');
    
    return dcfData.equityValue;
  };

  // Calculs DCF
  const tauxActualisationMensuel = Math.pow(1 + getNumericTauxActualisationAnnuel() / 100, 1/12) - 1;
  
  // Calcul des flux de trésorerie mensuels selon nouvelles formules
  const calculerFluxDCF = () => {
    const flux = [];
    const dcfData = calculerDCFStandardise();
    
    // Investissement initial I0 = CAPEX + BFR (décaissement à t0)
    const investissementInitial = -dcfData.I0;
    
    // Mois 0 : investissement initial
    flux.push({
      mois: 0,
      nopat: 0,
      depreciation: 0,
      capex: dcfData.I0,  // Tout l'investissement initial
      deltaBfr: 0,
      fcf: investissementInitial,
      fcfActualise: investissementInitial,
      cumulActualise: investissementInitial
    });
    
    // Mois 1 à dureeAnalyse : FCF = NOPAT + D&A (pas de CAPEX ni ΔBFR supplémentaires)
    let cumulActualise = investissementInitial;
    for (let mois = 1; mois <= dcfData.n; mois++) {
      const facteurActualisation = Math.pow(1 + dcfData.r_m, -mois);
      const fcfActualise = dcfData.fcfMensuel * facteurActualisation;
      cumulActualise += fcfActualise;
      
      flux.push({
        mois,
        nopat: dcfData.nopat,
        depreciation: dcfData.daMensuel,
        capex: 0,  // Pas de CAPEX mensuel après t0
        deltaBfr: 0,  // Pas de ΔBFR mensuel après t0
        fcf: dcfData.fcfMensuel,
        fcfActualise,
        cumulActualise
      });
    }
    
    return flux;
  };
  
  const fluxDCF = calculerFluxDCF();
  
  // Calcul des indicateurs DCF
  const calculerIndicateursDCF = () => {
    const dcfData = calculerDCFStandardise();
    
    // TRI mensuel (approximation par itération) - basé sur FCF
    const calculerTRI = () => {
      let triMensuel = 0.01; // 1% par mois comme point de départ
      const tolerance = 0.0001;
      const maxIterations = 100;
      
      for (let i = 0; i < maxIterations; i++) {
        let vanTest = -dcfData.I0; // Investissement initial négatif
        
        for (let mois = 1; mois <= dcfData.n; mois++) {
          const fcf = dcfData.fcfMensuel;
          const facteurActualisation = Math.pow(1 + triMensuel, -mois);
          vanTest += fcf * facteurActualisation;
        }
        
        // Ajouter la valeur terminale
        const vtActualisee = dcfData.valeurTerminale / Math.pow(1 + triMensuel, dcfData.n);
        vanTest += vtActualisee;
        
        if (Math.abs(vanTest) < tolerance) {
          break;
        }
        
        // Ajustement du TRI
        if (vanTest > 0) {
          triMensuel += 0.001;
        } else {
          triMensuel -= 0.001;
        }
      }
      
      return triMensuel;
    };
    
    const triMensuel = calculerTRI();
    const triAnnuel = Math.pow(1 + triMensuel, 12) - 1;
    
    return {
      van: dcfData.van,
      triMensuel,
      triAnnuel,
      indiceProfitabilite: dcfData.indiceProfitabilite,
      paybackActualise: dcfData.paybackActualise === null ? 'Jamais' : dcfData.paybackActualise
    };
  };
  
  const indicateursDCF = calculerIndicateursDCF();

  // Calcul des flux DCF pour la simulation avec volume supplémentaire
  const calculerFluxDCFSimulation = () => {
    // Calculer les métriques avec volume supplémentaire
    const agregatsSimulation = calculerAgregats(); // Utilise déjà les volumes ajustés
    const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + 
                             getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + 
                             getNumericLoyer() + getNumericAutresCharges();
    const ebitdaSimulation = agregatsSimulation.beneficeTotal - chargesMensuelles;
    const daMensuel = getNumericDepreciationAmortissement() / 12;
    const ebitSimulation = ebitdaSimulation - daMensuel;
    const nopatSimulation = ebitSimulation * (1 - getNumericTauxImposition() / 100);
    const fcfMensuelSimulation = nopatSimulation + daMensuel; // FCF = NOPAT + D&A
    
    // Paramètres DCF
    const r = (getNumericWacc() || getNumericTauxActualisationAnnuel()) / 100;
    const r_m = Math.pow(1 + r, 1/12) - 1;
    const n = getNumericDureeAnalyse();
    const I0 = getNumericCapex() + getNumericBfr();
    
    const flux = [];
    const investissementInitial = -I0;
    
    // Mois 0 : investissement initial
    flux.push({
      mois: 0,
      nopat: 0,
      depreciation: 0,
      capex: I0,
      deltaBfr: 0,
      fcf: investissementInitial,
      fcfActualise: investissementInitial,
      cumulActualise: investissementInitial
    });
    
    // Mois 1 à dureeAnalyse
    let cumulActualise = investissementInitial;
    for (let mois = 1; mois <= n; mois++) {
      const facteurActualisation = Math.pow(1 + r_m, -mois);
      const fcfActualise = fcfMensuelSimulation * facteurActualisation;
      cumulActualise += fcfActualise;
      
      flux.push({
        mois,
        nopat: nopatSimulation,
        depreciation: daMensuel,
        capex: 0,  // Pas de CAPEX mensuel après t0
        deltaBfr: 0,  // Pas de ΔBFR mensuel après t0
        fcf: fcfMensuelSimulation,
        fcfActualise,
        cumulActualise
      });
    }
    
    return flux;
  };
  
  const fluxDCFSimulation = calculerFluxDCFSimulation();
  
  // Calcul des indicateurs DCF pour la simulation
  const calculerIndicateursDCFSimulation = () => {
    const investissementInitial = Math.abs(fluxDCFSimulation[0].fcf);
    
    // VAN (NPV) - basé sur FCF actualisé
    const van = fluxDCFSimulation.reduce((sum, flux) => sum + flux.fcfActualise, 0);
    
    // TRI mensuel (approximation par itération) - basé sur FCF
    const calculerTRI = () => {
      let triMensuel = 0.01; // 1% par mois comme point de départ
      const tolerance = 0.0001;
      const maxIterations = 100;
      
      for (let i = 0; i < maxIterations; i++) {
        let vanTest = fluxDCFSimulation[0].fcf; // Investissement initial
        
        for (let mois = 1; mois <= getNumericDureeAnalyse(); mois++) {
          const fcf = fluxDCFSimulation[mois].fcf;
          const facteurActualisation = Math.pow(1 + triMensuel, -mois);
          vanTest += fcf * facteurActualisation;
        }
        
        if (Math.abs(vanTest) < tolerance) {
          break;
        }
        
        // Ajustement du TRI
        if (vanTest > 0) {
          triMensuel += 0.001;
        } else {
          triMensuel -= 0.001;
        }
      }
      
      return triMensuel;
    };
    
    const triMensuel = calculerTRI();
    const triAnnuel = Math.pow(1 + triMensuel, 12) - 1;
    
    // Indice de profitabilité
    const indiceProfitabilite = (van + investissementInitial) / investissementInitial;
    
    // Délai de récupération actualisé - basé sur FCF cumulé actualisé
    const paybackActualise = fluxDCFSimulation.findIndex(flux => flux.cumulActualise >= 0);
    
    return {
      van,
      triMensuel,
      triAnnuel,
      indiceProfitabilite,
      paybackActualise: paybackActualise === -1 ? 'Jamais' : paybackActualise
    };
  };
  
  const indicateursDCFSimulation = calculerIndicateursDCFSimulation();

  // Fonction de connexion
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'Mata' && password === 'Matix@2025') {
      setIsAuthenticated(true);
      setLoginError('');
      
      // Sauvegarder les identifiants dans les cookies (1 jour)
      setCookie('mata_authenticated', 'true', 1);
      setCookie('mata_username', username, 1);
      setCookie('mata_password', password, 1);
      
      console.log('🍪 Identifiants sauvegardés dans les cookies pour 1 jour');
    } else {
      setLoginError('Identifiants incorrects. Veuillez réessayer.');
    }
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setLoginError('');
    
    // Effacer les cookies
    deleteCookie('mata_authenticated');
    deleteCookie('mata_username');
    deleteCookie('mata_password');
    
    console.log('🍪 Cookies d\'authentification effacés');
  };

  // Écran de connexion
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">MATA Trading</h1>
            <p className="text-gray-600">Simulateur de Rentabilité</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
            
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{loginError}</p>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Se connecter
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Accès réservé aux utilisateurs autorisés
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                onChange={(e) => setVolume(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foie, Yell, Filet (Bœuf/Veau)</label>
              <input 
                type="number"
                value={gainProduitsNobleFoieYellParKg}
                onChange={(e) => setGainProduitsNobleFoieYellParKg(e.target.value)}
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
                onChange={(e) => setPeration(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">{(getNumericPeration() * 100).toFixed(1)}%</div>
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

      

        {/* Actions rapides étendues */}
      <div className="bg-gray-100 p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-700">⚡ Actions Rapides</h3>
        <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Produit cible:</div>
              <select 
                value={selectedProductForPricing}
                onChange={(e) => setSelectedProductForPricing(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                style={{ fontSize: '16px' }}
              >
                <option value="Tous">Tous les produits</option>
                <option value="Boeuf">Bœuf</option>
                <option value="Veau">Veau</option>
                <option value="Ovin">Ovin</option>
                <option value="Poulet">Poulet</option>
                <option value="Oeuf">Œuf</option>
              </select>
            </div>
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
                      <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Export/Import/PDF:</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportData} className="px-3 py-2 sm:px-4 sm:py-3 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 min-h-[44px] min-w-[80px]">📤 Exporter</button>
                <label className="px-3 py-2 sm:px-4 sm:py-3 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 min-h-[44px] min-w-[80px] cursor-pointer text-center">
                  📥 Importer
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
                <button onClick={generatePDF} className="px-3 py-2 sm:px-4 sm:py-3 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 min-h-[44px] min-w-[80px]">📄 PDF</button>
                <button onClick={resetPrix} className="px-3 py-2 sm:px-4 sm:py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600 min-h-[44px] min-w-[80px]">🔄 Reset</button>
              </div>
            </div>
            {getNumericAdditionalVolume() > 0 && (
            <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Simulation Volume:</div>
              <div className="flex flex-wrap gap-2">
                  <button onClick={forceMainSimulation} className="px-3 py-2 sm:px-4 sm:py-3 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 min-h-[44px] min-w-[80px]">🏠 Retour Principal</button>
              </div>
            </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Répartitions:</div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    synchronizeRepartitions();
                    alert('Répartitions synchronisées ! Boeuf: 70.18%, Poulet: 10.29%, etc.');
                  }} 
                  className="px-3 py-2 sm:px-4 sm:py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600 min-h-[44px] min-w-[80px] font-bold"
                >
                  🔄 CORRIGER RÉPARTITIONS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Résumé global */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📊 Résumé Global</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
            <div>
              <div className="text-sm text-gray-600">Volume point de vente:</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800">{additionalVolume > 0 ? adjustedVolume.toLocaleString() : volume.toLocaleString()}</div>
            {additionalVolume > 0 && (
              <div className="text-xs text-blue-600">(+{additionalVolume.toLocaleString()})</div>
            )}
            <div className="text-xs text-orange-600 italic">Hypothèse de travail</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                Bénéfice Net Mensuel:
                <button
                  onClick={() => setBeneficeExplicationVisible(!beneficeExplicationVisible)}
                  className="w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600 transition-colors flex items-center justify-center"
                  title="Explication du calcul du bénéfice net mensuel"
                >
                  i
                </button>
              </div>
              <div className={`text-lg sm:text-xl font-bold ${
                calculerBeneficeNetMensuel().beneficeNetMensuel > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.round(calculerBeneficeNetMensuel().beneficeNetMensuel).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">FCFA (après charges)</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                Marge Moyenne (ventes):
                <button
                  onClick={() => setMargeExplicationVisible(!margeExplicationVisible)}
                  className="w-5 h-5 bg-purple-500 text-white rounded-full text-xs font-bold hover:bg-purple-600 transition-colors flex items-center justify-center"
                  title="Explication du calcul de la marge moyenne sur ventes"
                >
                  i
                </button>
              </div>
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              {(margeMoyenneVentes * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              {margeMoyenneVentes.toFixed(4)} FCFA/FCFA - Bénéfice / Volume total
            </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Bénéfice total mensuel:</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {Math.round(calculerAgregats().beneficeTotal).toLocaleString()} FCFA
              </div>
              <div className="text-xs text-gray-500">Correspond au 6.5%</div>
            </div>
{/* ROI Annuel masqué - seul ROIC affiché */}
            <div>
              <div className="text-sm text-gray-600">ROIC Annuel:</div>
              <div className={`text-lg sm:text-xl font-bold ${
                calculerROIC().annuel > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(calculerROIC().annuel * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Retour sur capital investi</div>
            </div>
          </div>
        </div>

        {/* Explication détaillée de la marge moyenne */}
        {margeExplicationVisible && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                🧮 Calcul Détaillé de la Marge Moyenne (ventes)
                <span className="text-sm font-normal text-blue-600">
                  ({(() => {
                    const explication = genererExplicationMarge();
                    return explication.estSimulation ? 'Mode Simulation' : 'Mode Principal';
                  })()})
                </span>
              </h3>
              <button
                onClick={() => setMargeExplicationVisible(false)}
                className="text-blue-500 hover:text-blue-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const explication = genererExplicationMarge();
              
              return (
                <div className="space-y-6">
                  {/* Contexte */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">📊 Contexte</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Volume de base:</span>
                        <div className="font-mono text-lg text-blue-700">{explication.volumeOriginal.toLocaleString()} FCFA</div>
                      </div>
                      {explication.estSimulation && (
                        <>
                          <div>
                            <span className="text-gray-600">Volume ajouté ({explication.produitAjoute}):</span>
                            <div className="font-mono text-lg text-green-600">+{explication.volumeAjoute.toLocaleString()} FCFA</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Volume total:</span>
                            <div className="font-mono text-lg text-purple-600">{explication.volumeTotal.toLocaleString()} FCFA</div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <h5 className="font-medium text-blue-800 mb-2">⚙️ Paramètres</h5>
                      <div className="text-sm space-y-1">
                        <div>• Pération (Bœuf/Veau): <span className="font-mono">{explication.parametres.perationPourcentage}%</span></div>
                        <div>• Abats par Kg: <span className="font-mono">{explication.parametres.abatsParKg} FCFA</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Détail par produit */}
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">🥩 Calcul par Produit</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b-2 border-blue-200 bg-blue-50">
                            <th className="text-left py-2 px-2 font-semibold text-blue-800">Produit</th>
                            <th className="text-right py-2 px-2 font-semibold text-blue-800">Volume</th>
                            <th className="text-right py-2 px-2 font-semibold text-blue-800">Part %</th>
                            <th className="text-left py-2 px-2 font-semibold text-blue-800">Calcul Bénéfice</th>
                            <th className="text-right py-2 px-2 font-semibold text-blue-800">Marge</th>
                            <th className="text-right py-2 px-2 font-semibold text-blue-800">Bénéfice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {explication.detailsProduits.map((produit, index) => (
                            <tr key={index} className={`border-b border-blue-100 ${index % 2 === 0 ? 'bg-blue-25' : 'bg-white'} ${!produit.estEditable ? 'bg-yellow-50' : ''}`}>
                              <td className="py-2 px-2 font-medium text-gray-800">
                                {produit.nom}
                                {produit.hasAbats && <span className="text-orange-500 text-xs ml-1">*</span>}
                                {!produit.estEditable && <span className="text-gray-500 text-xs ml-1">†</span>}
                              </td>
                              <td className="text-right py-2 px-2 font-mono text-gray-700">{produit.volumeProduit.toLocaleString()}</td>
                              <td className="text-right py-2 px-2 font-mono text-blue-600">{produit.repartitionPourcentage}%</td>
                              <td className="py-2 px-2 font-mono text-xs text-gray-600">{produit.calculDetail}</td>
                              <td className="text-right py-2 px-2 font-mono font-semibold text-green-600">{produit.margePourcentage}%</td>
                              <td className="text-right py-2 px-2 font-mono font-semibold text-purple-600">{produit.beneficeArrondi.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs mt-2 space-y-1">
                      <div className="text-orange-600">* Produits avec abats (Foie, Yell, Filet)</div>
                      <div className="text-gray-500">† Produits non-éditables (marge = moyenne des produits éditables)</div>
                    </div>
                  </div>

                  {/* Formule finale */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-3">🎯 Calcul Final</h4>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <div className="font-medium text-purple-700 mb-2">Formule: Marge Moyenne (ventes) = Σ(Bénéfices) / Volume Total</div>
                        <div className="text-xs text-purple-600 mb-2">Somme de tous les bénéfices divisée par le volume total</div>
                        <div className="font-mono text-sm bg-white p-3 rounded border">
                          <div>Somme des bénéfices = {explication.detailsProduits.map(p => p.beneficeArrondi.toLocaleString()).join(' + ')}</div>
                          <div className="mt-2 text-purple-600">= {Math.round(explication.beneficeTotal).toLocaleString()} FCFA</div>
                          <div className="mt-2 text-blue-600">Volume Total = {explication.volumeTotal.toLocaleString()} FCFA</div>
                          <div className="mt-2 text-green-600 font-semibold">Marge = {Math.round(explication.beneficeTotal).toLocaleString()} / {explication.volumeTotal.toLocaleString()} = {explication.margeFinalePourcentage}%</div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded border-2 border-purple-300">
                        <div className="text-center">
                          <div className="text-sm text-purple-600 mb-1">Marge Moyenne (ventes)</div>
                          <div className="text-2xl font-bold text-purple-700">{explication.margeFinalePourcentage}%</div>
                          <div className="text-xs text-purple-500 mt-1">{(explication.margeFinale).toFixed(4)} FCFA/FCFA</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-2">💡 Pourquoi cette méthode ?</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>• <strong>Marge sur ventes :</strong> Calcule directement le bénéfice par FCFA de chiffre d'affaires</div>
                      <div>• <strong>Formule simple :</strong> Somme des bénéfices ÷ Volume total = marge moyenne</div>
                      <div>• <strong>Cohérence DCF :</strong> Compatible avec les calculs financiers (ROI, VAN, etc.)</div>
                      <div>• <strong>Indicateur de rentabilité :</strong> Montre directement la rentabilité de chaque FCFA vendu</div>
                      <div>• <strong>Seuil de rentabilité :</strong> Permet de calculer facilement le CA minimum nécessaire</div>
                      {explication.estSimulation && (
                        <div className="text-purple-600">• <strong>Mode simulation :</strong> Montre l'impact des nouvelles répartitions de volume</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Explication détaillée du bénéfice net mensuel */}
        {beneficeExplicationVisible && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                💰 Calcul Détaillé du Bénéfice Net Mensuel
                <span className="text-sm font-normal text-green-600">
                  ({getNumericAdditionalVolume() > 0 ? 'Mode Simulation' : 'Mode Principal'})
                </span>
              </h3>
              <button
                onClick={() => setBeneficeExplicationVisible(false)}
                className="text-green-500 hover:text-green-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Formule principale */}
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">🧮 Formule</h4>
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <div className="text-xl font-bold text-green-800">
                    Bénéfice Net Mensuel = Marge brute - Charges Totales
                  </div>
                  <div className="text-lg font-mono text-green-700 mt-2">
                    {Math.round(getBeneficeTotalActif() - chargesTotales).toLocaleString()} = {Math.round(getBeneficeTotalActif()).toLocaleString()} - {Math.round(chargesTotales).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Détail du Bénéfice Total */}
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">📊 Détail du Bénéfice Total ({Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-green-200 bg-green-50">
                        <th className="text-left py-2 px-2 font-semibold text-green-800">Produit</th>
                        <th className="text-right py-2 px-2 font-semibold text-green-800">Répartition</th>
                        <th className="text-right py-2 px-2 font-semibold text-green-800">Marge</th>
                        <th className="text-right py-2 px-2 font-semibold text-green-800">Volume</th>
                        <th className="text-right py-2 px-2 font-semibold text-green-800">Bénéfice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const produitsActifs = getNumericAdditionalVolume() > 0 ? 
                          Object.entries(getAdjustedRepartitions()) : Object.entries(produits);
                        const volumeActif = getNumericAdditionalVolume() > 0 ? 
                          getAdjustedVolume() : getNumericVolume();
                        
                        return produitsActifs.map(([nom, data], index) => {
                          let margeBrute;
                          if (data.editable && data.prixAchat && data.prixVente) {
                            margeBrute = calculerMargeBrute(data);
                          } else {
                            // Calculer la marge moyenne des produits éditables
                            let margeMoyenneEditables = 0;
                            let nombreEditables = 0;
                            produitsActifs.forEach(([nomProd, dataProd]) => {
                              if (dataProd.editable && dataProd.prixAchat && dataProd.prixVente) {
                                let marge;
                                if (dataProd.hasAbats) {
                                  marge = ((dataProd.prixVente * (1 - getNumericPeration()) + getNumericGainProduitsNobleFoieYellParKg()) / dataProd.prixAchat) - 1;
                                } else {
                                  marge = (dataProd.prixVente / dataProd.prixAchat) - 1;
                                }
                                margeMoyenneEditables += marge;
                                nombreEditables++;
                              }
                            });
                            margeBrute = nombreEditables > 0 ? margeMoyenneEditables / nombreEditables : 0;
                          }
                          
                          const benefice = calculerBenefice(margeBrute, data.repartition, volumeActif);
                          
                          return (
                            <tr key={nom} className={`border-b border-green-100 ${index % 2 === 0 ? 'bg-green-25' : 'bg-white'} ${!data.editable ? 'bg-yellow-50' : ''}`}>
                              <td className="py-2 px-2 font-medium text-gray-800">
                                {nom}
                                {data.hasAbats && <span className="text-orange-500 text-xs ml-1">🥩</span>}
                                {!data.editable && <span className="text-gray-500 text-xs ml-1">†</span>}
                              </td>
                              <td className="text-right py-2 px-2 font-mono text-blue-600">{(data.repartition * 100).toFixed(1)}%</td>
                              <td className="text-right py-2 px-2 font-mono font-semibold text-green-600">{(margeBrute * 100).toFixed(2)}%</td>
                              <td className="text-right py-2 px-2 font-mono text-gray-700">{Math.round(data.repartition * volumeActif).toLocaleString()}</td>
                              <td className="text-right py-2 px-2 font-mono font-semibold text-green-700">{Math.round(benefice).toLocaleString()}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <div>🥩 = Avec Foie, Yell, Filet (pération incluse) • † = Calculé avec marge moyenne</div>
                  <div className="mt-1"><strong>Formule par produit :</strong> Bénéfice = Marge × Répartition × Volume Total</div>
                </div>
              </div>

              {/* Détail des Charges Totales */}
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">💸 Détail des Charges Totales ({Math.round(chargesTotales).toLocaleString()} FCFA)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">📅 Charges Mensuelles</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Salaire:</span>
                        <span className="font-mono">{getNumericSalaire().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Électricité:</span>
                        <span className="font-mono">{getNumericElectricite().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Eau:</span>
                        <span className="font-mono">{getNumericEau().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Internet:</span>
                        <span className="font-mono">{getNumericInternet().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sacs livraison:</span>
                        <span className="font-mono">{getNumericSacsLivraison().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transport:</span>
                        <span className="font-mono">{getNumericChargesTransport().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loyer:</span>
                        <span className="font-mono">{getNumericLoyer().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Autres:</span>
                        <span className="font-mono">{getNumericAutresCharges().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>Sous-total:</span>
                        <span className="font-mono text-blue-600">{Math.round(getNumericSalaire() + getNumericElectricite() + getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges()).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">🏗️ Amortissement</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Charges fixes:</span>
                        <span className="font-mono">{getNumericChargesFixes().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Durée amortissement:</span>
                        <span className="font-mono">{getNumericDureeAmortissement()} mois</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>Amortissement mensuel:</span>
                        <span className="font-mono text-orange-600">{Math.round(getNumericChargesFixes() / getNumericDureeAmortissement()).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <strong>Formule :</strong> Charges fixes ÷ Durée amortissement
                    </div>
                  </div>
                </div>
              </div>

              {/* Résumé final */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
                <h4 className="font-semibold text-green-800 mb-3">🎯 Résumé du Calcul</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• <strong>Bénéfice Total :</strong> Somme des bénéfices de tous les produits (marge × répartition × volume)</div>
                  <div>• <strong>Charges Totales :</strong> Charges mensuelles + amortissement des charges fixes</div>
                  <div>• <strong>Bénéfice Net :</strong> Ce qui reste après déduction de toutes les charges</div>
                  <div>• <strong>Réalisme économique :</strong> Inclut l'amortissement des investissements initiaux</div>
                  <div className="text-green-700 font-medium">• <strong>Résultat :</strong> {Math.round(getBeneficeTotalActif() - chargesTotales).toLocaleString()} FCFA disponibles par mois</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sélecteur de modèle ChatGPT */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-orange-800 mb-2">🤖 Modèle ChatGPT</h3>
              <p className="text-sm text-gray-600">Choisissez le modèle d'IA à utiliser pour les analyses</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={modeleChatGPT}
                onChange={(e) => setModeleChatGPT(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="gpt-5">GPT-5 (Dernière génération, le plus avancé)</option>
                <option value="gpt-4">GPT-4 (Plus avancé, plus cher)</option>
                <option value="gpt-4o">GPT-4o (Nouveau, équilibré)</option>
                <option value="gpt-4o-mini">GPT-4o-mini (Recommandé, économique)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Équilibré)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Rapide, économique)</option>
                <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K (Long contexte)</option>
              </select>
              <div className="text-xs text-gray-500">
                Modèle actuel: <span className="font-medium">{modeleChatGPT}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton d'interprétation IA */}
        {/* Bouton toggle pour les analyses IA */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-orange-800 mb-2">🤖 Analyses IA</h3>
              <p className="text-sm text-gray-600">Activez les analyses intelligentes pour obtenir des insights détaillés sur votre modèle de point de vente</p>
            </div>
            <button
              onClick={() => setAiAnalysisVisible(!aiAnalysisVisible)}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl"
            >
              {aiAnalysisVisible ? '🔒 Masquer Analyses IA' : '🤖 Afficher Analyses IA'}
            </button>
          </div>
        </div>

        {/* Section des analyses IA - visible seulement si aiAnalysisVisible est true */}
        {aiAnalysisVisible && (
          <>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-800 mb-2">💼 Analyse Point de Vente MATA Trading</h3>
                  <p className="text-sm text-gray-600">Générez une analyse de ce modèle de point de vente basé sur vos données réelles pour votre dossier de levée de fonds</p>
                </div>
                <button
                  onClick={genererInterpretation}
                  disabled={interpretationLoading}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    interpretationLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {interpretationLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyse en cours...
                    </div>
                  ) : (
                    '💼 Générer Analyse Point de Vente'
                  )}
                </button>
                
                {/* Bouton pour voir les données clés */}
                <button
                  onClick={() => setKeyDataVisible(!keyDataVisible)}
                  className="mt-3 w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl"
                >
                  {keyDataVisible ? '🔒 Masquer Key Data' : '🔑 Voir Key Data'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Section d'interprétation */}
        {aiAnalysisVisible && interpretationVisible && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">💼 Analyse Point de Vente MATA Trading - Levée de Fonds</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(interpretationText);
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Copier l'analyse"
                >
                  📋 Copier
                </button>
                <button
                  onClick={() => setInterpretationVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              {interpretationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Génération de l'analyse en cours...</p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {interpretationText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section d'affichage des données clés */}
        {aiAnalysisVisible && keyDataVisible && (
          <div className="bg-white border border-green-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800">🔑 Données Clés Utilisées dans les Analyses</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const keyData = genererKeyData();
                    const keyDataText = JSON.stringify(keyData, null, 2);
                    navigator.clipboard.writeText(keyDataText);
                  }}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  title="Copier les données clés"
                >
                  📋 Copier
                </button>
                <button
                  onClick={() => setKeyDataVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {(() => {
                const keyData = genererKeyData();
                return (
                  <>
                    {/* Données de base */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">📊 Données de Base</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Volume Point de Vente:</span>
                          <div className="font-mono text-lg">{keyData.volumePointVente.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Volume Supplémentaire:</span>
                          <div className="font-mono text-lg">{keyData.volumeSupplementaire.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Volume Total:</span>
                          <div className="font-mono text-lg">{keyData.volumeTotal.toLocaleString()} FCFA</div>
                        </div>
                      </div>
                    </div>

                    {/* Produits et marges */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-3">🥩 Produits et Marges</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-blue-200">
                              <th className="text-left py-2">Produit</th>
                              <th className="text-right py-2">Répartition</th>
                              <th className="text-right py-2">Prix Achat</th>
                              <th className="text-right py-2">Prix Vente</th>
                              <th className="text-right py-2">Marge Brute</th>
                              <th className="text-right py-2">Bénéfice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keyData.produits.map((produit, index) => (
                              <tr key={index} className="border-b border-blue-100">
                                <td className="py-2 font-medium">{produit.nom}</td>
                                <td className="text-right py-2">{(produit.repartition * 100).toFixed(2)}%</td>
                                <td className="text-right py-2 font-mono">{produit.prixAchat?.toLocaleString() || '-'}</td>
                                <td className="text-right py-2 font-mono">{produit.prixVente?.toLocaleString() || '-'}</td>
                                <td className="text-right py-2 font-mono">{produit.margeBrute?.toFixed(2)}%</td>
                                <td className="text-right py-2 font-mono">{produit.benefice?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-100 rounded">
                        <div className="font-semibold text-blue-800">Marge Moyenne (ventes): {(keyData.margeMoyenneVentes * 100).toFixed(1)}% - {Math.round(keyData.beneficeTotal).toLocaleString()} FCFA</div>
                      </div>
                    </div>

                    {/* Métriques financières */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-3">💰 Métriques Financières</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Marge brute:</span>
                          <div className="font-mono text-lg">{keyData.beneficeTotal.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">EBIT:</span>
                          <div className="font-mono text-lg">{keyData.ebit.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">EBITDA:</span>
                          <div className="font-mono text-lg">{keyData.ebitda.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">NOPAT:</span>
                          <div className="font-mono text-lg">{keyData.nopat.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">FCF:</span>
                          <div className="font-mono text-lg">{keyData.fcf.toLocaleString()} FCFA</div>
                        </div>

                        <div>
                          <span className="text-sm text-gray-600">ROIC Mensuel:</span>
                          <div className="font-mono text-lg">{(keyData.roicMensuel * 100).toFixed(2)}%</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">ROIC Annuel:</span>
                          <div className="font-mono text-lg">{(keyData.roicAnnuel * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Charges */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-3">💸 Charges</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Amortissement mensuel:</span>
                          <div className="font-mono text-lg">{Math.round(keyData.charges.totalAmortissement / 12).toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Salaire:</span>
                          <div className="font-mono text-lg">{keyData.charges.salaire.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Électricité:</span>
                          <div className="font-mono text-lg">{keyData.charges.electricite.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Eau:</span>
                          <div className="font-mono text-lg">{keyData.charges.eau.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Internet:</span>
                          <div className="font-mono text-lg">{keyData.charges.internet.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Sacs Livraison:</span>
                          <div className="font-mono text-lg">{keyData.charges.sacsLivraison.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Transport:</span>
                          <div className="font-mono text-lg">{keyData.charges.chargesTransport.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Loyer:</span>
                          <div className="font-mono text-lg">{keyData.charges.loyer.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Autres:</span>
                          <div className="font-mono text-lg">{keyData.charges.autresCharges.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Total Amortissement:</span>
                          <div className="font-mono text-lg">{keyData.charges.totalAmortissement.toLocaleString()} FCFA</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-orange-100 rounded">
                        <div className="font-semibold text-orange-800">Total Charges: {keyData.charges.total.toLocaleString()} FCFA</div>
                        <div className="font-semibold text-orange-900 mt-2">Total Charges Opérationnelles: {Math.round(keyData.charges.totalChargesOperationnelles).toLocaleString()} FCFA</div>
                        <div className="text-xs text-gray-600 mt-1">D&A traité séparément: {formatMillions(getNumericDepreciationAmortissement() / 12)} FCFA/mois</div>
                      </div>
                    </div>

                    {/* Paramètres DCF */}
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-indigo-800 mb-3">📈 Paramètres DCF</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Taux Actualisation:</span>
                          <div className="font-mono text-lg">{keyData.dcf.tauxActualisation}%</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Durée Analyse:</span>
                          <div className="font-mono text-lg">{keyData.dcf.dureeAnalyse} mois</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">CAPEX:</span>
                          <div className="font-mono text-lg">{keyData.dcf.capex.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">BFR:</span>
                          <div className="font-mono text-lg">{keyData.dcf.bfr.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">WACC:</span>
                          <div className="font-mono text-lg">{keyData.dcf.wacc}%</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Croissance Terminale:</span>
                          <div className="font-mono text-lg">{keyData.dcf.croissanceTerminale}%</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Dette:</span>
                          <div className="font-mono text-lg">{keyData.dcf.dette.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Trésorerie:</span>
                          <div className="font-mono text-lg">{keyData.dcf.tresorerie.toLocaleString()} FCFA</div>
                        </div>
                      </div>
                    </div>

                    {/* Paramètres spécifiques */}
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-teal-800 mb-3">⚙️ Paramètres Spécifiques</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Foie, Yell, Filet (Bœuf/Veau):</span>
                          <div className="font-mono text-lg">{keyData.gainProduitsNobleFoieYellParKg} FCFA</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Pération:</span>
                          <div className="font-mono text-lg">{keyData.peration}%</div>
                        </div>

                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Section pour ajouter du contexte supplémentaire - visible seulement si l'analyse principale est affichée */}
        {interpretationVisible && interpretationText && !interpretationLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">🎯 Analyse Contextuelle Point de Vente</h3>
            <p className="text-blue-700 mb-4 text-sm">
              Ajoutez du contexte stratégique supplémentaire pour approfondir l'analyse du point de vente et renforcer sa valeur comme modèle de référence.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-700 mb-2">
                Contexte supplémentaire (concurrence, marché, plans expansion, etc.)
              </label>
              <textarea
                value={contexteSupplementaire}
                onChange={(e) => setContexteSupplementaire(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-lg text-base min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Données de vos points de vente actuels, comparaison avec concurrents, ajustements validés, validation des synergies MATA Group SA, insights opérationnels, métriques de performance réelles..."
                style={{ fontSize: '16px' }}
              />
            </div>

            <button
              onClick={genererAnalyseContextuelle}
              disabled={analyseContextuelleLoading || !contexteSupplementaire.trim()}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                analyseContextuelleLoading || !contexteSupplementaire.trim()
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {analyseContextuelleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyse point de vente en cours...
                </div>
              ) : (
                '🎯 Analyser Contexte Point de Vente'
              )}
            </button>
          </div>
        )}

        {/* Section d'affichage de l'analyse contextuelle */}
        {aiAnalysisVisible && analyseContextuelleVisible && (
          <div className="bg-white border border-indigo-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-indigo-800">🎯 Analyse Contextuelle Point de Vente MATA Trading</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analyseContextuelleText);
                  }}
                  className="px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                  title="Copier l'analyse contextuelle"
                >
                  📋 Copier
                </button>
                <button
                  onClick={() => setAnalyseContextuelleVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              {analyseContextuelleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Génération de l'analyse contextuelle du point de vente en cours...</p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {analyseContextuelleText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section d'analyse complète personnalisée */}
        {aiAnalysisVisible && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-emerald-800 mb-2">🔍 Analyse Complète Personnalisée</h3>
              <p className="text-sm text-gray-600 mb-4">Générez une analyse complète intégrant votre contexte spécifique et toutes les données financières en temps réel</p>
              
              {/* Champ de saisie du contexte personnalisé */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Contexte personnalisé pour l'analyse
                </label>
                <textarea
                  value={contextePersonnalise}
                  onChange={(e) => setContextePersonnalise(e.target.value)}
                  placeholder="Décrivez votre contexte spécifique, vos objectifs, vos contraintes, vos questions particulières... Cette analyse intégrera toutes les données financières actuelles de l'application."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-vertical min-h-[100px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Exemples : "Analysez la viabilité pour un investisseur en capital-risque", "Évaluez l'impact d'une expansion vers Dakar", "Comparez avec les standards du secteur agroalimentaire sénégalais"...
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={genererAnalyseComplete}
                disabled={analyseCompleteLoading || !contextePersonnalise.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  analyseCompleteLoading || !contextePersonnalise.trim()
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {analyseCompleteLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyse en cours...
                  </div>
                ) : (
                  '🔍 Analyse Standard'
                )}
              </button>
              
              <button
                onClick={genererAnalysePlusPlus}
                disabled={analyseCompleteLoading || !contextePersonnalise.trim()}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  analyseCompleteLoading || !contextePersonnalise.trim()
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {analyseCompleteLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyse ++ en cours...
                  </div>
                ) : (
                  '🚀 Interprétation ++'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Section d'affichage de l'analyse complète */}
        {aiAnalysisVisible && analyseCompleteVisible && (
          <div className="bg-white border border-emerald-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-emerald-800">🔍 Analyse Complète Personnalisée MATA Trading</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analyseCompleteText);
                  }}
                  className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                  title="Copier l'analyse complète"
                >
                  📋 Copier
                </button>
                <button
                  onClick={() => setAnalyseCompleteVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              {analyseCompleteLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Génération de l'analyse complète personnalisée en cours...</p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {analyseCompleteText}
                </div>
              )}
            </div>
          </div>
        )}
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
              onChange={(e) => setAdditionalVolume(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="flex items-end">
            <div className="w-full p-2 sm:p-3 bg-purple-100 rounded text-sm">
              <div className="text-purple-800 font-medium">Volume total: {adjustedVolume.toLocaleString()}</div>
              <div className="text-purple-600 text-xs">Base: {getNumericVolume().toLocaleString()} + Ajout: {getNumericAdditionalVolume().toLocaleString()}</div>
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
                <span className="font-medium">{(originalRepartitions[selectedProduct] * getNumericVolume()).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">Après: </span>
                <span className="font-medium text-green-600">{(adjustedProduits[selectedProduct].repartition * adjustedVolume).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Répartition {selectedProduct}:</div>
              <div className="text-sm">
                <span className="text-gray-500">Avant: </span>
                <span className="font-medium">{(originalRepartitions[selectedProduct] * 100).toFixed(2)}%</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">Après: </span>
                <span className="font-medium text-green-600">{(adjustedProduits[selectedProduct].repartition * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Volume total: {getNumericVolume().toLocaleString()} → {adjustedVolume.toLocaleString()} (+{getNumericAdditionalVolume().toLocaleString()})
          </div>
        </div>
        </div>

      {/* Contenu identique au premier onglet mais avec les données ajustées */}
      {renderMainContent()}
    </>
  );

  const renderChargesContent = () => (
    <>
      {/* Paramètres des charges */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-orange-800">💰 Gestion des Charges</h3>
        
                 {/* Charges fixes */}
         <div className="mb-6">
                       <h4 className="text-sm font-semibold text-orange-700 mb-3">🏗️ Immobilisations</h4>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                         {/* Charges fixes masquées - maintenant à 0 par défaut */}
            {false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Charges fixes</label>
                     <input 
                       type="number"
                value={chargesFixes}
                onChange={(e) => setChargesFixes(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
                     </div>
            )}
                          <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Amortissement annuel (FCFA)</label>
                        <input 
                         type="number"
                min="0"
                value={amortissementAnnuel}
                onChange={(e) => setAmortissementAnnuel(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
               <div className="text-xs text-gray-500 mt-1">{formatMillions(getNumericAmortissementAnnuel() / 12)} FCFA/mois ({formatMillions(getNumericAmortissementAnnuel())} FCFA/an)</div>
             </div>
           </div>
         </div>

        {/* Charges mensuelles */}
        <div>
          <h4 className="text-sm font-semibold text-orange-700 mb-3">📅 Charges Mensuelles</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salaire</label>
                        <input 
                          type="number"
                value={salaire}
                onChange={(e) => setSalaire(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
                        </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Électricité</label>
              <input 
                type="number"
                value={electricite}
                onChange={(e) => setElectricite(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eau</label>
              <input 
                type="number"
                value={eau}
                onChange={(e) => setEau(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internet</label>
              <input 
                type="number"
                value={internet}
                onChange={(e) => setInternet(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sacs de livraison</label>
              <input 
                type="number"
                value={sacsLivraison}
                onChange={(e) => setSacsLivraison(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Charges transport</label>
              <input 
                type="number"
                value={chargesTransport}
                onChange={(e) => setChargesTransport(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loyer</label>
              <input 
                type="number"
                value={loyer}
                onChange={(e) => setLoyer(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autres charges</label>
              <input 
                type="number"
                value={autresCharges}
                onChange={(e) => setAutresCharges(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>
      </div>

             {/* Résumé des charges */}
       <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
         <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-red-800">📊 Résumé des Charges</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                             {/* Charges fixes masquées - maintenant à 0 */}
                      {false && (
                      <div>
             <div className="text-sm text-gray-600">Charges fixes (total):</div>
             <div className="text-lg sm:text-xl font-bold text-red-600">{chargesFixes.toLocaleString()}</div>
             <div className="text-xs text-gray-500">Amorti sur {dureeAmortissement} mois</div>
           </div>
                      )}
           <div>
             <div className="text-sm text-gray-600">Charges mensuelles:</div>
             <div className="text-lg sm:text-xl font-bold text-orange-600">{chargesMensuelles.toLocaleString()}</div>
           </div>
           <div>
             <div className="text-sm text-gray-600">D&A mensuel (calculé séparément):</div>
             <div className="text-lg sm:text-xl font-bold text-blue-600">{formatMillions(getNumericDepreciationAmortissement() / 12)} FCFA</div>
             <div className="text-xs text-gray-500">CAPEX {formatMillions(getNumericCapex())} / {dureeAmortissement} mois</div>
           </div>
                                             {/* Amortissement masqué - charges fixes à 0 - supprimé pour éviter erreurs */}
           <div>
             <div className="text-sm text-gray-600">Total charges mensuelles:</div>
             <div className="text-lg sm:text-xl font-bold text-red-700">{formatMillions(chargesTotales)} FCFA</div>
           </div>
         </div>
         <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <div className="text-sm text-gray-600">Bénéfice net mensuel:</div>
             <div className="text-lg sm:text-xl font-bold text-green-600">{formatMillions(getBeneficeTotalActif() - chargesTotales)} FCFA</div>
           </div>
           <div>
             <div className="text-sm text-gray-600">Rentabilité:</div>
             <div className={`text-lg sm:text-xl font-bold ${
               (getBeneficeTotalActif() - chargesTotales) > 0 ? 'text-green-600' : 'text-red-600'
             }`}>
               {((getBeneficeTotalActif() - chargesTotales) / getBeneficeTotalActif() * 100).toFixed(1)}%
                      </div>
           </div>
         </div>
       </div>

      {/* Contenu identique au premier onglet mais avec les données ajustées */}
      {renderMainContent()}
    </>
  );

  const renderDCFContent = () => (
    <>
      {/* Paramètres DCF */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-indigo-800">📊 Modèle DCF - Discounted Cash Flow</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'actualisation annuel (%)</label>
            <input 
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={tauxActualisationAnnuel}
              onChange={(e) => setTauxActualisationAnnuel(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">Taux mensuel: {(tauxActualisationMensuel * 100).toFixed(3)}%</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée d'analyse (mois)</label>
            <input 
              type="number"
              min="12"
              max="120"
              value={dureeAnalyse}
              onChange={(e) => setDureeAnalyse(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">{(getNumericDureeAnalyse() / 12).toFixed(1)} années</div>
          </div>
                      <div className="flex items-end">
            <div className="w-full p-2 sm:p-3 bg-indigo-100 rounded text-sm">
              <div className="text-indigo-800 font-medium">Investissement initial</div>
              <div className="text-indigo-600 text-xs">{getNumericChargesFixes().toLocaleString()}</div>
            </div>
          </div>
        </div>
        </div>

      {/* Paramètres financiers avancés */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-purple-800">🏦 Paramètres Financiers Avancés</h3>
        
        {/* CAPEX et BFR */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-purple-700 mb-3">💼 Investissements et Fonds de Roulement</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAPEX (annuel)</label>
              <input 
                type="number"
                value={capex}
                onChange={(e) => setCapex(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Dépenses d'investissement</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BFR (annuel)</label>
              <input 
                type="number"
                value={bfr}
                onChange={(e) => setBfr(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Besoin en fonds de roulement</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">D&A (annuel)</label>
              <input 
                type="number"
                value={depreciationAmortissement}
                onChange={(e) => setDepreciationAmortissement(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
                placeholder="Valeur d'amortissement annuel"
              />
              <div className="text-xs text-gray-500 mt-1">
                {depreciationAmortissement && depreciationAmortissement.trim() !== '' 
                  ? `Valeur manuelle: ${formatMillions(getNumericDepreciationAmortissement())} FCFA/an` 
                  : `Synchronisé avec amortissement: ${formatMillions(getNumericAmortissementAnnuel())} FCFA/an`
                }
              </div>
            </div>
          </div>
          </div>
          
        {/* WACC et Croissance */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-purple-700 mb-3">📊 Coût du Capital et Croissance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WACC (%)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={wacc}
                onChange={(e) => setWacc(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Coût moyen pondéré du capital</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Croissance terminale g (%)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={croissanceTerminale}
                onChange={(e) => setCroissanceTerminale(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Taux de croissance à perpétuité</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'imposition (%)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={tauxImposition}
                onChange={(e) => setTauxImposition(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">IS au Sénégal: 30%</div>
            </div>
          </div>
        </div>

        {/* Dette et Trésorerie */}
        <div>
          <h4 className="text-sm font-semibold text-purple-700 mb-3">💰 Structure Financière</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dette nette</label>
              <input 
                type="number"
                value={dette}
                onChange={(e) => setDette(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Dette totale de l'entreprise</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trésorerie</label>
              <input 
                type="number"
                value={tresorerie}
                onChange={(e) => setTresorerie(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Liquidités disponibles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculs Financiers Avancés */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-800">🏦 Calculs Financiers Avancés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="cursor-help" title={`EBIT = Marge brute - Charges opérationnelles - D&A
Marge brute: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
D&A mensuel: ${Math.round(getNumericDepreciationAmortissement() / 12).toLocaleString()} FCFA
EBIT Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA
EBIT Annuel: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBIT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {Math.round(calculerEBIT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts et impôts</div>
          </div>
          <div className="cursor-help" title={`EBITDA = Marge brute - Charges opérationnelles (hors D&A)
Marge brute: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
EBITDA Mensuel: ${Math.round(calculerEBITDA()).toLocaleString()} FCFA
EBITDA Annuel: ${Math.round(calculerEBITDA() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBITDA (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {Math.round(calculerEBITDA() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts, impôts, D&A</div>
          </div>
          <div className="cursor-help" title={`NOPAT = EBIT × (1 - Taux d'imposition)
EBIT: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA
Taux d'imposition: ${tauxImposition}%
NOPAT: ${Math.round(calculerNOPAT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">NOPAT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              {Math.round(calculerNOPAT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Résultat net d'exploitation après impôts</div>
          </div>
          <div className="cursor-help" title={`FCF annuel = NOPAT annuel + D&A annuel
NOPAT annuel: ${Math.round(calculerNOPAT() * 12).toLocaleString()} FCFA
D&A annuel: ${Math.round(getNumericDepreciationAmortissement()).toLocaleString()} FCFA
FCF annuel: ${Math.round(calculerFCF()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">FCF (annuel):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              calculerFCF() > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.round(calculerFCF()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Flux de trésorerie disponible</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <div className="text-sm text-gray-600">D&A (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-600">
              {Math.round(getNumericDepreciationAmortissement()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Dépréciation & Amortissement</div>
          </div>
{/* ROI masqué - seul ROIC affiché */}
          <div className="cursor-help" title={`ROI = EBIT / CAPEX
ROI Mensuel: ${(calculerROI().mensuel * 100).toFixed(2)}%
ROI Annuel: ${(calculerROI().annuel * 100).toFixed(2)}%
CAPEX: ${getNumericCapex().toLocaleString()} FCFA
EBIT Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA

ROIC mensuel = NOPAT / (CAPEX + BFR - Trésorerie)
ROIC annuel = (1 + ROIC mensuel)^12 - 1
ROIC Mensuel: ${(calculerROIC().mensuel * 100).toFixed(2)}%
ROIC Annuel: ${(calculerROIC().annuel * 100).toFixed(2)}%
Capital Investi Net: ${(getNumericCapex() + getNumericBfr() - getNumericTresorerie()).toLocaleString()} FCFA
NOPAT Mensuel: ${Math.round(calculerNOPAT()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">ROIC (annuel):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              calculerROIC().annuel > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(calculerROIC().annuel * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Retour sur capital investi</div>
          </div>
          <div className="cursor-help" title={`Valeur Terminale = FCF × (1 + g) / (WACC - g)
FCF: ${Math.round(calculerFCF()).toLocaleString()} FCFA
Croissance g: ${getNumericCroissanceTerminale()}%
WACC: ${getNumericWacc()}%
Calcul: (${Math.round(calculerFCF()).toLocaleString()} × 1.${getNumericCroissanceTerminale()}) / (${getNumericWacc()/100} - ${getNumericCroissanceTerminale()/100})
Valeur Terminale: ${Math.round(calculerValeurTerminale()).toLocaleString()} FCFA
Interprétation: Valeur de l'entreprise à perpétuité après 5 ans`}>
            <div className="text-sm text-gray-600">Valeur Terminale:</div>
            <div className="text-lg sm:text-xl font-bold text-indigo-600">
              {Math.round(calculerValeurTerminale()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur à perpétuité</div>
          </div>
          <div className="cursor-help" title={`Enterprise Value = Σ(FCF actualisés sur 5 ans) + VT actualisée
FCF annuel: ${Math.round(calculerFCF()).toLocaleString()} FCFA
WACC: ${getNumericWacc()}%
Valeur Terminale: ${Math.round(calculerValeurTerminale()).toLocaleString()} FCFA
Enterprise Value: ${Math.round(calculerEnterpriseValue()).toLocaleString()} FCFA
Interprétation: Valeur totale de l'entreprise`}>
            <div className="text-sm text-gray-600">Enterprise Value:</div>
            <div className="text-lg sm:text-xl font-bold text-orange-600">
              {Math.round(calculerEnterpriseValue()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur d'entreprise</div>
          </div>
          <div className="cursor-help" title={`Equity Value = Enterprise Value - Dette + Trésorerie
Enterprise Value: ${Math.round(calculerEnterpriseValue()).toLocaleString()} FCFA
Dette: ${Math.round(getNumericDette()).toLocaleString()} FCFA
Trésorerie: ${Math.round(getNumericTresorerie()).toLocaleString()} FCFA
Equity Value: ${Math.round(calculerEquityValue()).toLocaleString()} FCFA
Interprétation: Valeur pour les actionnaires`}>
            <div className="text-sm text-gray-600">Equity Value:</div>
            <div className="text-lg sm:text-xl font-bold text-teal-600">
              {Math.round(calculerEquityValue()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur des capitaux propres</div>
          </div>
        </div>
      </div>

      {/* Indicateurs DCF */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📈 Indicateurs DCF</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="cursor-help" title={`VAN = Σ(Flux Actualisés)
Investissement Initial: ${Math.round(getNumericCapex()).toLocaleString()} FCFA
Taux d'actualisation: ${tauxActualisationAnnuel}% (${(tauxActualisationMensuel * 100).toFixed(3)}% mensuel)
VAN: ${indicateursDCF.van.toLocaleString()} FCFA
Interprétation: ${indicateursDCF.van > 0 ? 'Projet rentable' : 'Projet non rentable'}`}>
            <div className="text-sm text-gray-600">VAN (NPV):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCF.van > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {indicateursDCF.van.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
            </div>
            <div className="text-xs text-gray-500">
              {indicateursDCF.van > 0 ? 'Projet rentable' : 'Projet non rentable'}
            </div>
          </div>
          <div className="cursor-help" title={`TRI = Taux qui rend VAN = 0
TRI Mensuel: ${(indicateursDCF.triMensuel * 100).toFixed(3)}%
TRI Annuel: ${(indicateursDCF.triAnnuel * 100).toFixed(2)}%
Taux d'actualisation: ${tauxActualisationAnnuel}%
Comparaison: TRI ${indicateursDCF.triAnnuel > (tauxActualisationAnnuel / 100) ? '>' : '<'} Taux d'actualisation`}>
            <div className="text-sm text-gray-600">TRI annuel:</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCF.triAnnuel > (tauxActualisationAnnuel / 100) ? 'text-green-600' : 'text-red-600'
            }`}>
              {(indicateursDCF.triAnnuel * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              TRI mensuel: {(indicateursDCF.triMensuel * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Indice de profitabilité:</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCF.indiceProfitabilite > 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {indicateursDCF.indiceProfitabilite.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">
              {indicateursDCF.indiceProfitabilite > 1 ? 'Projet viable' : 'Projet non viable'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Payback actualisé:</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {typeof indicateursDCF.paybackActualise === 'number' 
                ? `${indicateursDCF.paybackActualise} mois`
                : indicateursDCF.paybackActualise
              }
            </div>
            <div className="text-xs text-gray-500">
              {typeof indicateursDCF.paybackActualise === 'number' 
                ? `(${(indicateursDCF.paybackActualise / 12).toFixed(1)} ans)`
                : 'Récupération impossible'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Flux de trésorerie détaillés */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border mb-4 sm:mb-6 md:mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">💰 Flux de Trésorerie Détailés</h3>
          <button
            onClick={() => exportFluxTresorerie(fluxDCF, `flux-tresorerie-dcf-${new Date().toISOString().split('T')[0]}.csv`)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📊 Exporter CSV
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-indigo-500 to-indigo-600">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Mois</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">NOPAT</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">D&A</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">CAPEX</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">ΔBFR</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">FCF</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">FCF Actualisé</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Cumul Actualisé</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fluxDCF.slice((pageFluxDCF - 1) * itemsPerPage, pageFluxDCF * itemsPerPage).map((flux, index) => (
                <tr key={flux.mois} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800">
                    {flux.mois === 0 ? 'Mois 0' : `Mois ${flux.mois}`}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.nopat.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.depreciation.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-red-600">
                    -{flux.capex.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-red-600">
                    -{flux.deltaBfr.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fcf > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fcf.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fcfActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fcfActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.cumulActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.cumulActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {fluxDCF.length > itemsPerPage && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Affichage {((pageFluxDCF - 1) * itemsPerPage) + 1} à {Math.min(pageFluxDCF * itemsPerPage, fluxDCF.length)} sur {fluxDCF.length} mois
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPageFluxDCF(Math.max(1, pageFluxDCF - 1))}
                disabled={pageFluxDCF === 1}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  pageFluxDCF === 1 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                ← Précédent
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pageFluxDCF} sur {Math.ceil(fluxDCF.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setPageFluxDCF(Math.min(Math.ceil(fluxDCF.length / itemsPerPage), pageFluxDCF + 1))}
                disabled={pageFluxDCF === Math.ceil(fluxDCF.length / itemsPerPage)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  pageFluxDCF === Math.ceil(fluxDCF.length / itemsPerPage)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Graphique des flux de trésorerie */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">📊 Évolution des Flux de Trésorerie</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={fluxDCF.slice(0, 25)}>
                  <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mois" 
              tick={{ fontSize: 12 }}
              label={{ value: 'Mois', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
                  <Tooltip 
                    formatter={(value, name) => [
                value.toLocaleString(), 
                name === 'fluxNet' ? 'Flux Net' : 
                name === 'fluxActualise' ? 'Flux Actualisé' : 
                name === 'cumulActualise' ? 'Cumul Actualisé' : name
                    ]}
                  />
                  <Line 
                    type="monotone" 
              dataKey="fluxNet" 
              stroke="#3498db" 
              strokeWidth={2}
              name="Flux Net"
                  />
                  <Line 
                    type="monotone" 
              dataKey="fluxActualise" 
              stroke="#e74c3c" 
                    strokeWidth={2}
              name="Flux Actualisé"
            />
            <Line 
              type="monotone" 
              dataKey="cumulActualise" 
              stroke="#2ecc71" 
              strokeWidth={3}
              name="Cumul Actualisé"
                                    />
                </LineChart>
              </ResponsiveContainer>
            </div>

      {/* Formules et Hypothèses DCF */}
      <FormulesHypotheses />

      {/* Contenu identique au premier onglet mais avec les données ajustées */}
      {renderMainContent()}
    </>
  );

  const renderDCFSimulationContent = () => (
    <>
      {/* Paramètres DCF */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-purple-800">📊 Modèle DCF - Simulation Volume</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'actualisation annuel (%)</label>
            <input 
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={tauxActualisationAnnuel}
              onChange={(e) => setTauxActualisationAnnuel(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">Taux mensuel: {(tauxActualisationMensuel * 100).toFixed(3)}%</div>
                  </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée d'analyse (mois)</label>
            <input 
              type="number"
              min="12"
              max="120"
              value={dureeAnalyse}
              onChange={(e) => setDureeAnalyse(e.target.value)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">{(dureeAnalyse / 12).toFixed(1)} années</div>
          </div>
          <div className="flex items-end">
            <div className="w-full p-2 sm:p-3 bg-purple-100 rounded text-sm">
              <div className="text-purple-800 font-medium">Investissement initial</div>
              <div className="text-purple-600 text-xs">{chargesFixes.toLocaleString()}</div>
                </div>
              </div>
            </div>

        {/* Informations sur la simulation */}
        <div className="mt-4 p-3 bg-purple-100 rounded">
          <div className="text-sm text-purple-800">
            <strong>📈 Données de simulation utilisées:</strong>
            <div className="mt-2 text-xs">
              • Volume total: {getAdjustedVolume().toLocaleString()}
              {getAdjustedVolume() > volume && (
                <>
                  <br/>• Produit sélectionné: {selectedProduct}
                  <br/>• Volume ajouté: {additionalVolume.toLocaleString()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calculs Financiers Avancés - Simulation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-800">🏦 Calculs Financiers Avancés - Simulation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="cursor-help" title={`EBIT = Marge brute - Charges opérationnelles - D&A
Marge brute: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
D&A mensuel: ${Math.round(getNumericDepreciationAmortissement() / 12).toLocaleString()} FCFA
EBIT Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA
EBIT Annuel: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBIT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {Math.round(calculerEBIT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts et impôts</div>
          </div>
          <div className="cursor-help" title={`EBITDA = Marge brute - Charges opérationnelles (hors D&A)
Marge brute: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
EBITDA Mensuel: ${Math.round(calculerEBITDA()).toLocaleString()} FCFA
EBITDA Annuel: ${Math.round(calculerEBITDA() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBITDA (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {Math.round(calculerEBITDA() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts, impôts, D&A</div>
          </div>
          <div className="cursor-help" title={`NOPAT = EBIT × (1 - Taux d'imposition)
EBIT: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA
Taux d'imposition: ${tauxImposition}%
NOPAT: ${Math.round(calculerNOPAT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">NOPAT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              {Math.round(calculerNOPAT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Résultat net d'exploitation après impôts</div>
          </div>
          <div className="cursor-help" title={`FCF annuel = NOPAT annuel + D&A annuel (CAPEX et ΔBFR = one-shot t0)
NOPAT annuel: ${Math.round(calculerNOPAT() * 12).toLocaleString()} FCFA
D&A annuel: ${Math.round(getNumericDepreciationAmortissement()).toLocaleString()} FCFA
FCF annuel: ${Math.round(calculerFCF()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">FCF (annuel):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              calculerFCF() > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.round(calculerFCF()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Flux de trésorerie disponible</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          <div className="cursor-help" title={`D&A = Charges fixes ÷ Durée amortissement × 12 - Simulation
                Charges fixes: ${getNumericChargesFixes().toLocaleString()} FCFA
                Durée amortissement: ${getNumericDureeAmortissement()} mois
                D&A: ${Math.round(getNumericDepreciationAmortissement()).toLocaleString()} FCFA
                D&A Mensuel: ${Math.round(getNumericDepreciationAmortissement() / 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">D&A (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-yellow-600">
              {Math.round(getNumericDepreciationAmortissement()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Dépréciation & Amortissement</div>
          </div>
          <div className="cursor-help" title={`Valeur Terminale = FCF × (1 + g) / (WACC - g) - Simulation
FCF: ${Math.round(calculerFCF()).toLocaleString()} FCFA
WACC: ${wacc}%
Croissance g: ${croissanceTerminale}%
VT: ${Math.round(calculerValeurTerminale()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">Valeur Terminale:</div>
            <div className="text-lg sm:text-xl font-bold text-indigo-600">
              {Math.round(calculerValeurTerminale()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur à perpétuité</div>
          </div>
          <div className="cursor-help" title={`Enterprise Value = Σ(FCF actualisés) + VT actualisée - Simulation
FCF Annuel: ${Math.round(calculerFCF()).toLocaleString()} FCFA
WACC: ${wacc}%
Valeur Terminale: ${Math.round(calculerValeurTerminale()).toLocaleString()} FCFA
EV: ${Math.round(calculerEnterpriseValue()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">Enterprise Value:</div>
            <div className="text-lg sm:text-xl font-bold text-orange-600">
              {Math.round(calculerEnterpriseValue()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur d'entreprise</div>
          </div>
          <div className="cursor-help" title={`Equity Value = Enterprise Value - Dette + Trésorerie - Simulation
Enterprise Value: ${Math.round(calculerEnterpriseValue()).toLocaleString()} FCFA
Dette: ${Math.round(dette).toLocaleString()} FCFA
Trésorerie: ${Math.round(tresorerie).toLocaleString()} FCFA
Equity Value: ${Math.round(calculerEquityValue()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">Equity Value:</div>
            <div className="text-lg sm:text-xl font-bold text-teal-600">
              {Math.round(calculerEquityValue()).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Valeur des capitaux propres</div>
          </div>
        </div>
      </div>

      {/* Indicateurs DCF */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📈 Indicateurs DCF - Simulation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="cursor-help" title={`VAN = Σ(Flux Actualisés) - Simulation
Investissement Initial: ${Math.round(getNumericCapex()).toLocaleString()} FCFA
Taux d'actualisation: ${tauxActualisationAnnuel}% (${(tauxActualisationMensuel * 100).toFixed(3)}% mensuel)
VAN: ${indicateursDCFSimulation.van.toLocaleString()} FCFA
Interprétation: ${indicateursDCFSimulation.van > 0 ? 'Projet rentable' : 'Projet non rentable'}`}>
            <div className="text-sm text-gray-600">VAN (NPV):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCFSimulation.van > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {indicateursDCFSimulation.van.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
            </div>
            <div className="text-xs text-gray-500">
              {indicateursDCFSimulation.van > 0 ? 'Projet rentable' : 'Projet non rentable'}
            </div>
          </div>
          <div className="cursor-help" title={`TRI = Taux qui rend VAN = 0 - Simulation
TRI Mensuel: ${(indicateursDCFSimulation.triMensuel * 100).toFixed(3)}%
TRI Annuel: ${(indicateursDCFSimulation.triAnnuel * 100).toFixed(2)}%
Taux d'actualisation: ${tauxActualisationAnnuel}%
Comparaison: TRI ${indicateursDCFSimulation.triAnnuel > (tauxActualisationAnnuel / 100) ? '>' : '<'} Taux d'actualisation`}>
            <div className="text-sm text-gray-600">TRI annuel:</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCFSimulation.triAnnuel > (tauxActualisationAnnuel / 100) ? 'text-green-600' : 'text-red-600'
            }`}>
              {(indicateursDCFSimulation.triAnnuel * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              TRI mensuel: {(indicateursDCFSimulation.triMensuel * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Indice de profitabilité:</div>
            <div className={`text-lg sm:text-xl font-bold ${
              indicateursDCFSimulation.indiceProfitabilite > 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {indicateursDCFSimulation.indiceProfitabilite.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">
              {indicateursDCFSimulation.indiceProfitabilite > 1 ? 'Projet viable' : 'Projet non viable'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Payback actualisé:</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {typeof indicateursDCFSimulation.paybackActualise === 'number' 
                ? `${indicateursDCFSimulation.paybackActualise} mois`
                : indicateursDCFSimulation.paybackActualise
              }
            </div>
            <div className="text-xs text-gray-500">
              {typeof indicateursDCFSimulation.paybackActualise === 'number' 
                ? `(${(indicateursDCFSimulation.paybackActualise / 12).toFixed(1)} ans)`
                : 'Récupération impossible'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Flux de trésorerie détaillés */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border mb-4 sm:mb-6 md:mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">💰 Flux de Trésorerie Détailés - Simulation</h3>
          <button
            onClick={() => exportFluxTresorerie(fluxDCFSimulation, `flux-tresorerie-dcf-simulation-${new Date().toISOString().split('T')[0]}.csv`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📊 Exporter CSV
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-purple-500 to-purple-600">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Mois</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">NOPAT</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">D&A</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">CAPEX</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">ΔBFR</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">FCF</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">FCF Actualisé</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Cumul Actualisé</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fluxDCFSimulation.slice((pageFluxDCFSimulation - 1) * itemsPerPage, pageFluxDCFSimulation * itemsPerPage).map((flux, index) => (
                <tr key={flux.mois} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800">
                    {flux.mois === 0 ? 'Mois 0' : `Mois ${flux.mois}`}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.nopat.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.depreciation.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-red-600">
                    -{flux.capex.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-red-600">
                    -{flux.deltaBfr.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fcf > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fcf.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fcfActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fcfActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.cumulActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.cumulActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {fluxDCFSimulation.length > itemsPerPage && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Affichage {((pageFluxDCFSimulation - 1) * itemsPerPage) + 1} à {Math.min(pageFluxDCFSimulation * itemsPerPage, fluxDCFSimulation.length)} sur {fluxDCFSimulation.length} mois
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPageFluxDCFSimulation(Math.max(1, pageFluxDCFSimulation - 1))}
                disabled={pageFluxDCFSimulation === 1}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  pageFluxDCFSimulation === 1 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                ← Précédent
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pageFluxDCFSimulation} sur {Math.ceil(fluxDCFSimulation.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setPageFluxDCFSimulation(Math.min(Math.ceil(fluxDCFSimulation.length / itemsPerPage), pageFluxDCFSimulation + 1))}
                disabled={pageFluxDCFSimulation === Math.ceil(fluxDCFSimulation.length / itemsPerPage)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  pageFluxDCFSimulation === Math.ceil(fluxDCFSimulation.length / itemsPerPage)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Graphique des flux de trésorerie */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">📊 Évolution des Flux de Trésorerie - Simulation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={fluxDCFSimulation.slice(0, 25)}>
                  <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mois" 
              tick={{ fontSize: 12 }}
              label={{ value: 'Mois', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
                  <Tooltip 
                    formatter={(value, name) => [
                value.toLocaleString(), 
                name === 'fluxNet' ? 'Flux Net' : 
                name === 'fluxActualise' ? 'Flux Actualisé' : 
                name === 'cumulActualise' ? 'Cumul Actualisé' : name
                    ]}
                  />
                  <Line 
                    type="monotone" 
              dataKey="fluxNet" 
                    stroke="#3498db" 
              strokeWidth={2}
              name="Flux Net"
                  />
                  <Line 
                    type="monotone" 
              dataKey="fluxActualise" 
              stroke="#e74c3c" 
                    strokeWidth={2}
              name="Flux Actualisé"
            />
            <Line 
              type="monotone" 
              dataKey="cumulActualise" 
              stroke="#2ecc71" 
              strokeWidth={3}
              name="Cumul Actualisé"
                  />
                </LineChart>
              </ResponsiveContainer>
                  </div>

      {/* Formules et Hypothèses DCF */}
      <FormulesHypotheses />

      {/* Contenu identique au premier onglet mais avec les données ajustées */}
      {renderMainContent()}
    </>
  );

  // Fonctions utilitaires pour le Solveur
  const getSolverVariableLabel = (variable) => {
    const labels = {
      'chargesTotales': 'Charges Totales',
      'volumeMensuel': 'Volume Mensuel',
      'margeBoeuf': 'Marge Bœuf (%)',
      'margeVeau': 'Marge Veau (%)',
      'margeOvin': 'Marge Ovin (%)',
      'margePoulet': 'Marge Poulet (%)',
      'margeOeuf': 'Marge Œuf (%)',
      'peration': 'Pération % (Bœuf/Veau)',
              'gainProduitsNobleFoieYellParKg': 'Foie, Yell, Filet (Bœuf/Veau)'
    };
    return labels[variable] || variable;
  };

  const formatSolverResult = (value) => {
    if (solverVariable.includes('marge') || solverVariable === 'peration') {
      return `${value.toFixed(2)}%`;
    }
    if (solverVariable === 'gainProduitsNobleFoieYellParKg') {
      return `${Math.round(value).toLocaleString()} FCFA/kg`;
    }
    return Math.round(value).toLocaleString() + ' FCFA';
  };

  // Fonction principale de résolution
  const handleSolve = async () => {
    setSolverLoading(true);
    setSolverResult(null);
    setSolverIterations([]);

    try {
      // Vérifier qu'au moins une contrainte est fixée avec une valeur valide
      const fixedConstraints = Object.values(solverConstraints).filter(c => c.fixed && c.value !== '');
      if (fixedConstraints.length === 0) {
        alert('Veuillez fixer au moins une variable et saisir une valeur avant de résoudre.');
        setSolverLoading(false);
        return;
      }

      console.log('🎯 SOLVEUR - Démarrage de la résolution');
      console.log('📋 Contraintes fixées:', fixedConstraints.map(c => `${c.value}`));
      console.log('🎲 Variable à résoudre:', solverVariable);

      // Résolution par méthode de Newton-Raphson
      const result = await solveNewtonRaphson();
      
      if (result.found) {
        setSolverResult({
          value: result.value,
          beneficeNet: result.beneficeNet,
          success: true,
          iterations: result.iterations,
          iterationHistory: result.iterationHistory,
          finalMargins: result.finalMargins,
          finalParams: result.finalParams
        });
      } else {
        const agregatsActuels = calculerAgregats();
      const chargesActuelles = getNumericChargesFixes() + getNumericSalaire() + getNumericElectricite() + 
                              getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + 
                              getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges();
      const currentBenefit = agregatsActuels.beneficeTotal - chargesActuelles;
        const targetBenefit = parseFloat(solverConstraints.beneficeNet.value) || 0;
        
        let errorMessage = `Aucune solution trouvée.\n\n`;
        errorMessage += `Bénéfice actuel: ${Math.round(currentBenefit).toLocaleString()} FCFA\n`;
        errorMessage += `Objectif: ${Math.round(targetBenefit).toLocaleString()} FCFA\n`;
        errorMessage += `Écart: ${Math.round(Math.abs(currentBenefit - targetBenefit)).toLocaleString()} FCFA\n\n`;
        
        if (result.reason) {
          errorMessage += `Raison: ${result.reason}\n\n`;
        }
        
        if (solverVariable === 'chargesTotales') {
          if (currentBenefit > targetBenefit) {
            errorMessage += `💡 Suggestion: Il faut AUGMENTER les charges de ${Math.round(currentBenefit - targetBenefit).toLocaleString()} FCFA pour atteindre l'objectif.`;
          } else {
            errorMessage += `💡 Suggestion: Il faut RÉDUIRE les charges de ${Math.round(targetBenefit - currentBenefit).toLocaleString()} FCFA pour atteindre l'objectif.`;
          }
        }
        
        alert(errorMessage);
        
        setSolverResult({
          success: false,
          currentBenefit: currentBenefit,
          targetBenefit: targetBenefit,
          suggestion: currentBenefit > targetBenefit ? 'Augmenter les charges' : 'Réduire les charges'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la résolution:', error);
      alert('Erreur lors de la résolution. Veuillez vérifier vos paramètres.');
    } finally {
      setSolverLoading(false);
    }
  };

  // Obtenir les paramètres temporaires avec la nouvelle valeur testée
  const getTemporaryParams = (testValue) => {
    const params = {
      volume: getNumericVolume(),
      chargesTotales: chargesTotales,
      peration: getNumericPeration(),
      gainProduitsNobleFoieYellParKg: getNumericGainProduitsNobleFoieYellParKg(),
      marges: {}
    };

    // Appliquer les contraintes fixées
    if (solverConstraints.volumeMensuel.fixed && solverConstraints.volumeMensuel.value !== '') {
      params.volume = parseFloat(solverConstraints.volumeMensuel.value) || 0;
    }
    if (solverConstraints.chargesTotales.fixed && solverConstraints.chargesTotales.value !== '') {
      params.chargesTotales = parseFloat(solverConstraints.chargesTotales.value) || 0;
    }
    if (solverConstraints.peration.fixed && solverConstraints.peration.value !== '') {
      params.peration = (parseFloat(solverConstraints.peration.value) || 0) / 100; // Convertir % en décimal
    }
          if (solverConstraints.gainProduitsNobleFoieYellParKg.fixed && solverConstraints.gainProduitsNobleFoieYellParKg.value !== '') {
      params.gainProduitsNobleFoieYellParKg = parseFloat(solverConstraints.gainProduitsNobleFoieYellParKg.value) || 0;
    }

    // Appliquer la valeur testée à la variable à résoudre
    if (solverVariable === 'volumeMensuel') {
      params.volume = testValue;
    } else if (solverVariable === 'chargesTotales') {
      params.chargesTotales = testValue;
    } else if (solverVariable === 'peration') {
      params.peration = testValue / 100; // Convertir % en décimal
    } else if (solverVariable === 'gainProduitsNobleFoieYellParKg') {
      params.gainProduitsNobleFoieYellParKg = testValue;
    } else if (solverVariable.startsWith('marge')) {
      const produit = solverVariable.replace('marge', '').toLowerCase();
      params.marges[produit] = testValue / 100; // Convertir % en décimal
    }

    return params;
  };

  // Calculer le bénéfice net avec des paramètres donnés (utilise les nouvelles fonctions standardisées)
  const calculateBeneficeNetWithParams = (params) => {
    console.log(`🧮 CALCUL BÉNÉFICE AVEC PARAMÈTRES (nouvelles formules):`);
    console.log(`   Volume: ${params.volume.toLocaleString()}`);
    console.log(`   Charges: ${params.chargesTotales.toLocaleString()}`);
    console.log(`   Pération: ${(params.peration * 100).toFixed(2)}%`);
    console.log(`   Abats: ${params.gainProduitsNobleFoieYellParKg} FCFA/kg`);
    
    // Créer un contexte temporaire avec les paramètres modifiés
    const tempContext = {
      volumeTotal: params.volume,
      peration: params.peration,
      gainProduitsNobleFoieYellParKg: params.gainProduitsNobleFoieYellParKg,
      produits: { ...produits }
    };
    
    // Appliquer les marges personnalisées si définies
    if (params.marges) {
      Object.entries(params.marges).forEach(([nomLower, marge]) => {
        const nom = Object.keys(produits).find(p => p.toLowerCase() === nomLower);
        if (nom && produits[nom].editable) {
          console.log(`   🎯 ${nom}: marge personnalisée = ${(marge * 100).toFixed(2)}%`);
          // Calculer le nouveau prix de vente basé sur la marge
          const prixAchat = produits[nom].prixAchat;
          if (produits[nom].hasAbats) {
            // Pour les produits à abats : PV = (marge + 1) * PA - abats) / (1 - peration)
            const prixVenteNouveau = ((marge + 1) * prixAchat - params.gainProduitsNobleFoieYellParKg) / (1 - params.peration);
            tempContext.produits[nom] = { ...produits[nom], prixVente: prixVenteNouveau };
        } else {
            // Pour les autres : PV = (marge + 1) * PA
            const prixVenteNouveau = (marge + 1) * prixAchat;
            tempContext.produits[nom] = { ...produits[nom], prixVente: prixVenteNouveau };
          }
        }
      });
    }
    
    // Utiliser calculerAgregats avec le contexte temporaire
    const volumeOriginal = getNumericVolume() + getNumericAdditionalVolume();
    const produitsOriginaux = getNumericAdditionalVolume() > 0 ? getAdjustedRepartitions() : produits;
    
    let beneficeTotal = 0;
    
    Object.entries(tempContext.produits).forEach(([nom, produitData]) => {
      const repartition = produitsOriginaux[nom] ? produitsOriginaux[nom].repartition : produitData.repartition;
      
      // Calculer les métriques avec les paramètres du solver
      const CA_p = tempContext.volumeTotal * repartition;
      
      // Pour les produits non-éditables (pas de prix), pas de bénéfice
      if (!produitData.editable || !produitData.prixAchat || !produitData.prixVente) {
        console.log(`   💰 ${nom}: bénéfice = 0 (produit non-éditable, part: ${(repartition * 100).toFixed(1)}%)`);
        return;
      }
      
      // COGS_p = CA_p * (prixAchat / prixVente)
      const COGS_p = CA_p * (produitData.prixAchat / produitData.prixVente);
      
      // Abats_p = (hasAbats ? (abatsParKg * CA_p / prixVente) : 0)
      const Abats_p = produitData.hasAbats ? 
        (tempContext.gainProduitsNobleFoieYellParKg * CA_p / produitData.prixVente) : 0;
      
      // Pertes_p = peration * CA_p (uniquement pour les produits à carcasse)
      const Pertes_p = produitData.hasAbats ? (tempContext.peration * CA_p) : 0;
      
      // benefice = max(0, CA_p - COGS_p - Pertes_p + Abats_p)
      const benefice = Math.max(0, CA_p - COGS_p - Pertes_p + Abats_p);
      
      beneficeTotal += benefice;
      console.log(`   💰 ${nom}: bénéfice = ${benefice.toLocaleString()} (part: ${(repartition * 100).toFixed(1)}%)`);
    });
    
    const beneficeNet = beneficeTotal - params.chargesTotales;
    console.log(`   🎯 BÉNÉFICE BRUT: ${beneficeTotal.toLocaleString()} FCFA`);
    console.log(`   🎯 BÉNÉFICE NET: ${beneficeNet.toLocaleString()} FCFA`);
    
    // Validation avec la simulation principale
    const agregatsActuels = calculerAgregats();
    const chargesActuelles = getNumericChargesFixes() + getNumericSalaire() + getNumericElectricite() + 
                            getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + 
                            getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges();
    const currentBenefitUI = agregatsActuels.beneficeTotal - chargesActuelles;
    console.log(`🔍 COMPARAISON:`);
    console.log(`   📊 Bénéfice UI actuel: ${currentBenefitUI.toLocaleString()} FCFA`);
    console.log(`   🧮 Bénéfice calculé solveur: ${beneficeNet.toLocaleString()} FCFA`);
    console.log(`   📈 Différence: ${Math.abs(currentBenefitUI - beneficeNet).toLocaleString()} FCFA`);
    
    return beneficeNet;
  };

  // Calculer les marges finales après convergence
  const calculateFinalMargins = (finalParams) => {
    const margins = {};
    
    Object.entries(produits).forEach(([nom, data]) => {
      let marge;
      const nomLower = nom.toLowerCase();
      
      // Utiliser la marge personnalisée si définie dans les paramètres finaux
      if (finalParams.marges && finalParams.marges[nomLower] !== undefined) {
        marge = finalParams.marges[nomLower];
      } else if (data.editable && data.prixAchat && data.prixVente) {
        // Calculer la marge avec les paramètres finaux (peration et abatsParKg)
        if (data.hasAbats) {
          marge = ((data.prixVente * (1 - finalParams.peration) + finalParams.gainProduitsNobleFoieYellParKg) / data.prixAchat) - 1;
        } else {
          marge = (data.prixVente / data.prixAchat) - 1;
        }
      } else {
        // Pour les produits non-éditables, calculer une marge moyenne avec les paramètres finaux
        let margeMoyenneEditables = 0;
        let nombreProduitsEditables = 0;
        
        Object.entries(produits).forEach(([nomProd, dataProd]) => {
          if (dataProd.editable && dataProd.prixAchat && dataProd.prixVente) {
            let margeTemp;
            if (dataProd.hasAbats) {
              margeTemp = ((dataProd.prixVente * (1 - finalParams.peration) + finalParams.gainProduitsNobleFoieYellParKg) / dataProd.prixAchat) - 1;
            } else {
              margeTemp = (dataProd.prixVente / dataProd.prixAchat) - 1;
            }
            margeMoyenneEditables += margeTemp;
            nombreProduitsEditables++;
          }
        });
        
        marge = nombreProduitsEditables > 0 ? margeMoyenneEditables / nombreProduitsEditables : 0;
      }
      
      margins[nom] = {
        value: marge,
        percentage: marge * 100,
        editable: data.editable,
        hasAbats: data.hasAbats,
        prixAchat: data.prixAchat,
        prixVente: data.prixVente
      };
    });
    
    console.log('📊 MARGES FINALES CALCULÉES:');
    Object.entries(margins).forEach(([nom, info]) => {
      console.log(`   ${nom}: ${(info.percentage).toFixed(2)}% (${info.editable ? 'éditable' : 'calculé'})`);
    });
    
    return margins;
  };

  // Algorithme de Newton-Raphson pour résoudre l'équation
  const solveNewtonRaphson = async () => {
    const tolerance = 100; // Tolérance d'erreur pour Newton-Raphson
    const maxIterations = 50; // Newton-Raphson converge plus vite
    const h = 1; // Pas pour le calcul numérique de la dérivée
    
    const iterations = []; // Historique des itérations pour l'affichage
    
    console.log('🎯 SOLVEUR NEWTON-RAPHSON - DÉBUT');
    console.log('='.repeat(80));
    console.log(`📋 Variable à résoudre: ${solverVariable}`);
    console.log(`🎯 Objectif: ${(parseFloat(solverConstraints.beneficeNet.value) || 0).toLocaleString()} FCFA`);
    
    // Fonction objectif : f(x) = bénéfice_net(x) - bénéfice_cible
    const f = (x) => {
      const tempParams = getTemporaryParams(x);
      const beneficeNet = calculateBeneficeNetWithParams(tempParams);
      const target = solverConstraints.beneficeNet.fixed ? (parseFloat(solverConstraints.beneficeNet.value) || 0) : 0;
      const result = beneficeNet - target;
      
      console.log(`   📊 f(${x.toLocaleString()}) = ${beneficeNet.toLocaleString()} - ${target.toLocaleString()} = ${result.toLocaleString()}`);
      return result;
    };
    
    // Calcul numérique de la dérivée : f'(x) ≈ (f(x+h) - f(x)) / h
    const df = (x) => {
      const fx = f(x);
      const fxh = f(x + h);
      const derivative = (fxh - fx) / h;
      console.log(`   📈 f'(${x.toLocaleString()}) = (${fxh.toLocaleString()} - ${fx.toLocaleString()}) / ${h} = ${derivative.toFixed(6)}`);
      return derivative;
    };
    
    // Valeur initiale intelligente selon la variable
    let x0;
    if (solverVariable === 'volumeMensuel') {
      x0 = getNumericVolume(); // Partir du volume actuel
      console.log(`🎲 Initialisation volume: ${x0.toLocaleString()} (volume actuel)`);
    } else if (solverVariable === 'chargesTotales') {
      // Estimation intelligente : charges actuelles + écart nécessaire
      const agregatsActuels = calculerAgregats();
      const chargesActuelles = getNumericChargesFixes() + getNumericSalaire() + getNumericElectricite() + 
                              getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + 
                              getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges();
      const currentBenefit = agregatsActuels.beneficeTotal - chargesActuelles;
      const targetBenefit = parseFloat(solverConstraints.beneficeNet.value) || 0;
      const adjustment = currentBenefit - targetBenefit;
      x0 = chargesTotales + adjustment;
      console.log(`🎲 Initialisation charges:`);
      console.log(`   💰 Bénéfice actuel: ${currentBenefit.toLocaleString()} FCFA`);
      console.log(`   🎯 Bénéfice cible: ${targetBenefit.toLocaleString()} FCFA`);
      console.log(`   📊 Charges actuelles: ${chargesTotales.toLocaleString()} FCFA`);
      console.log(`   🔧 Ajustement: ${adjustment.toLocaleString()} FCFA`);
      console.log(`   ➡️ Estimation initiale: ${x0.toLocaleString()} FCFA`);
    } else if (solverVariable === 'peration') {
      x0 = getNumericPeration() * 100; // Partir de la pération actuelle (convertir en %)
      console.log(`🎲 Initialisation pération: ${x0}% (valeur actuelle)`);
    } else if (solverVariable === 'gainProduitsNobleFoieYellParKg') {
      x0 = getNumericGainProduitsNobleFoieYellParKg(); // Partir de la valeur actuelle des abats
      console.log(`🎲 Initialisation abats: ${x0.toLocaleString()} FCFA/kg (valeur actuelle)`);
    } else if (solverVariable.includes('marge')) {
      x0 = 15; // Partir de 15% comme marge de départ raisonnable
      console.log(`🎲 Initialisation marge: ${x0}% (estimation standard)`);
    }
    
    // Bornes de sécurité
    let minBound, maxBound;
    if (solverVariable === 'volumeMensuel') {
      minBound = 100000; // 100K minimum
      maxBound = 500000000; // 500M maximum
    } else if (solverVariable === 'chargesTotales') {
      minBound = -50000000; // Permettre des "charges négatives" (subventions)
      maxBound = 100000000; // 100M maximum
    } else if (solverVariable === 'peration') {
      minBound = 0; // 0% minimum
      maxBound = 50; // 50% maximum (pération très élevée)
    } else if (solverVariable === 'gainProduitsNobleFoieYellParKg') {
      minBound = 0; // 0 FCFA/kg minimum
      maxBound = 2000; // 2000 FCFA/kg maximum (très cher)
    } else if (solverVariable.includes('marge')) {
      minBound = 0; // 0%
      maxBound = 500; // 500% maximum
    }
    
    console.log(`🛡️ Bornes de sécurité: [${minBound.toLocaleString()}, ${maxBound.toLocaleString()}]`);
    console.log('='.repeat(80));
    
    let x = x0;
    
    for (let i = 0; i < maxIterations; i++) {
      console.log(`\n🔍 ITÉRATION ${i + 1}:`);
      console.log(`-`.repeat(40));
      
      const fx = f(x);
      const dfx = df(x);
      
      // Enregistrer l'itération pour l'affichage UI
      const iteration = {
        number: i + 1,
        x: x,
        fx: fx,
        dfx: dfx,
        converged: false,
        clamped: false
      };
      
      console.log(`🎯 Valeur actuelle: ${x.toLocaleString()}`);
      console.log(`📊 Erreur f(x): ${fx.toLocaleString()}`);
      console.log(`📈 Dérivée f'(x): ${dfx.toFixed(6)}`);
      
      // Vérifier la convergence
      if (Math.abs(fx) < tolerance) {
        const tempParams = getTemporaryParams(x);
        const beneficeNet = calculateBeneficeNetWithParams(tempParams);
        
        iteration.converged = true;
        iterations.push(iteration);
        setSolverIterations(iterations);
        
        console.log(`✅ CONVERGENCE ATTEINTE!`);
        console.log(`   📊 Erreur finale: ${Math.abs(fx).toLocaleString()} < ${tolerance.toLocaleString()}`);
        console.log(`   🎯 Solution: ${x.toLocaleString()}`);
        console.log(`   💰 Bénéfice net résultant: ${beneficeNet.toLocaleString()} FCFA`);
        console.log(`   ⚡ Convergence en ${i + 1} itérations`);
        console.log('='.repeat(80));
        
        // Calculer les marges finales pour affichage
        const finalMargins = calculateFinalMargins(tempParams);
        
        return {
          found: true,
          value: x,
          beneficeNet: beneficeNet,
          iterations: i + 1,
          iterationHistory: iterations,
          finalMargins: finalMargins,
          finalParams: tempParams
        };
      }
      
      // Vérifier que la dérivée n'est pas nulle (éviter division par zéro)
      if (Math.abs(dfx) < 1e-10) {
        console.log(`❌ ERREUR: Dérivée trop proche de zéro (${dfx})`);
        console.log(`   Point stationnaire détecté - impossible de continuer`);
        return { found: false, reason: 'Dérivée nulle - point stationnaire' };
      }
      
      // Newton-Raphson: x_{n+1} = x_n - f(x_n) / f'(x_n)
      const newX = x - fx / dfx;
      console.log(`🧮 Newton-Raphson: ${x.toLocaleString()} - ${fx.toLocaleString()} / ${dfx.toFixed(6)} = ${newX.toLocaleString()}`);
      
      // Appliquer les bornes de sécurité
      const clampedX = Math.max(minBound, Math.min(maxBound, newX));
      
      if (clampedX !== newX) {
        iteration.clamped = true;
        console.log(`⚠️ BRIDAGE APPLIQUÉ: ${newX.toLocaleString()} → ${clampedX.toLocaleString()}`);
        console.log(`   Raison: Sortie des bornes [${minBound.toLocaleString()}, ${maxBound.toLocaleString()}]`);
      }
      
      iteration.newX = clampedX;
      iterations.push(iteration);
      setSolverIterations([...iterations]); // Mise à jour temps réel
      
      // Vérifier la convergence du changement de x
      const deltaX = Math.abs(clampedX - x);
      console.log(`📏 Changement de x: ${deltaX.toLocaleString()}`);
      
      if (deltaX < 1) {
        const tempParams = getTemporaryParams(clampedX);
        const beneficeNet = calculateBeneficeNetWithParams(tempParams);
        
        console.log(`✅ CONVERGENCE PAR STABILITÉ!`);
        console.log(`   📏 Changement: ${deltaX.toLocaleString()} < 1`);
        console.log(`   🎯 Solution: ${clampedX.toLocaleString()}`);
        console.log(`   💰 Bénéfice net résultant: ${beneficeNet.toLocaleString()} FCFA`);
        console.log(`   ⚡ Convergence en ${i + 1} itérations`);
        console.log('='.repeat(80));
        
        // Calculer les marges finales pour affichage
        const finalMargins = calculateFinalMargins(tempParams);
        
        return {
          found: true,
          value: clampedX,
          beneficeNet: beneficeNet,
          iterations: i + 1,
          iterationHistory: iterations,
          finalMargins: finalMargins,
          finalParams: tempParams
        };
      }
      
      console.log(`➡️ Prochaine valeur: ${clampedX.toLocaleString()}`);
      x = clampedX;
      
      // Petit délai pour voir les itérations en temps réel
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`❌ ÉCHEC: Convergence non atteinte après ${maxIterations} itérations`);
    console.log('='.repeat(80));
    return { found: false, reason: `Max itérations atteint (${maxIterations})`, iterationHistory: iterations };
  };

  const renderSolverContent = () => (
    <>
      {/* Interface du Solveur */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">🎯 Solveur (Goal Seek)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Fixez certaines valeurs et laissez le solveur calculer automatiquement les autres variables pour atteindre votre objectif.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variables à fixer */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-md font-semibold mb-3 text-gray-800">📌 Variables à fixer</h4>
            
            {/* Bénéfice Net */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    beneficeNet: { ...solverConstraints.beneficeNet, fixed: !solverConstraints.beneficeNet.fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
              >
                <input
                  type="checkbox"
                  checked={solverConstraints.beneficeNet.fixed}
                  onChange={(e) => {
                    const newConstraints = {
                      ...solverConstraints,
                      beneficeNet: { ...solverConstraints.beneficeNet, fixed: e.target.checked }
                    };
                    setSolverConstraints(newConstraints);
                    checkAndAdjustSolverVariable(newConstraints);
                  }}
                  className="rounded"
                />
                <label className="text-sm font-medium cursor-pointer">Bénéfice Net Mensuel</label>
              </div>
              <input
                type="number"
                value={solverConstraints.beneficeNet.value}
                onChange={(e) => setSolverConstraints(prev => ({
                  ...prev,
                  beneficeNet: { ...prev.beneficeNet, value: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!solverConstraints.beneficeNet.fixed}
                className="w-32 p-1 text-sm border rounded"
                placeholder="1000000"
              />
            </div>

            {/* Marges des produits */}
            {[
              { key: 'margeBoeuf', label: 'Marge Bœuf (%)', produit: 'Boeuf' },
              { key: 'margeVeau', label: 'Marge Veau (%)', produit: 'Veau' },
              { key: 'margeOvin', label: 'Marge Ovin (%)', produit: 'Ovin' },
              { key: 'margePoulet', label: 'Marge Poulet (%)', produit: 'Poulet' },
              { key: 'margeOeuf', label: 'Marge Œuf (%)', produit: 'Oeuf' }
            ].map(({ key, label, produit }) => (
              <div key={key} className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
                <div 
                  className="flex items-center space-x-2 cursor-pointer"
                                  onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    [key]: { ...solverConstraints[key], fixed: !solverConstraints[key].fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
                >
                  <input
                    type="checkbox"
                    checked={solverConstraints[key].fixed}
                    onChange={(e) => {
                      const newConstraints = {
                        ...solverConstraints,
                        [key]: { ...solverConstraints[key], fixed: e.target.checked }
                      };
                      setSolverConstraints(newConstraints);
                      checkAndAdjustSolverVariable(newConstraints);
                    }}
                    className="rounded"
                  />
                  <label className="text-sm font-medium cursor-pointer">{label}</label>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={solverConstraints[key].value}
                  onChange={(e) => setSolverConstraints(prev => ({
                    ...prev,
                    [key]: { ...prev[key], value: parseFloat(e.target.value) || 0 }
                  }))}
                  disabled={!solverConstraints[key].fixed}
                  className="w-20 p-1 text-sm border rounded"
                  placeholder="15.0"
                />
              </div>
            ))}

            {/* Volume Mensuel */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    volumeMensuel: { ...solverConstraints.volumeMensuel, fixed: !solverConstraints.volumeMensuel.fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
              >
                <input
                  type="checkbox"
                  checked={solverConstraints.volumeMensuel.fixed}
                  onChange={(e) => {
                    const newConstraints = {
                      ...solverConstraints,
                      volumeMensuel: { ...solverConstraints.volumeMensuel, fixed: e.target.checked }
                    };
                    setSolverConstraints(newConstraints);
                    checkAndAdjustSolverVariable(newConstraints);
                  }}
                  className="rounded"
                />
                <label className="text-sm font-medium cursor-pointer">Volume Mensuel</label>
              </div>
              <input
                type="number"
                value={solverConstraints.volumeMensuel.value}
                onChange={(e) => setSolverConstraints(prev => ({
                  ...prev,
                  volumeMensuel: { ...prev.volumeMensuel, value: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!solverConstraints.volumeMensuel.fixed}
                className="w-32 p-1 text-sm border rounded"
                placeholder="20000000"
              />
            </div>

            {/* Charges Totales */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    chargesTotales: { ...solverConstraints.chargesTotales, fixed: !solverConstraints.chargesTotales.fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
              >
                <input
                  type="checkbox"
                  checked={solverConstraints.chargesTotales.fixed}
                  onChange={(e) => {
                    const newConstraints = {
                      ...solverConstraints,
                      chargesTotales: { ...solverConstraints.chargesTotales, fixed: e.target.checked }
                    };
                    setSolverConstraints(newConstraints);
                    checkAndAdjustSolverVariable(newConstraints);
                  }}
                  className="rounded"
                />
                <label className="text-sm font-medium cursor-pointer">Charges Totales</label>
              </div>
              <input
                type="number"
                value={solverConstraints.chargesTotales.value}
                onChange={(e) => setSolverConstraints(prev => ({
                  ...prev,
                  chargesTotales: { ...prev.chargesTotales, value: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!solverConstraints.chargesTotales.fixed}
                className="w-32 p-1 text-sm border rounded"
                placeholder="500000"
              />
            </div>

            {/* Pération % */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    peration: { ...solverConstraints.peration, fixed: !solverConstraints.peration.fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
              >
                <input
                  type="checkbox"
                  checked={solverConstraints.peration.fixed}
                  onChange={(e) => {
                    const newConstraints = {
                      ...solverConstraints,
                      peration: { ...solverConstraints.peration, fixed: e.target.checked }
                    };
                    setSolverConstraints(newConstraints);
                    checkAndAdjustSolverVariable(newConstraints);
                  }}
                  className="rounded"
                />
                <label className="text-sm font-medium cursor-pointer">Pération % (Bœuf/Veau)</label>
              </div>
              <input
                type="number"
                step="0.1"
                value={solverConstraints.peration.value}
                onChange={(e) => setSolverConstraints(prev => ({
                  ...prev,
                  peration: { ...prev.peration, value: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!solverConstraints.peration.fixed}
                className="w-20 p-1 text-sm border rounded"
                placeholder="13.0"
              />
            </div>

            {/* Abats par Kg */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  const newConstraints = {
                    ...solverConstraints,
                    gainProduitsNobleFoieYellParKg: { ...solverConstraints.gainProduitsNobleFoieYellParKg, fixed: !solverConstraints.gainProduitsNobleFoieYellParKg.fixed }
                  };
                  setSolverConstraints(newConstraints);
                  checkAndAdjustSolverVariable(newConstraints);
                }}
              >
                <input
                  type="checkbox"
                  checked={solverConstraints.gainProduitsNobleFoieYellParKg.fixed}
                  onChange={(e) => {
                    const newConstraints = {
                      ...solverConstraints,
                      gainProduitsNobleFoieYellParKg: { ...solverConstraints.gainProduitsNobleFoieYellParKg, fixed: e.target.checked }
                    };
                    setSolverConstraints(newConstraints);
                    checkAndAdjustSolverVariable(newConstraints);
                  }}
                  className="rounded"
                />
                <label className="text-sm font-medium cursor-pointer">Foie, Yell, Filet (Bœuf/Veau)</label>
              </div>
              <input
                type="number"
                value={solverConstraints.gainProduitsNobleFoieYellParKg.value}
                onChange={(e) => setSolverConstraints(prev => ({
                  ...prev,
                  gainProduitsNobleFoieYellParKg: { ...prev.gainProduitsNobleFoieYellParKg, value: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!solverConstraints.gainProduitsNobleFoieYellParKg.fixed}
                className="w-20 p-1 text-sm border rounded"
                placeholder="200"
              />
            </div>
          </div>

          {/* Variable à résoudre */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-semibold text-gray-800">🎲 Variable à résoudre</h4>
              <button
                onClick={updateSolverDefaults}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                title="Mettre à jour avec les valeurs actuelles de l'application"
              >
                🔄 Valeurs actuelles
              </button>
            </div>
            
            <select
              value={solverVariable}
              onChange={(e) => setSolverVariable(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            >
              {!solverConstraints.chargesTotales.fixed && (
                <option value="chargesTotales">Charges Totales</option>
              )}
              {!solverConstraints.volumeMensuel.fixed && (
                <option value="volumeMensuel">Volume Mensuel</option>
              )}
              {!solverConstraints.margeBoeuf.fixed && (
                <option value="margeBoeuf">Marge Bœuf (%)</option>
              )}
              {!solverConstraints.margeVeau.fixed && (
                <option value="margeVeau">Marge Veau (%)</option>
              )}
              {!solverConstraints.margeOvin.fixed && (
                <option value="margeOvin">Marge Ovin (%)</option>
              )}
              {!solverConstraints.margePoulet.fixed && (
                <option value="margePoulet">Marge Poulet (%)</option>
              )}
              {!solverConstraints.margeOeuf.fixed && (
                <option value="margeOeuf">Marge Œuf (%)</option>
              )}
              {!solverConstraints.peration.fixed && (
                <option value="peration">Pération % (Bœuf/Veau)</option>
              )}
              {!solverConstraints.gainProduitsNobleFoieYellParKg.fixed && (
                <option value="gainProduitsNobleFoieYellParKg">Foie, Yell, Filet (Bœuf/Veau)</option>
              )}
            </select>

            <button
              onClick={handleSolve}
              disabled={solverLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium transition-colors disabled:opacity-50"
            >
              {solverLoading ? '🔄 Résolution...' : '🎯 Résoudre'}
            </button>

            {/* Résultats */}
            {solverResult && (
              <div className={`mt-4 p-3 border rounded ${
                solverResult.success 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-red-100 border-red-300'
              }`}>
                {solverResult.success ? (
                  <>
                    <h5 className="font-semibold text-green-800 mb-2">
                      ✅ Solution trouvée {solverResult.iterations && `(${solverResult.iterations} itérations)`}
                    </h5>
                    <p className="text-sm text-green-700">
                      <strong>{getSolverVariableLabel(solverVariable)}:</strong> {formatSolverResult(solverResult.value)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Bénéfice net résultant: {Math.round(solverResult.beneficeNet).toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      🚀 Algorithme Newton-Raphson utilisé
                    </p>
                    
                    {/* Affichage des marges finales */}
                    {solverResult.finalMargins && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                        <h6 className="font-semibold text-green-800 mb-2 text-xs">📊 Marges finales de convergence :</h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(solverResult.finalMargins).map(([nom, info]) => (
                            <div key={nom} className="flex justify-between items-center">
                              <span className="text-green-700">
                                {nom} {info.hasAbats && '🥩'} {!info.editable && '†'}:
                              </span>
                              <span className="font-mono font-semibold text-green-800">
                                {info.percentage.toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          🥩 = Avec Foie, Yell, Filet • † = Calculé (non-éditable)
                        </p>
                      </div>
                    )}

                    {/* Affichage des répartitions utilisées */}
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <h6 className="font-semibold text-yellow-800 mb-2 text-xs">📊 Répartitions utilisées par le solveur :</h6>
                      <div className="space-y-1 text-xs">
                        {Object.entries(produits).map(([nom, data]) => (
                          <div key={nom} className="flex justify-between">
                            <span className="text-yellow-700">{nom}:</span>
                            <span className="font-mono font-semibold text-yellow-800">
                              {(data.repartition * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Affichage des répartitions de l'interface principale */}
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <h6 className="font-semibold text-green-800 mb-2 text-xs">📊 Répartitions de l'interface principale :</h6>
                      <div className="space-y-1 text-xs">
                        {Object.entries(getNumericAdditionalVolume() > 0 ? getAdjustedRepartitions() : produits).map(([nom, data]) => (
                          <div key={nom} className="flex justify-between">
                            <span className="text-green-700">{nom}:</span>
                            <span className="font-mono font-semibold text-green-800">
                              {(data.repartition * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Affichage des paramètres finaux */}
                    {solverResult.finalParams && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <h6 className="font-semibold text-blue-800 mb-2 text-xs">⚙️ Paramètres finaux de convergence :</h6>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Volume Mensuel:</span>
                            <span className="font-mono font-semibold text-blue-800">
                              {Math.round(solverResult.finalParams.volume).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Charges Totales:</span>
                            <span className="font-mono font-semibold text-blue-800">
                              {Math.round(solverResult.finalParams.chargesTotales).toLocaleString()} FCFA
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Pération % (Bœuf/Veau):</span>
                            <span className="font-mono font-semibold text-blue-800">
                              {(solverResult.finalParams.peration * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Foie, Yell, Filet:</span>
                            <span className="font-mono font-semibold text-blue-800">
                              {Math.round(solverResult.finalParams.gainProduitsNobleFoieYellParKg).toLocaleString()} FCFA/kg
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h5 className="font-semibold text-red-800 mb-2">❌ Aucune solution trouvée</h5>
                    <p className="text-sm text-red-700 mb-1">
                      <strong>Bénéfice actuel:</strong> {Math.round(solverResult.currentBenefit).toLocaleString()} FCFA
                    </p>
                    <p className="text-sm text-red-700 mb-1">
                      <strong>Objectif:</strong> {Math.round(solverResult.targetBenefit).toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      💡 {solverResult.suggestion}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Tableau des itérations de convergence */}
            {solverIterations.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h5 className="font-semibold text-blue-800 mb-3">📊 Historique de convergence Newton-Raphson</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="p-2 text-left">Itération</th>
                        <th className="p-2 text-right">Valeur (x)</th>
                        <th className="p-2 text-right">Erreur f(x)</th>
                        <th className="p-2 text-right">Dérivée f'(x)</th>
                        <th className="p-2 text-right">Nouvelle valeur</th>
                        <th className="p-2 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solverIterations.map((iter, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'} ${
                          iter.converged ? 'bg-green-100 font-semibold' : ''
                        }`}>
                          <td className="p-2">{iter.number}</td>
                          <td className="p-2 text-right font-mono">
                            {solverVariable.includes('marge') 
                              ? iter.x.toFixed(2) + '%'
                              : Math.round(iter.x).toLocaleString()
                            }
                          </td>
                          <td className="p-2 text-right font-mono">
                            {Math.abs(iter.fx) < 1000 
                              ? iter.fx.toFixed(1)
                              : Math.round(iter.fx).toLocaleString()
                            }
                          </td>
                          <td className="p-2 text-right font-mono">
                            {iter.dfx.toFixed(4)}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {iter.newX !== undefined ? (
                              solverVariable.includes('marge') 
                                ? iter.newX.toFixed(2) + '%'
                                : Math.round(iter.newX).toLocaleString()
                            ) : '-'}
                          </td>
                          <td className="p-2 text-center">
                            {iter.converged ? (
                              <span className="text-green-600 font-bold">✅ Convergé</span>
                            ) : iter.clamped ? (
                              <span className="text-orange-600">⚠️ Bridé</span>
                            ) : (
                              <span className="text-blue-600">➡️ Continue</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Chaque itération applique Newton-Raphson: x_n+1 = x_n - f(x_n) / f'(x_n)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderFAQContent = () => (
    <>
      {/* FAQ Générale */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-teal-800">❓ Questions Fréquemment Posées</h3>
        
        {/* Valeurs par défaut */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">📊 Valeurs par Défaut de la Simulation</h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">CA (Chiffre d'Affaires) Mensuel</div>
              <div className="text-lg font-bold text-blue-600">20,000,000</div>
              <div className="text-sm text-gray-600">Hypothèse de volume de vente mensuel total (modifiable dans les paramètres)</div>
                  </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">CA Annuel</div>
              <div className="text-lg font-bold text-blue-600">240,000,000</div>
              <div className="text-sm text-gray-600">Basé sur l'hypothèse : 20,000,000 × 12 mois</div>
                </div>
            {/* Section cachée car incorrecte - utilisait une estimation approximative obsolète
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">Bénéfice Mensuel Approximatif</div>
              <div className="text-lg font-bold text-green-600">~2,000,000</div>
              <div className="text-sm text-gray-600">Basé sur l'hypothèse CA : environ 10% du CA mensuel</div>
              </div>
            */}
            </div>
          </div>

        {/* Paramètres financiers */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">🏦 Paramètres Financiers DCF</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">Taux d'actualisation annuel</div>
              <div className="text-lg font-bold text-red-600">12%</div>
              <div className="text-sm text-gray-600">Taux mensuel: 0.949%</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">CAPEX (annuel)</div>
              <div className="text-lg font-bold text-purple-600">5,000,000</div>
              <div className="text-sm text-gray-600">2.08% du CA annuel (240M × 2.08%)</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">BFR (annuel)</div>
              <div className="text-lg font-bold text-orange-600">250,000</div>
              <div className="text-sm text-gray-600">One-shot initial (selon nouvelles formules)</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">D&A (annuel)</div>
              <div className="text-lg font-bold text-indigo-600">1,250,000</div>
                              <div className="text-sm text-gray-600">
                  {depreciationAmortissement && depreciationAmortissement.trim() !== '' 
                    ? 'Valeur manuelle' 
                    : `Charges fixes ÷ Durée amortissement × 12`
                  }
                </div>
            </div>
          </div>
        </div>

        {/* Explications des concepts */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">📚 Explications des Concepts Financiers</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💼 CAPEX (Capital Expenditure)</div>
              <div className="text-sm text-gray-600">
                Dépenses d'investissement en capital pour acquérir, maintenir ou améliorer des actifs physiques 
                (équipements, bâtiments, véhicules, etc.). Ces investissements sont essentiels pour la croissance 
                et le maintien de l'activité.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💰 BFR (Besoin en Fonds de Roulement)</div>
              <div className="text-sm text-gray-600">
                Différence entre les actifs circulants (stocks, créances clients) et les passifs circulants 
                (dettes fournisseurs). Il représente le besoin de financement pour faire fonctionner l'activité 
                au quotidien.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📉 D&A (Dépréciation et Amortissement)</div>
              <div className="text-sm text-gray-600">
                <strong>Dépréciation :</strong> Réduction de la valeur d'un actif au fil du temps, généralement 
                en raison de l'usure ou du vieillissement. Cela impacte le bilan de l'entreprise en diminuant 
                la valeur de ses actifs.<br/><br/>
                <strong>Amortissement :</strong> Spécifique aux actifs incorporels (comme les brevets ou les logiciels), 
                et comme la dépréciation, il permet d'étaler le coût sur la durée de vie de l'actif.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 WACC (Weighted Average Cost of Capital)</div>
              <div className="text-sm text-gray-600">
                Coût moyen pondéré du capital qui représente le taux de rendement minimum requis par les 
                investisseurs (actionnaires et créanciers). Il est utilisé pour actualiser les flux de 
                trésorerie futurs dans le modèle DCF.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📈 Croissance Terminale (g)</div>
              <div className="text-sm text-gray-600">
                Taux de croissance à perpétuité utilisé pour calculer la valeur terminale. Il représente 
                la croissance annuelle attendue après la période de prévision détaillée (généralement 3-5%).
              </div>
            </div>
          </div>
        </div>

        {/* Nouvelle Marge Moyenne */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">📊 Nouvelle Marge Moyenne (ventes)</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">🎯 Qu'est-ce que la Marge Moyenne (ventes) ?</div>
              <div className="text-sm text-gray-600">
                La nouvelle marge moyenne calcule directement le bénéfice par FCFA de chiffre d'affaires :
                <br/><strong>Formule :</strong> Marge = Σ(Bénéfices par produit) ÷ Volume Total
                <br/>Cette méthode remplace l'ancienne moyenne pondérée des markups.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💡 Pourquoi ce changement ?</div>
              <div className="text-sm text-gray-600">
                • <strong>Plus précise :</strong> Calcule directement la rentabilité de chaque FCFA vendu<br/>
                • <strong>Cohérence DCF :</strong> Compatible avec les calculs financiers (ROI, VAN, TRI)<br/>
                • <strong>Seuil de rentabilité :</strong> Permet de calculer facilement le CA minimum nécessaire<br/>
                • <strong>Indicateur de performance :</strong> Montre l'efficacité commerciale réelle
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">🔍 Comment ça marche ?</div>
              <div className="text-sm text-gray-600">
                1. <strong>Calcul par produit :</strong> Bénéfice = CA - COGS (avec ajustements abats/pération)<br/>
                2. <strong>Somme totale :</strong> Addition de tous les bénéfices produits<br/>
                3. <strong>Division :</strong> Bénéfice total ÷ Volume total = Marge sur ventes<br/>
                4. <strong>Utilisation :</strong> Seuil = Charges ÷ Marge moyenne (ventes)
              </div>
            </div>
          </div>
        </div>

        {/* Indicateurs financiers */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">📈 Indicateurs Financiers</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💵 EBIT (Earnings Before Interest and Taxes)</div>
              <div className="text-sm text-gray-600">
                Bénéfice avant intérêts et impôts. Il mesure la rentabilité des opérations d'une entreprise 
                sans l'impact de sa structure de capital ni les impôts qu'elle doit payer.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💵 EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)</div>
              <div className="text-sm text-gray-600">
                Bénéfice avant intérêts, impôts, dépréciation et amortissement. Il permet d'évaluer les 
                performances opérationnelles de l'entreprise dans une perspective plus brute et de mettre 
                l'accent sur la capacité à générer des liquidités.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💵 NOPAT (Net Operating Profit After Taxes)</div>
              <div className="text-sm text-gray-600">
                Résultat net d'exploitation après impôts. Il représente le bénéfice opérationnel après 
                déduction des impôts, calculé comme : NOPAT = EBIT × (1 - Taux d'imposition).
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💵 FCF (Free Cash Flow)</div>
              <div className="text-sm text-gray-600">
                Flux de trésorerie disponible. Dans ce modèle : FCF = NOPAT + D&A mensuel.
                <br/>CAPEX et ΔBFR sont des investissements one-shot initiaux (t=0) uniquement.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 ROI (Return on Investment)</div>
              <div className="text-sm text-gray-600">
                <strong>Retour sur Investissement :</strong> Mesure la rentabilité d'un investissement en comparant 
                le bénéfice généré à l'investissement initial.<br/><br/>
                <strong>Formule :</strong> ROI = (Bénéfice Net / Investissement Initial) × 100<br/><br/>
                <strong>Dans notre modèle :</strong><br/>
                • Bénéfice Net = EBIT (Marge brute - Charges)<br/>
                • Investissement Initial = CAPEX<br/>
                • ROI Mensuel = (EBIT mensuel / CAPEX) × 100<br/>
                • ROI Annuel = (EBIT annuel / CAPEX) × 100<br/><br/>
                <strong>Interprétation :</strong><br/>
                • ROI &gt; 0% : Investissement rentable<br/>
                • ROI élevé : Excellente rentabilité (attractif pour les investisseurs)<br/>
                • Un ROI annuel de 24% signifie que l'investissement génère 24% de bénéfice par an
              </div>
            </div>
          </div>
        </div>

        {/* Calculs DCF */}
              <div>
          <h4 className="text-sm font-semibold text-teal-700 mb-3">🧮 Calculs DCF Détaillés</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 Taux d'Actualisation Mensuel</div>
              <div className="text-sm text-gray-600">
                <strong>Formule :</strong> Taux mensuel = (1 + Taux annuel)<sup>1/12</sup> - 1<br/><br/>
                <strong>Calcul par défaut :</strong> (1 + 12%)<sup>1/12</sup> - 1 = 0.949% par mois<br/><br/>
                <strong>Explication :</strong> Le taux annuel de 12% est converti en taux mensuel équivalent. 
                Cette conversion utilise la formule de capitalisation composée pour maintenir la cohérence 
                entre les périodes annuelles et mensuelles.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">💰 Flux Actualisé</div>
              <div className="text-sm text-gray-600">
                <strong>Formule :</strong> Flux Actualisé = Flux Net × (1 + Taux d'actualisation mensuel)<sup>-mois</sup><br/><br/>
                <strong>Explication :</strong> Le flux actualisé représente la valeur présente d'un flux de trésorerie futur. 
                Plus le flux est éloigné dans le temps, plus sa valeur actuelle est réduite par l'actualisation.<br/><br/>
                <strong>Exemple avec notre taux par défaut (0.949%) :</strong> Si le flux net mensuel est de 1,000,000 :<br/>
                • Mois 1 : 1,000,000 × (1.00949)<sup>-1</sup> = 990,599<br/>
                • Mois 12 : 1,000,000 × (1.00949)<sup>-12</sup> = 892,857<br/>
                • Mois 60 : 1,000,000 × (1.00949)<sup>-60</sup> = 567,426
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 VAN (NPV - Net Present Value)</div>
              <div className="text-sm text-gray-600">
                <strong>Formule :</strong> VAN = Σ(Flux Actualisés) = Investissement Initial + Σ(Flux Mensuels Actualisés)<br/><br/>
                <strong>Explication :</strong> La VAN représente la valeur nette créée par le projet. Une VAN positive indique 
                que le projet génère plus de valeur que le coût du capital investi.<br/><br/>
                <strong>Interprétation :</strong><br/>
                • VAN &gt; 0 : Projet rentable<br/>
                • VAN = 0 : Projet à l'équilibre<br/>
                • VAN &lt; 0 : Projet non rentable
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📈 TRI (IRR - Internal Rate of Return)</div>
              <div className="text-sm text-gray-600">
                <strong>Définition :</strong> Le TRI est le taux d'actualisation qui rend la VAN égale à zéro.<br/><br/>
                <strong>Calcul :</strong> Résolution itérative de l'équation :<br/>
                VAN = 0 = Investissement Initial + Σ(Flux Net × (1 + TRI)<sup>-mois</sup>)<br/><br/>
                <strong>Interprétation :</strong> Le TRI représente le taux de rendement annuel du projet. 
                Il doit être supérieur au coût du capital (WACC) pour que le projet soit viable.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 Indice de Profitabilité (PI)</div>
              <div className="text-sm text-gray-600">
                <strong>Formule :</strong> PI = (VAN + Investissement Initial) ÷ Investissement Initial<br/><br/>
                <strong>Explication :</strong> L'indice de profitabilité mesure le rapport entre la valeur créée 
                et l'investissement initial.<br/><br/>
                <strong>Interprétation :</strong><br/>
                • PI &gt; 1 : Projet viable (créateur de valeur)<br/>
                • PI = 1 : Projet à l'équilibre<br/>
                • PI &lt; 1 : Projet non viable
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">⏱️ Délai de Récupération Actualisé</div>
              <div className="text-sm text-gray-600">
                <strong>Définition :</strong> Temps nécessaire pour que le cumul des flux actualisés devienne positif.<br/><br/>
                <strong>Calcul :</strong> Recherche du premier mois où Cumul Actualisé ≥ 0<br/><br/>
                <strong>Explication :</strong> Contrairement au délai de récupération simple, cette méthode 
                prend en compte la valeur temporelle de l'argent. Plus le délai est court, plus le projet 
                est attractif en termes de liquidité.
              </div>
            </div>
          </div>
        </div>

        {/* Gordon Growth Model */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-teal-700 mb-3">🌱 Gordon Growth Model - Explication Complète</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📚 Définition et Concept</div>
              <div className="text-sm text-gray-600">
                Le <strong>Gordon Growth Model</strong> est une méthode de valorisation qui calcule la valeur d'un actif 
                en se basant sur ses flux futurs qui croissent à un taux constant et perpétuel. Il est particulièrement 
                utilisé pour calculer la <strong>Valeur Terminale</strong> dans les modèles DCF.
              </div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 Formule de Base</div>
              <div className="text-sm text-gray-600">
                <strong>Formule :</strong> Valeur = D₁ / (r - g)<br/><br/>
                Où :<br/>
                • <strong>D₁</strong> = Dividende (ou FCF) de l'année prochaine<br/>
                • <strong>r</strong> = Taux de rendement requis (WACC)<br/>
                • <strong>g</strong> = Taux de croissance perpétuelle<br/><br/>
                <strong>Dans notre cas :</strong> Valeur Terminale = FCF × (1 + g) / (WACC - g)
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">🔍 Dérivation Mathématique</div>
              <div className="text-sm text-gray-600">
                <strong>1. Série géométrique infinie :</strong><br/>
                Si on a des flux qui croissent à 3% par an indéfiniment :<br/>
                • Année 1: FCF × 1.03<br/>
                • Année 2: FCF × 1.03²<br/>
                • Année 3: FCF × 1.03³<br/>
                • ...<br/><br/>
                <strong>2. Actualisation de chaque flux :</strong><br/>
                Valeur = FCF×1.03/(1+r) + FCF×1.03²/(1+r)² + FCF×1.03³/(1+r)³ + ...<br/><br/>
                <strong>3. Formule de la série géométrique :</strong><br/>
                S = a / (1 - q)<br/>
                Où : a = premier terme = FCF × 1.03 / (1 + r)<br/>
                q = raison = 1.03 / (1 + r)<br/><br/>
                <strong>4. Simplification :</strong><br/>
                Valeur = [FCF × 1.03 / (1 + r)] / [1 - (1.03 / (1 + r))]<br/>
                Valeur = [FCF × 1.03] / [(1 + r) - 1.03]<br/>
                Valeur = FCF × 1.03 / (r - 0.03)<br/>
                Valeur = FCF × (1 + g) / (r - g)
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">🎯 Interprétation Intuitive</div>
              <div className="text-sm text-gray-600">
                <strong>Sans croissance (g = 0%) :</strong><br/>
                Valeur = FCF / r<br/>
                • Tu paies pour recevoir FCF chaque année<br/>
                • Le rendement est r%<br/><br/>
                <strong>Avec croissance (g &gt; 0%) :</strong><br/>
                Valeur = FCF × (1 + g) / (r - g)<br/>
                • Tu paies pour recevoir FCF qui croît à g%<br/>
                • Le rendement net est (r - g)%<br/><br/>
                <strong>Logique économique :</strong><br/>
                • Tu investis pour recevoir des flux croissants<br/>
                • Le rendement brut est r (12%)<br/>
                • La croissance g (3%) "compense" une partie du rendement<br/>
                • Le rendement net est donc (r - g) = 9%
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">⚠️ Conditions d'Utilisation</div>
              <div className="text-sm text-gray-600">
                <strong>1. Croissance stable :</strong><br/>
                • Le taux g doit être <strong>constant</strong> et <strong>soutenable</strong><br/>
                • Pas de croissance explosive ou cyclique<br/><br/>
                <strong>2. Croissance inférieure au rendement :</strong><br/>
                • <strong>g &lt; r</strong> (sinon la valeur devient infinie)<br/>
                • En pratique : g &lt; 3-4% pour être réaliste<br/><br/>
                <strong>3. Horizon infini :</strong><br/>
                • L'entreprise doit être considérée comme <strong>perpétuelle</strong><br/>
                • Pas de liquidation prévue
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📈 Exemple Concret dans Notre Modèle</div>
              <div className="text-sm text-gray-600">
                <strong>Paramètres :</strong><br/>
                • FCF = 5,729,200 FCFA (annuel)<br/>
                • r (WACC) = 12%<br/>
                • g = 3%<br/><br/>
                <strong>Calcul :</strong><br/>
                Valeur Terminale = 5,729,200 × (1 + 0.03) / (0.12 - 0.03)<br/>
                Valeur Terminale = 5,901,076 / 0.09<br/>
                Valeur Terminale = 65,567,509 FCFA<br/><br/>
                <strong>Interprétation :</strong><br/>
                • Tu investis pour recevoir des flux qui croissent de 3% par an<br/>
                • Le rendement brut est 12%<br/>
                • Le rendement net est 9% (12% - 3%)<br/>
                • La valeur terminale représente la valeur de tous les flux futurs
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">🔄 Pourquoi (r - g) ?</div>
              <div className="text-sm text-gray-600">
                <strong>Exemple concret :</strong><br/>
                • Tu investis 100 FCFA<br/>
                • Tu reçois 12 FCFA (rendement 12%)<br/>
                • Mais les flux croissent de 3% par an<br/>
                • <strong>Rendement net</strong> = 12% - 3% = 9%<br/><br/>
                <strong>Logique :</strong><br/>
                • WACC = Ce que tu veux gagner (12%)<br/>
                • g = Ce que l'entreprise croît (3%)<br/>
                • WACC - g = Le "surplus" que tu gagnes réellement (9%)
              </div>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 Avantages et Limitations</div>
              <div className="text-sm text-gray-600">
                <strong>✅ Avantages :</strong><br/>
                • <strong>Simple</strong> à comprendre et utiliser<br/>
                • <strong>Intuitif</strong> économiquement<br/>
                • <strong>Standard</strong> en finance<br/><br/>
                <strong>⚠️ Limitations :</strong><br/>
                • <strong>Hypothèse forte</strong> de croissance perpétuelle<br/>
                • <strong>Sensible</strong> aux paramètres g et r<br/>
                • <strong>Pas adapté</strong> aux entreprises en forte croissance ou en déclin<br/><br/>
                <strong>Comparaison avec d'autres méthodes :</strong><br/>
                • <strong>Gordon</strong> : Croissance constante, Simple, Précision moyenne<br/>
                • <strong>DCF détaillé</strong> : Croissance variable, Complexe, Précision élevée<br/>
                • <strong>Multiples</strong> : N/A, Simple, Précision faible
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderFormulesContent = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-yellow-800">🧮 Éditeur de Formules Personnalisées</h3>
      
      <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">📝 Instructions</h4>
        <div className="text-sm text-yellow-700">
          <p className="mb-2">Vous pouvez personnaliser les formules de calcul utilisées dans l'application. Variables disponibles :</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono bg-white p-2 rounded">
            <span>• beneficeTotal</span>
            <span>• chargesMensuelles</span>
            <span>• chargesTotales</span>
            <span>• daMensuel</span>
            <span>• tauxImposition</span>
            <span>• capex</span>
            <span>• bfr</span>
            <span>• tresorerie</span>
            <span>• ebitda</span>
            <span>• ebit</span>
            <span>• nopat</span>
            <span>• fcfMensuel</span>
            <span>• roicMensuel</span>
          </div>
          <p className="mt-2 text-xs">Utilisez la syntaxe JavaScript (ex: Math.pow, +, -, *, /, parenthèses)</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(formulesPersonnalisees).map(([nom, formule]) => (
          <div key={nom} className="bg-white p-4 rounded-lg border border-yellow-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {nom.toUpperCase()} :
            </label>
            
            {/* Zone d'édition avec dropdown de variables */}
            <div className="relative">
              <textarea
                id={`formula-${nom}`}
                value={formule}
                onChange={(e) => setFormulesPersonnalisees(prev => ({
                  ...prev,
                  [nom]: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono"
                style={{ fontSize: '14px' }}
                rows="3"
                placeholder={`Cliquez sur les boutons ci-dessous pour construire votre formule`}
              />
              
              {/* Dropdown pour insérer des variables */}
              <div className="mt-2">
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700 mr-2">📊 Variables Financières:</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { variable: 'beneficeTotal', label: 'Bénéfice Total', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                    { variable: 'chargesMensuelles', label: 'Charges Mensuelles', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                    { variable: 'chargesTotales', label: 'Charges Totales', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                    { variable: 'daMensuel', label: 'D&A Mensuel', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                    { variable: 'tauxImposition', label: 'Taux Imposition', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                    { variable: 'capex', label: 'CAPEX', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
                    { variable: 'bfr', label: 'BFR', color: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
                    { variable: 'tresorerie', label: 'Trésorerie', color: 'bg-green-100 text-green-700 hover:bg-green-200' }
                  ].map(({ variable, label, color }) => (
                    <button
                      key={variable}
                      onClick={() => {
                        const textarea = document.getElementById(`formula-${nom}`);
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentValue = formule;
                        const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
                        
                        setFormulesPersonnalisees(prev => ({
                          ...prev,
                          [nom]: newValue
                        }));
                        
                        // Remettre le focus et positionner le curseur
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + variable.length, start + variable.length);
                        }, 0);
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${color}`}
                      title={`Insérer ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Variables calculées */}
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700 mr-2">🧮 Variables Calculées:</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { variable: 'ebitda', label: 'EBITDA', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                    { variable: 'ebit', label: 'EBIT', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                    { variable: 'nopat', label: 'NOPAT', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                    { variable: 'fcfMensuel', label: 'FCF Mensuel', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                    { variable: 'roicMensuel', label: 'ROIC Mensuel', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
                    { variable: 'vanFluxOperationnels', label: 'VAN Flux Op.', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                    { variable: 'vanValeurTerminale', label: 'VAN Val. Term.', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                    { variable: 'investissementInitial', label: 'Invest. Initial', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
                    { variable: 'valeurTerminale', label: 'Val. Terminale', color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
                    { variable: 'tauxActualisation', label: 'Taux Actua.', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { variable: 'dureeAnalyse', label: 'Durée Analyse', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' }
                  ].map(({ variable, label, color }) => (
                    <button
                      key={variable}
                      onClick={() => {
                        const textarea = document.getElementById(`formula-${nom}`);
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentValue = formule;
                        const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
                        
                        setFormulesPersonnalisees(prev => ({
                          ...prev,
                          [nom]: newValue
                        }));
                        
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + variable.length, start + variable.length);
                        }, 0);
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${color}`}
                      title={`Insérer ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Opérateurs */}
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700 mr-2">⚡ Opérateurs:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { op: ' + ', label: '+', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: ' - ', label: '−', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: ' * ', label: '×', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: ' / ', label: '÷', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: '(', label: '(', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: ')', label: ')', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                    { op: 'Math.pow(', label: 'Puissance', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                    { op: 'Math.sqrt(', label: 'Racine', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                    { op: 'Math.abs(', label: 'Absolue', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' }
                  ].map(({ op, label, color }) => (
                    <button
                      key={op}
                      onClick={() => {
                        const textarea = document.getElementById(`formula-${nom}`);
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentValue = formule;
                        const newValue = currentValue.substring(0, start) + op + currentValue.substring(end);
                        
                        setFormulesPersonnalisees(prev => ({
                          ...prev,
                          [nom]: newValue
                        }));
                        
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + op.length, start + op.length);
                        }, 0);
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${color}`}
                      title={`Insérer ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Boutons d'action rapide */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setFormulesPersonnalisees(prev => ({
                      ...prev,
                      [nom]: ''
                    }))}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    🗑️ Effacer
                  </button>
                  <button
                    onClick={() => {
                      const defaultFormulas = {
                        ebitda: 'beneficeTotal - chargesMensuelles',
                        ebit: 'ebitda - daMensuel',
                        nopat: 'ebit * (1 - tauxImposition / 100)',
                        fcfMensuel: 'nopat + daMensuel',
                        fcfAnnuel: 'fcfMensuel * 12',
                        roicMensuel: 'nopat / (capex + bfr - tresorerie)',
                        roicAnnuel: 'Math.pow(1 + roicMensuel, 12) - 1',
                        beneficeNetMensuel: 'beneficeTotal - chargesTotales',
                        vanFluxOperationnels: '0', // Sera calculé avec boucle DCF
                        vanValeurTerminale: 'valeurTerminale / Math.pow(1 + tauxActualisation, dureeAnalyse)',
                        investissementInitial: 'capex + bfr',
                        van: 'vanFluxOperationnels + vanValeurTerminale - investissementInitial'
                      };
                      setFormulesPersonnalisees(prev => ({
                        ...prev,
                        [nom]: defaultFormulas[nom] || ''
                      }));
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    🔄 Défaut
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <strong>Exemple:</strong> {nom === 'ebitda' ? 'beneficeTotal - chargesMensuelles' : 
                       nom === 'ebit' ? 'ebitda - daMensuel' :
                       nom === 'nopat' ? 'ebit * (1 - tauxImposition / 100)' :
                       nom === 'fcfMensuel' ? 'nopat + daMensuel' :
                       nom === 'fcfAnnuel' ? 'fcfMensuel * 12' :
                       nom === 'roicMensuel' ? 'nopat / (capex + bfr - tresorerie)' :
                       nom === 'roicAnnuel' ? 'Math.pow(1 + roicMensuel, 12) - 1' :
                       nom === 'beneficeNetMensuel' ? 'beneficeTotal - chargesTotales' :
                       nom === 'vanFluxOperationnels' ? '0 (calculé avec boucle DCF)' :
                       nom === 'vanValeurTerminale' ? 'valeurTerminale / Math.pow(1 + tauxActualisation, dureeAnalyse)' :
                       nom === 'investissementInitial' ? 'capex + bfr' :
                       nom === 'van' ? 'vanFluxOperationnels + vanValeurTerminale - investissementInitial' :
                       'Formule personnalisée'}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={sauvegarderFormules}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
        >
          💾 Sauvegarder dans Cookie
        </button>
        <button
          onClick={chargerFormules}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          📂 Charger depuis Cookie
        </button>
        <button
          onClick={reinitialiserFormules}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          🔄 Réinitialiser par Défaut
        </button>
        <button
          onClick={() => {
            if (!formulesPersonnalisees.van) {
              setFormulesPersonnalisees(prev => ({
                ...prev,
                van: 'vanFluxOperationnels + vanValeurTerminale - investissementInitial'
              }));
              alert('✅ Formule VAN ajoutée !');
            } else {
              alert('ℹ️ La formule VAN existe déjà.');
            }
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
        >
          ➕ Ajouter VAN
        </button>
        <button
          onClick={() => {
            // Test des formules avec les variables actuelles
            const variables = {
              beneficeTotal: getBeneficeTotalActif(),
              chargesMensuelles: chargesMensuelles,
              chargesTotales: chargesTotales,
              daMensuel: getNumericDepreciationAmortissement() / 12,
              tauxImposition: getNumericTauxImposition(),
              capex: getNumericCapex(),
              bfr: getNumericBfr(),
              tresorerie: getNumericTresorerie(),
              ebitda: 0, // Sera calculé dynamiquement
              ebit: 0,
              nopat: 0,
              fcfMensuel: 0,
              roicMensuel: 0,
              // Variables DCF pour la VAN
              vanFluxOperationnels: 10000000, // Exemple 
              vanValeurTerminale: 5000000, // Exemple
              investissementInitial: getNumericCapex() + getNumericBfr(),
              valeurTerminale: 15000000,
              tauxActualisation: 0.01,
              croissanceTerminale: 0.0025,
              dureeAnalyse: getNumericDureeAnalyse()
            };
            
            // Calcul séquentiel des formules
            try {
              variables.ebitda = evaluerFormule(formulesPersonnalisees.ebitda, variables);
              variables.ebit = evaluerFormule(formulesPersonnalisees.ebit, variables);
              variables.nopat = evaluerFormule(formulesPersonnalisees.nopat, variables);
              variables.fcfMensuel = evaluerFormule(formulesPersonnalisees.fcfMensuel, variables);
              variables.roicMensuel = evaluerFormule(formulesPersonnalisees.roicMensuel, variables);
              
              const resultats = {
                ebitda: variables.ebitda,
                ebit: variables.ebit,
                nopat: variables.nopat,
                fcfMensuel: variables.fcfMensuel,
                fcfAnnuel: evaluerFormule(formulesPersonnalisees.fcfAnnuel, variables),
                roicMensuel: variables.roicMensuel,
                roicAnnuel: evaluerFormule(formulesPersonnalisees.roicAnnuel, variables),
                beneficeNetMensuel: evaluerFormule(formulesPersonnalisees.beneficeNetMensuel, variables),
                vanFluxOperationnels: evaluerFormule(formulesPersonnalisees.vanFluxOperationnels || '0', variables),
                vanValeurTerminale: evaluerFormule(formulesPersonnalisees.vanValeurTerminale, variables),
                investissementInitial: evaluerFormule(formulesPersonnalisees.investissementInitial, variables),
                van: evaluerFormule(formulesPersonnalisees.van, variables)
              };
              
              alert(`Test des formules réussi !\n\n${Object.entries(resultats).map(([k, v]) => `${k}: ${v?.toLocaleString() || 'Erreur'}`).join('\n')}`);
            } catch (error) {
              alert(`Erreur dans les formules: ${error.message}`);
            }
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
        >
          🧪 Tester les Formules
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Note Importante</h4>
        <p className="text-sm text-blue-700">
          Les formules personnalisées remplacent les calculs par défaut de l'application. 
          Assurez-vous que vos formules sont correctes avant de les utiliser pour des décisions importantes.
          Les formules sont sauvegardées localement dans votre navigateur.
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div ref={mainContainerRef} className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6 md:mb-8 pb-2 sm:pb-3 md:pb-4 border-b-2 sm:border-b-3 md:border-b-4 border-blue-500">
          🧮 Simulateur Interactif - Analyse de Rentabilité Avancée
        </h1>

        {/* Header avec bouton de déconnexion */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Bienvenue, <span className="font-semibold text-blue-600">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>

                 {/* Onglets */}
         <div className="flex border-b border-gray-200 mb-6">
           <button
             onClick={() => {
               setActiveTab('main');
               setAdditionalVolume(0);
             }}
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
           <button
             onClick={() => setActiveTab('charges')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'charges'
                 ? 'bg-orange-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             💰 Charges
           </button>
           <button
             onClick={() => setActiveTab('dcf')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'dcf'
                 ? 'bg-indigo-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             📊 DCF
           </button>
           <button
             onClick={() => setActiveTab('dcfSimulation')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'dcfSimulation'
                 ? 'bg-purple-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             📊 DCF Simulation
           </button>
           <button
             onClick={() => setActiveTab('solver')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'solver'
                 ? 'bg-green-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             🎯 Solveur
           </button>
           <button
             onClick={() => setActiveTab('formules')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'formules'
                 ? 'bg-yellow-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             🧮 Formules
           </button>
           <button
             onClick={() => setActiveTab('faq')}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               activeTab === 'faq'
                 ? 'bg-teal-500 text-white'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
           >
             ❓ FAQ
           </button>
         </div>

                 {/* Contenu des onglets */}
         {activeTab === 'main' && renderMainContent()}
         {activeTab === 'volume' && renderVolumeSimulationContent()}
         {activeTab === 'charges' && renderChargesContent()}
         {activeTab === 'dcf' && renderDCFContent()}
         {activeTab === 'dcfSimulation' && renderDCFSimulationContent()}
         {activeTab === 'solver' && renderSolverContent()}
         {activeTab === 'formules' && renderFormulesContent()}
         {activeTab === 'faq' && renderFAQContent()}

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
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">🥧 Répartition des Volumes</h3>
            <ResponsiveContainer width="100%" height={400} className="sm:h-[450px]">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="repartition"
                  label={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value.toFixed(1) + '%', 'Répartition Volume']}
                  labelFormatter={(name) => `Produit: ${name}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '12px'
                  }}
                />
                              </PieChart>
              </ResponsiveContainer>
              
              {/* Légende personnalisée */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {chartData.map((entry, index) => {
                  const volumePercentage = entry.repartition.toFixed(1);
                  const beneficePercentage = ((entry.benefice / chartData.reduce((sum, item) => sum + item.benefice, 0)) * 100).toFixed(1);
                  return (
                    <div key={entry.nom} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: pieColors[index % pieColors.length] }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate" title={entry.nom}>
                          {entry.nom}
                        </div>
                        <div className="text-xs text-gray-600">
                          Volume: {volumePercentage}% • Bénéfice: {beneficePercentage}%
                        </div>
                        <div className="text-xs text-blue-600">
                          {entry.benefice.toLocaleString()} FCFA
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* Graphiques de sensibilité */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Sensibilité prix de vente */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">
              📈 Sensibilité - Bénéfice Net Mensuel {selectedProductForPricing === 'Tous' ? '(Tous)' : selectedProductForPricing}
            </h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <LineChart data={(() => {
                const data = [];
                
                // Utiliser la même formule que l'interface : bénéfice net mensuel = getBeneficeTotalActif() - chargesTotales
                const beneficeNetBase = getBeneficeTotalActif() - chargesTotales;
                
                console.log(`💰 BASE GRAPHIQUE - Bénéfice Net: ${(beneficeNetBase || 0).toLocaleString()} FCFA`);
                
                data.push({ variation: 'Base', benefice: beneficeNetBase || 0 });
                
                                // Utiliser directement notre fonction corrigée pour la cohérence
                [50, 100, 150, 200].forEach(variation => {
                  console.log(`🎯 GRAPHIQUE SENSIBILITÉ - Variation +${variation}`);
                  console.log(`📊 Produit cible: ${selectedProductForPricing}`);
                  
                  // Utiliser la fonction corrigée calculerBeneficeAvecVariationPrixCorrige
                  const beneficeTotal = calculerBeneficeAvecVariationPrixCorrige('prixVente', variation) || 0;
                  // Calculer directement les charges mensuelles au lieu d'utiliser calculerChargesEtResultats
                  const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + 
                                           getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + 
                                           getNumericLoyer() + getNumericAutresCharges();
                  const beneficeNet = (beneficeTotal || 0) - chargesMensuelles;
                  
                  console.log(`💰 BÉNÉFICE TOTAL GRAPHIQUE (+${variation}): ${(beneficeTotal || 0).toLocaleString()} FCFA`);
                  console.log(`💰 BÉNÉFICE NET GRAPHIQUE (+${variation}): ${(beneficeNet || 0).toLocaleString()} FCFA`);
                  console.log(`💸 CHARGES MENSUELLES: ${chargesMensuelles.toLocaleString()} FCFA`);
                  console.log(`⚠️ VÉRIFICATION: beneficeTotal=${beneficeTotal}, chargesMensuelles=${chargesMensuelles}, beneficeNet=${beneficeNet}`);
                  console.log(`🎯 GRAPHIQUE SENSIBILITÉ - Variation +${variation} - FIN`);
                  
                  data.push({ variation: `+${variation}`, benefice: beneficeNet || 0 });
                });
                
                return data;
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString() + ' FCFA', 'Bénéfice Net Mensuel']}
                  labelFormatter={(label) => `Variation: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="benefice" 
                  stroke="#e74c3c" 
                  strokeWidth={3}
                  dot={{ fill: '#e74c3c', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-gray-600 text-center">
              Impact sur le bénéfice net en modifiant le prix de vente {selectedProductForPricing === 'Tous' ? 'de tous les produits' : `du ${selectedProductForPricing.toLowerCase()}`}
            </div>
          </div>

          {/* Sensibilité prix d'achat */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">
              📉 Sensibilité - Prix d'Achat {selectedProductForPricing === 'Tous' ? '(Tous)' : selectedProductForPricing}
            </h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <LineChart data={(() => {
                const data = [];
                
                // Utiliser la même formule que l'interface : bénéfice net mensuel = getBeneficeTotalActif() - chargesTotales
                const beneficeNetBase = getBeneficeTotalActif() - chargesTotales;
                
                console.log(`💰 BASE GRAPHIQUE - Bénéfice Net: ${(beneficeNetBase || 0).toLocaleString()} FCFA`);
                
                data.push({ variation: 'Base', benefice: beneficeNetBase || 0 });
                
                // Utiliser directement notre fonction corrigée pour la cohérence
                [-50, -100, -150, -200].forEach(variation => {
                  console.log(`🎯 GRAPHIQUE SENSIBILITÉ PRIX ACHAT - Variation ${variation}`);
                  console.log(`📊 Produit cible: ${selectedProductForPricing}`);
                  
                  // Utiliser la fonction corrigée calculerBeneficeAvecVariationPrixCorrige
                  const beneficeTotal = calculerBeneficeAvecVariationPrixCorrige('prixAchat', variation) || 0;
                  // Calculer directement les charges mensuelles
                  const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + 
                                           getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + 
                                           getNumericLoyer() + getNumericAutresCharges();
                  const beneficeNet = (beneficeTotal || 0) - chargesMensuelles;
                  
                  console.log(`💰 BÉNÉFICE TOTAL GRAPHIQUE (${variation}): ${(beneficeTotal || 0).toLocaleString()} FCFA`);
                  console.log(`💰 BÉNÉFICE NET GRAPHIQUE (${variation}): ${(beneficeNet || 0).toLocaleString()} FCFA`);
                  console.log(`💸 CHARGES MENSUELLES: ${chargesMensuelles.toLocaleString()} FCFA`);
                  console.log(`🎯 GRAPHIQUE SENSIBILITÉ PRIX ACHAT - Variation ${variation} - FIN`);
                  
                  data.push({ variation: `${variation}`, benefice: beneficeNet || 0 });
                });
                
                return data;
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString() + ' FCFA', 'Bénéfice Net Mensuel']}
                  labelFormatter={(label) => `Variation: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="benefice" 
                  stroke="#3498db" 
                  strokeWidth={3}
                  dot={{ fill: '#3498db', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-gray-600 text-center">
              Impact sur le bénéfice net en modifiant le prix d'achat {selectedProductForPricing === 'Tous' ? 'de tous les produits' : `du ${selectedProductForPricing.toLowerCase()}`}
            </div>
          </div>
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
                  {produitsActifs.map((produit, index) => {
                const isEditable = produit.editable;
                    const pourcentageTotal = (produit.benefice / getBeneficeTotalActif()) * 100;
                      
                      return (
                  <tr key={produit.nom} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-800">
                          <div>{produit.nom}</div>
                      {produit.hasAbats && <div className="text-xs text-blue-600">🥩Avec Foie, Yell, Filet </div>}
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
                          <div className="text-xs text-blue-600 mt-1 font-semibold">
                            {Math.round(produit.repartition * adjustedVolume).toLocaleString()} FCFA
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
                      {Math.round(produit.benefice).toLocaleString()} FCFA
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