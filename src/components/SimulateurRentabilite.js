import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FormulesHypotheses from './FormulesHypotheses';

const SimulateurRentabilite = () => {
  const mainContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'volume', 'charges', 'dcf', 'dcfSimulation' ou 'faq'
  const [pageFluxDCF, setPageFluxDCF] = useState(1);
  const [pageFluxDCFSimulation, setPageFluxDCFSimulation] = useState(1);
  const [itemsPerPage] = useState(12);
  const [volume, setVolume] = useState('20000000');
  const [abatsParKg, setAbatsParKg] = useState('200');
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
  const [chargesFixes, setChargesFixes] = useState('5000000');
  const [dureeAmortissement, setDureeAmortissement] = useState('24'); // Durée en mois
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
  const [bfr, setBfr] = useState('2500000'); // 2.5M par défaut
  const [wacc, setWacc] = useState('12'); // 12% par défaut (corrigé)
  const [croissanceTerminale, setCroissanceTerminale] = useState('3'); // 3% par défaut
  const [dette, setDette] = useState('0'); // 0 par défaut
  const [tresorerie, setTresorerie] = useState('500000'); // 500K par défaut
  const [tauxImposition, setTauxImposition] = useState('30'); // 30% par défaut
  const [depreciationAmortissement, setDepreciationAmortissement] = useState('1250000'); // 1.25M par défaut (25% du CAPEX)
  
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
  const getNumericVolume = () => getNumericValue(volume);
  const getNumericAbatsParKg = () => getNumericValue(abatsParKg);
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
  const getNumericTauxActualisationAnnuel = () => getNumericValue(tauxActualisationAnnuel);
  const getNumericDureeAnalyse = () => getNumericValue(dureeAnalyse);
  const getNumericCapex = () => getNumericValue(capex);
  const getNumericBfr = () => getNumericValue(bfr);
  const getNumericWacc = () => getNumericValue(wacc);
  const getNumericCroissanceTerminale = () => getNumericValue(croissanceTerminale);
  const getNumericDette = () => getNumericValue(dette);
  const getNumericTresorerie = () => getNumericValue(tresorerie);
  const getNumericTauxImposition = () => getNumericValue(tauxImposition);
  const getNumericDepreciationAmortissement = () => getNumericValue(depreciationAmortissement);

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
    const produitsEditables = Object.entries(produits).filter(([nom, data]) => 
      data.editable && data.prixAchat && data.prixVente
    );
    const marges = produitsEditables.map(([nom, data]) => {
      if (data.hasAbats) {
        return ((data.prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / data.prixAchat) - 1;
      } else {
        return (data.prixVente / data.prixAchat) - 1;
      }
    });
    return marges.length > 0 ? marges.reduce((sum, marge) => sum + marge, 0) / marges.length : 0;
  };

  const calculerMargeBrute = (produitData) => {
    if (!produitData.prixVente || !produitData.prixAchat) return 0;
    
    if (produitData.hasAbats) {
      return ((produitData.prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / produitData.prixAchat) - 1;
    } else {
      return (produitData.prixVente / produitData.prixAchat) - 1;
    }
  };

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
      let margeBrute;
      
      if (data.editable && data.prixAchat && data.prixVente) {
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
        
        // Calculer la marge brute avec les prix modifiés
        if (data.hasAbats) {
          margeBrute = ((prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / prixAchat) - 1;
        } else {
          margeBrute = (prixVente / prixAchat) - 1;
        }
      } else {
        // Pour les produits non éditables, utiliser la marge moyenne
        margeBrute = calculerMargeMoyenne();
      }
      
      const benefice = calculerBenefice(margeBrute, data.repartition, volumeActif);
      beneficeTotal += benefice;
    });
    
    return beneficeTotal;
  };

  // Fonction pour calculer le bénéfice total avec une variation de prix (cohérente avec augmenterTousPrix)
  const calculerBeneficeAvecVariationPrixCorrige = (typePrix, variation) => {
    // Utiliser les données appropriées selon l'onglet actif
    const produitsActifs = getNumericAdditionalVolume() > 0 ? adjustedProduits : produits;
    const volumeActif = getNumericAdditionalVolume() > 0 ? adjustedVolume : getNumericVolume();
    
    let beneficeTotal = 0;
    
    Object.entries(produitsActifs).forEach(([nom, data]) => {
      let margeBrute;
      
      if (data.editable && data.prixAchat && data.prixVente) {
        // Appliquer la variation selon le produit sélectionné (comme augmenterTousPrix)
        let prixAchat = data.prixAchat;
        let prixVente = data.prixVente;
        
        if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
          if (typePrix === 'prixAchat') {
            prixAchat += variation;
          } else if (typePrix === 'prixVente') {
            prixVente += variation;
          }
        }
        
        // Calculer la marge brute avec les prix modifiés
        if (data.hasAbats) {
          margeBrute = ((prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / prixAchat) - 1;
        } else {
          margeBrute = (prixVente / prixAchat) - 1;
        }
      } else {
        // Pour les produits non éditables, utiliser la marge moyenne
        margeBrute = calculerMargeMoyenne();
      }
      
      const benefice = calculerBenefice(margeBrute, data.repartition, volumeActif);
      beneficeTotal += benefice;
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
    setProduits(prev => {
      const nouveauxProduits = { ...prev };
      Object.keys(nouveauxProduits).forEach(nom => {
        if (nouveauxProduits[nom].editable && nouveauxProduits[nom][typePrix]) {
          // Si un produit spécifique est sélectionné, appliquer seulement à ce produit
          if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
            nouveauxProduits[nom][typePrix] += montant;
          }
        }
      });
      return nouveauxProduits;
    });
  };

  // Fonction pour générer l'interprétation avec ChatGPT
  const genererInterpretation = async () => {
    setInterpretationLoading(true);
    setInterpretationVisible(true);
    
    try {
      // Préparer les données pour l'analyse
      const roiData = calculerROI();
      const donneesAnalyse = {
        parametresGlobaux: {
          volumeMensuel: getNumericVolume(),
          abatsParKg: getNumericAbatsParKg(),
          peration: getNumericPeration(),
          beneficeTotal: beneficeTotal,
          chargesTotales: chargesTotales,
          margeMoyenne: (margeMoyenne * 100).toFixed(2) + '%',
          roiMensuel: roiData.mensuel.toFixed(2) + '%',
          roiAnnuel: roiData.annuel.toFixed(2) + '%',
          capexInvestissement: getNumericCapex()
        },
        produits: Object.entries(produits).map(([nom, data]) => ({
          nom,
          repartition: (data.repartition * 100).toFixed(1) + '%',
          prixAchat: data.prixAchat,
          prixVente: data.prixVente,
          marge: data.editable && data.prixAchat && data.prixVente ? 
            ((calculerMargeBrute(data) * 100).toFixed(1) + '%') : 'N/A',
          volume: Math.round(data.repartition * getNumericVolume()),
          benefice: data.editable && data.prixAchat && data.prixVente ? 
            calculerBenefice(calculerMargeBrute(data), data.repartition, getNumericVolume()) :
            calculerBenefice(margeMoyenne, data.repartition, getNumericVolume())
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
          total: chargesTotales
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

IMPORTANT: Ce modèle de point de vente est basé sur un volume mensuel de 20,000,000 FCFA et une répartition des produits alignée sur vos points de vente actuels. Adaptez vos conclusions en précisant qu'il s'agit d'un modèle basé sur vos données réelles de vente.

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
          model: 'gpt-4',
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
      // Préparer les données pour l'analyse (mêmes que l'analyse originale)
      const roiData = calculerROI();
      const donneesAnalyse = {
        parametresGlobaux: {
          volumeMensuel: getNumericVolume(),
          abatsParKg: getNumericAbatsParKg(),
          peration: getNumericPeration(),
          beneficeTotal: beneficeTotal,
          chargesTotales: chargesTotales,
          margeMoyenne: (margeMoyenne * 100).toFixed(2) + '%',
          roiMensuel: roiData.mensuel.toFixed(2) + '%',
          roiAnnuel: roiData.annuel.toFixed(2) + '%',
          capexInvestissement: getNumericCapex()
        },
        produits: Object.entries(produits).map(([nom, data]) => ({
          nom,
          repartition: (data.repartition * 100).toFixed(1) + '%',
          prixAchat: data.prixAchat,
          prixVente: data.prixVente,
          marge: data.editable && data.prixAchat && data.prixVente ? 
            ((calculerMargeBrute(data) * 100).toFixed(1) + '%') : 'N/A',
          volume: Math.round(data.repartition * getNumericVolume()),
          benefice: data.editable && data.prixAchat && data.prixVente ? 
            calculerBenefice(calculerMargeBrute(data), data.repartition, getNumericVolume()) :
            calculerBenefice(margeMoyenne, data.repartition, getNumericVolume())
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
          total: chargesTotales
        }
      };

      const prompt = `En tant qu'analyste financier expert spécialisé dans MATA Group SA, vous avez précédemment rédigé cette analyse du POINT DE VENTE MATA Trading pour la levée de fonds :

RAPPEL CONTEXTE MATA GROUP SA:
Créé en août 2024, MATA Group SA est une société anonyme sénégalaise à vocation agroalimentaire, structurée autour de plusieurs entités opérationnelles spécialisées. Sa mission : construire une chaîne de valeur agroalimentaire intégrée, efficiente, digitalisée et rentable. Sa vision : devenir une "Data Driven Meat Integration Company".

ANALYSE PRÉCÉDENTE DU POINT DE VENTE MATA TRADING:
${interpretationText}

DONNÉES FINANCIÈRES ACTUELLES DU POINT DE VENTE:
${JSON.stringify(donneesAnalyse, null, 2)}

IMPORTANT: Ce modèle de point de vente est basé sur un volume mensuel de 20,000,000 FCFA et une répartition des produits alignée sur vos points de vente actuels. Tenez compte de cette base de données réelles dans votre analyse.

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
          model: 'gpt-4',
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
    setAbatsParKg('200');
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
    setCapex('5000000');
    setBfr('2500000');
    setWacc('12');
    setCroissanceTerminale('3');
    setDette('0');
    setTresorerie('500000');
    setTauxImposition('30');
    setDepreciationAmortissement('1250000');
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
        abatsParKg,
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
        setAbatsParKg(data.abatsParKg || 200);
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
        setBfr(data.bfr || 500000);
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
      ['Mois', 'Bénéfice Brut', 'Charges Fixes', 'Flux Net', 'Flux Actualisé', 'Cumul Actualisé'],
      ...fluxData.map(flux => [
        flux.mois === 0 ? 'Mois 0' : `Mois ${flux.mois}`,
        flux.beneficeBrut.toLocaleString(),
        flux.chargesFixes.toLocaleString(),
        flux.fluxNet.toLocaleString(),
        flux.fluxActualise.toLocaleString(),
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
  const adjustedVolume = getAdjustedVolume();
  const adjustedProduits = getAdjustedRepartitions();
  
  // Calcul des charges totales
  const chargesMensuelles = getNumericSalaire() + getNumericElectricite() + getNumericEau() + getNumericInternet() + getNumericSacsLivraison() + getNumericChargesTransport() + getNumericLoyer() + getNumericAutresCharges();
  const amortissementChargesFixes = getNumericChargesFixes() / getNumericDureeAmortissement(); // Amortissement sur la durée définie
  const chargesTotales = amortissementChargesFixes + chargesMensuelles;
  
  // Calcul avec les données originales (pour l'affichage principal et DCF simple)
  let beneficeTotal = 0;
  const produitsAvecCalculs = Object.entries(produits).map(([nom, data]) => {
    let margeBrute;
    if (data.editable && data.prixAchat && data.prixVente) {
      margeBrute = calculerMargeBrute(data);
    } else {
      margeBrute = margeMoyenne;
    }
    
    const benefice = calculerBenefice(margeBrute, data.repartition, getNumericVolume());
    beneficeTotal += benefice;
    
    return { nom, ...data, margeBrute, benefice };
  });

  // Calcul avec les données de simulation (pour l'affichage de simulation)
  let beneficeTotalSimulation = 0;
  const produitsAvecCalculsSimulation = Object.entries(adjustedProduits).map(([nom, data]) => {
    let margeBrute;
    if (data.editable && data.prixAchat && data.prixVente) {
      margeBrute = calculerMargeBrute(data);
    } else {
      margeBrute = margeMoyenne;
    }
    
    const benefice = calculerBenefice(margeBrute, data.repartition, adjustedVolume);
    beneficeTotalSimulation += benefice;
    
    return { nom, ...data, margeBrute, benefice };
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
    return getNumericAdditionalVolume() > 0 ? beneficeTotalSimulation : beneficeTotal;
  };

  // Calculs financiers avancés
  const calculerEBIT = () => {
    return getBeneficeTotalActif() - chargesTotales;
  };

  const calculerEBITDA = () => {
    return calculerEBIT() + (getNumericDepreciationAmortissement() / 12); // D&A mensuel
  };

  const calculerNOPAT = () => {
    return calculerEBIT() * (1 - getNumericTauxImposition() / 100);
  };

  // Calcul du ROI (Return on Investment)
  const calculerROI = () => {
    const investissement = getNumericCapex(); // CAPEX comme investissement initial
    const beneficeNetMensuel = calculerEBIT(); // EBIT comme proxy du bénéfice net
    const beneficeNetAnnuel = beneficeNetMensuel * 12;
    
    if (investissement === 0) return { mensuel: 0, annuel: 0 };
    
    return {
      mensuel: (beneficeNetMensuel / investissement) * 100,
      annuel: (beneficeNetAnnuel / investissement) * 100
    };
  };

  const calculerFCF = () => {
    // FCF = NOPAT + D&A - CAPEX - ΔBFR
    // Calcul en mensuel puis conversion en annuel
    const ebitMensuel = calculerEBIT();
    const tauxImposition = getNumericTauxImposition() / 100;
    const nopatMensuel = ebitMensuel * (1 - tauxImposition);
    const capexMensuel = getNumericCapex() / 12;
    const fcfMensuel = nopatMensuel - capexMensuel;
    const fcfAnnuel = fcfMensuel * 12;
    
    console.log('=== CALCUL FCF ===');
    console.log(`EBIT mensuel: ${ebitMensuel.toLocaleString()} FCFA`);
    console.log(`Taux d'imposition: ${getNumericTauxImposition()}% (${tauxImposition})`);
    console.log(`NOPAT mensuel: ${ebitMensuel.toLocaleString()} × (1 - ${tauxImposition}) = ${nopatMensuel.toLocaleString()} FCFA`);
    console.log(`CAPEX mensuel: ${getNumericCapex().toLocaleString()} / 12 = ${capexMensuel.toLocaleString()} FCFA`);
    console.log(`FCF mensuel: ${nopatMensuel.toLocaleString()} - ${capexMensuel.toLocaleString()} = ${fcfMensuel.toLocaleString()} FCFA`);
    console.log(`FCF annuel: ${fcfMensuel.toLocaleString()} × 12 = ${fcfAnnuel.toLocaleString()} FCFA`);
    console.log('==================');
    
    return fcfAnnuel;
  };

  const calculerValeurTerminale = () => {
    const fcfFinal = calculerFCF();
    const waccDecimal = getNumericWacc() / 100;
    const croissanceDecimal = getNumericCroissanceTerminale() / 100;
    
    // Si FCF est négatif, pas de valeur terminale
    if (fcfFinal <= 0) {
      return 0;
    }
    
    const fcfAvecCroissance = fcfFinal * (1 + croissanceDecimal);
    const denominateur = waccDecimal - croissanceDecimal;
    const valeurTerminale = fcfAvecCroissance / denominateur;
    
    console.log('=== CALCUL VALEUR TERMINALE ===');
    console.log(`FCF annuel: ${fcfFinal.toLocaleString()} FCFA`);
    console.log(`WACC: ${getNumericWacc()}% (${waccDecimal})`);
    console.log(`Croissance g: ${getNumericCroissanceTerminale()}% (${croissanceDecimal})`);
    console.log(`FCF avec croissance: ${fcfFinal.toLocaleString()} × (1 + ${croissanceDecimal}) = ${fcfAvecCroissance.toLocaleString()} FCFA`);
    console.log(`Dénominateur: ${waccDecimal} - ${croissanceDecimal} = ${denominateur}`);
    console.log(`Valeur Terminale: ${fcfAvecCroissance.toLocaleString()} / ${denominateur} = ${valeurTerminale.toLocaleString()} FCFA`);
    console.log('================================');
    
    return valeurTerminale;
  };

  const calculerEnterpriseValue = () => {
    const fcf = calculerFCF();
    const valeurTerminale = calculerValeurTerminale();
    const waccDecimal = getNumericWacc() / 100;
    
    // Si FCF est négatif, l'entreprise n'est pas viable
    if (fcf <= 0) {
      return 0;
    }
    
    console.log('=== CALCUL ENTERPRISE VALUE ===');
    console.log(`FCF annuel: ${fcf.toLocaleString()} FCFA`);
    console.log(`WACC: ${getNumericWacc()}% (${waccDecimal})`);
    console.log(`Valeur Terminale: ${valeurTerminale.toLocaleString()} FCFA`);
    
    // Actualisation des FCF sur 5 ans
    let fcfActualise = 0;
    console.log('\n--- FCF actualisés sur 5 ans ---');
    for (let annee = 1; annee <= 5; annee++) {
      const coeffActualisation = Math.pow(1 + waccDecimal, annee);
      const fcfAnnee = fcf / coeffActualisation;
      fcfActualise += fcfAnnee;
      console.log(`Année ${annee}: ${fcf.toLocaleString()} / ${coeffActualisation.toFixed(4)} = ${fcfAnnee.toLocaleString()} FCFA`);
    }
    console.log(`Total FCF actualisés: ${fcfActualise.toLocaleString()} FCFA`);
    
    // Actualisation de la valeur terminale (seulement si positive)
    const coeffActualisationVT = Math.pow(1 + waccDecimal, 5);
    const valeurTerminaleActualisee = valeurTerminale > 0 ? valeurTerminale / coeffActualisationVT : 0;
    console.log(`\n--- Valeur Terminale actualisée ---`);
    console.log(`Coeff d'actualisation (année 5): ${coeffActualisationVT.toFixed(4)}`);
    console.log(`VT actualisée: ${valeurTerminale.toLocaleString()} / ${coeffActualisationVT.toFixed(4)} = ${valeurTerminaleActualisee.toLocaleString()} FCFA`);
    
    const enterpriseValue = fcfActualise + valeurTerminaleActualisee;
    console.log(`\nEnterprise Value: ${fcfActualise.toLocaleString()} + ${valeurTerminaleActualisee.toLocaleString()} = ${enterpriseValue.toLocaleString()} FCFA`);
    console.log('================================');
    
    return enterpriseValue;
  };

  const calculerEquityValue = () => {
    const enterpriseValue = calculerEnterpriseValue();
    const dette = getNumericDette();
    const tresorerie = getNumericTresorerie();
    const equityValue = enterpriseValue - dette + tresorerie;
    
    console.log('=== CALCUL EQUITY VALUE ===');
    console.log(`Enterprise Value: ${enterpriseValue.toLocaleString()} FCFA`);
    console.log(`Dette: ${dette.toLocaleString()} FCFA`);
    console.log(`Trésorerie: ${tresorerie.toLocaleString()} FCFA`);
    console.log(`Equity Value: ${enterpriseValue.toLocaleString()} - ${dette.toLocaleString()} + ${tresorerie.toLocaleString()} = ${equityValue.toLocaleString()} FCFA`);
    console.log('==========================');
    
    return equityValue;
  };

  // Calculs DCF
  const tauxActualisationMensuel = Math.pow(1 + getNumericTauxActualisationAnnuel() / 100, 1/12) - 1;
  
  // Calcul des flux de trésorerie mensuels
  const calculerFluxDCF = () => {
    const flux = [];
    const beneficeBrutMensuel = beneficeTotal;
    const chargesFixesMensuelles = chargesTotales;
    const investissementInitial = -getNumericChargesFixes(); // Décaissement initial
    
    // Mois 0 : investissement initial
    flux.push({
      mois: 0,
      beneficeBrut: 0,
      chargesFixes: 0,
      fluxNet: investissementInitial,
      fluxActualise: investissementInitial,
      cumulActualise: investissementInitial
    });
    
    // Mois 1 à dureeAnalyse
    let cumulActualise = investissementInitial;
    for (let mois = 1; mois <= getNumericDureeAnalyse(); mois++) {
      const fluxNet = beneficeBrutMensuel - chargesFixesMensuelles;
      const facteurActualisation = Math.pow(1 + tauxActualisationMensuel, -mois);
      const fluxActualise = fluxNet * facteurActualisation;
      cumulActualise += fluxActualise;
      
      flux.push({
        mois,
        beneficeBrut: beneficeBrutMensuel,
        chargesFixes: chargesFixesMensuelles,
        fluxNet,
        fluxActualise,
        cumulActualise
      });
    }
    
    return flux;
  };
  
  const fluxDCF = calculerFluxDCF();
  
  // Calcul des indicateurs DCF
  const calculerIndicateursDCF = () => {
    const investissementInitial = Math.abs(fluxDCF[0].fluxNet);
    
    // VAN (NPV)
    const van = fluxDCF.reduce((sum, flux) => sum + flux.fluxActualise, 0);
    
    // TRI mensuel (approximation par itération)
    const calculerTRI = () => {
      let triMensuel = 0.01; // 1% par mois comme point de départ
      const tolerance = 0.0001;
      const maxIterations = 100;
      
      for (let i = 0; i < maxIterations; i++) {
        let vanTest = fluxDCF[0].fluxNet; // Investissement initial
        
        for (let mois = 1; mois <= getNumericDureeAnalyse(); mois++) {
          const fluxNet = fluxDCF[mois].fluxNet;
          const facteurActualisation = Math.pow(1 + triMensuel, -mois);
          vanTest += fluxNet * facteurActualisation;
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
    
    // Délai de récupération actualisé
    const paybackActualise = fluxDCF.findIndex(flux => flux.cumulActualise >= 0);
    
    return {
      van,
      triMensuel,
      triAnnuel,
      indiceProfitabilite,
      paybackActualise: paybackActualise === -1 ? 'Jamais' : paybackActualise
    };
  };
  
  const indicateursDCF = calculerIndicateursDCF();

  // Calcul des flux DCF pour la simulation
  const calculerFluxDCFSimulation = () => {
    const flux = [];
    const beneficeBrutMensuel = beneficeTotalSimulation;
    const chargesFixesMensuelles = chargesTotales;
    const investissementInitial = -getNumericChargesFixes(); // Décaissement initial
    
    // Mois 0 : investissement initial
    flux.push({
      mois: 0,
      beneficeBrut: 0,
      chargesFixes: 0,
      fluxNet: investissementInitial,
      fluxActualise: investissementInitial,
      cumulActualise: investissementInitial
    });
    
    // Mois 1 à dureeAnalyse
    let cumulActualise = investissementInitial;
    for (let mois = 1; mois <= getNumericDureeAnalyse(); mois++) {
      const fluxNet = beneficeBrutMensuel - chargesFixesMensuelles;
      const facteurActualisation = Math.pow(1 + tauxActualisationMensuel, -mois);
      const fluxActualise = fluxNet * facteurActualisation;
      cumulActualise += fluxActualise;
      
      flux.push({
        mois,
        beneficeBrut: beneficeBrutMensuel,
        chargesFixes: chargesFixesMensuelles,
        fluxNet,
        fluxActualise,
        cumulActualise
      });
    }
    
    return flux;
  };
  
  const fluxDCFSimulation = calculerFluxDCFSimulation();
  
  // Calcul des indicateurs DCF pour la simulation
  const calculerIndicateursDCFSimulation = () => {
    const investissementInitial = Math.abs(fluxDCFSimulation[0].fluxNet);
    
    // VAN (NPV)
    const van = fluxDCFSimulation.reduce((sum, flux) => sum + flux.fluxActualise, 0);
    
    // TRI mensuel (approximation par itération)
    const calculerTRI = () => {
      let triMensuel = 0.01; // 1% par mois comme point de départ
      const tolerance = 0.0001;
      const maxIterations = 100;
      
      for (let i = 0; i < maxIterations; i++) {
        let vanTest = fluxDCFSimulation[0].fluxNet; // Investissement initial
        
        for (let mois = 1; mois <= getNumericDureeAnalyse(); mois++) {
          const fluxNet = fluxDCFSimulation[mois].fluxNet;
          const facteurActualisation = Math.pow(1 + triMensuel, -mois);
          vanTest += fluxNet * facteurActualisation;
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
    
    // Délai de récupération actualisé
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
                value={abatsParKg}
                onChange={(e) => setAbatsParKg(e.target.value)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <div className="text-sm text-gray-600">Volume point de vente:</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800">{additionalVolume > 0 ? adjustedVolume.toLocaleString() : volume.toLocaleString()}</div>
            {additionalVolume > 0 && (
              <div className="text-xs text-blue-600">(+{additionalVolume.toLocaleString()})</div>
            )}
            <div className="text-xs text-orange-600 italic">Hypothèse de travail</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Bénéfice Total:</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">{Math.round(getBeneficeTotalActif()).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Marge Moyenne:</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">{(margeMoyenne * 100).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">ROI Annuel:</div>
              <div className={`text-lg sm:text-xl font-bold ${
                calculerROI().annuel > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {calculerROI().annuel.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Retour sur investissement</div>
            </div>
          </div>
        </div>

        {/* Bouton d'interprétation IA */}
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
          </div>
        </div>

        {/* Section d'interprétation */}
        {interpretationVisible && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">💼 Analyse Point de Vente MATA Trading - Levée de Fonds</h3>
              <button
                onClick={() => setInterpretationVisible(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
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
        {analyseContextuelleVisible && (
          <div className="bg-white border border-indigo-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-indigo-800">🎯 Analyse Contextuelle Point de Vente MATA Trading</h3>
              <button
                onClick={() => setAnalyseContextuelleVisible(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
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
           <h4 className="text-sm font-semibold text-orange-700 mb-3">🏗️ Charges Fixes (Mise en place)</h4>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Durée amortissement (mois)</label>
                        <input 
                          type="number"
                 min="1"
                 value={dureeAmortissement}
                 onChange={(e) => setDureeAmortissement(e.target.value)}
                 className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                 style={{ fontSize: '16px' }}
               />
               <div className="text-xs text-gray-500 mt-1">{(getNumericDureeAmortissement() / 12).toFixed(1)} années</div>
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
                       <div>
              <div className="text-sm text-gray-600">Charges fixes (total):</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">{chargesFixes.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Amorti sur {dureeAmortissement} mois</div>
            </div>
           <div>
             <div className="text-sm text-gray-600">Charges mensuelles:</div>
             <div className="text-lg sm:text-xl font-bold text-orange-600">{chargesMensuelles.toLocaleString()}</div>
           </div>
                       <div>
              <div className="text-sm text-gray-600">Amortissement mensuel:</div>
              <div className="text-lg sm:text-xl font-bold text-blue-600">{amortissementChargesFixes.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Charges fixes / {dureeAmortissement}</div>
            </div>
           <div>
             <div className="text-sm text-gray-600">Total charges mensuelles:</div>
             <div className="text-lg sm:text-xl font-bold text-red-700">{chargesTotales.toLocaleString()}</div>
           </div>
         </div>
         <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <div className="text-sm text-gray-600">Bénéfice net mensuel:</div>
             <div className="text-lg sm:text-xl font-bold text-green-600">{(getBeneficeTotalActif() - chargesTotales).toLocaleString()}</div>
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
              />
              <div className="text-xs text-gray-500 mt-1">Dépréciation & Amortissement</div>
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
          <div className="cursor-help" title={`EBIT = Bénéfice Total - Charges Opérationnelles
Bénéfice Total: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
EBIT Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA
EBIT Annuel: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBIT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {Math.round(calculerEBIT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts et impôts</div>
          </div>
          <div className="cursor-help" title={`EBITDA = EBIT + D&A
EBIT: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA
D&A: ${Math.round(getNumericDepreciationAmortissement()).toLocaleString()} FCFA
EBITDA: ${Math.round(calculerEBITDA() * 12).toLocaleString()} FCFA`}>
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
          <div className="cursor-help" title={`FCF = (NOPAT mensuel - CAPEX mensuel) × 12
NOPAT mensuel: ${Math.round(calculerNOPAT()).toLocaleString()} FCFA
CAPEX mensuel: ${Math.round(getNumericCapex() / 12).toLocaleString()} FCFA
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
          <div className="cursor-help" title={`ROI = Bénéfice Net / Investissement Initial
ROI Mensuel: ${calculerROI().mensuel.toFixed(2)}%
ROI Annuel: ${calculerROI().annuel.toFixed(2)}%
Investissement (CAPEX): ${getNumericCapex().toLocaleString()} FCFA
Bénéfice Net Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">ROI (annuel):</div>
            <div className={`text-lg sm:text-xl font-bold ${
              calculerROI().annuel > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {calculerROI().annuel.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Retour sur investissement</div>
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
Investissement Initial: ${Math.round(chargesFixes).toLocaleString()} FCFA
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
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Bénéfice Brut</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Charges Fixes</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Flux Net</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Flux Actualisé</th>
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
                    {flux.beneficeBrut.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.chargesFixes.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fluxNet > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fluxNet.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fluxActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fluxActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
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
          <div className="cursor-help" title={`EBIT = Bénéfice Total - Charges Opérationnelles
Bénéfice Total: ${Math.round(getBeneficeTotalActif()).toLocaleString()} FCFA
Charges Opérationnelles: ${Math.round(chargesTotales).toLocaleString()} FCFA
EBIT Mensuel: ${Math.round(calculerEBIT()).toLocaleString()} FCFA
EBIT Annuel: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA`}>
            <div className="text-sm text-gray-600">EBIT (annuel):</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {Math.round(calculerEBIT() * 12).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Bénéfice avant intérêts et impôts</div>
          </div>
          <div className="cursor-help" title={`EBITDA = EBIT + D&A
EBIT: ${Math.round(calculerEBIT() * 12).toLocaleString()} FCFA
D&A: ${Math.round(depreciationAmortissement).toLocaleString()} FCFA
EBITDA: ${Math.round(calculerEBITDA() * 12).toLocaleString()} FCFA`}>
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
          <div className="cursor-help" title={`FCF = NOPAT - CAPEX
NOPAT: ${Math.round(calculerNOPAT() * 12).toLocaleString()} FCFA
CAPEX: ${Math.round(capex).toLocaleString()} FCFA
FCF: ${Math.round(calculerFCF()).toLocaleString()} FCFA`}>
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
          <div className="cursor-help" title={`D&A = 25% du CAPEX - Simulation
CAPEX: ${Math.round(capex).toLocaleString()} FCFA
D&A: ${Math.round(depreciationAmortissement).toLocaleString()} FCFA
D&A Mensuel: ${Math.round(depreciationAmortissement / 12).toLocaleString()} FCFA`}>
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
Investissement Initial: ${Math.round(chargesFixes).toLocaleString()} FCFA
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
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Bénéfice Brut</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Charges Fixes</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Flux Net</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium text-white uppercase tracking-wider">Flux Actualisé</th>
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
                    {flux.beneficeBrut.toLocaleString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">
                    {flux.chargesFixes.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fluxNet > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fluxNet.toLocaleString()}
                  </td>
                  <td className={`px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold ${
                    flux.fluxActualise > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {flux.fluxActualise.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
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
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">Bénéfice Mensuel Approximatif</div>
              <div className="text-lg font-bold text-green-600">~2,000,000</div>
              <div className="text-sm text-gray-600">Basé sur l'hypothèse CA : environ 10% du CA mensuel</div>
              </div>
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
              <div className="text-lg font-bold text-orange-600">2,500,000</div>
              <div className="text-sm text-gray-600">1.04% du CA annuel (240M × 1.04%)</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">D&A (annuel)</div>
              <div className="text-lg font-bold text-indigo-600">1,250,000</div>
              <div className="text-sm text-gray-600">25% du CAPEX (5M × 25%)</div>
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
                Flux de trésorerie disponible. Il représente les liquidités générées par l'activité après 
                déduction des investissements nécessaires : FCF = NOPAT + D&A - CAPEX - ΔBFR.
              </div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-800 mb-2">📊 ROI (Return on Investment)</div>
              <div className="text-sm text-gray-600">
                <strong>Retour sur Investissement :</strong> Mesure la rentabilité d'un investissement en comparant 
                le bénéfice généré à l'investissement initial.<br/><br/>
                <strong>Formule :</strong> ROI = (Bénéfice Net / Investissement Initial) × 100<br/><br/>
                <strong>Dans notre modèle :</strong><br/>
                • Bénéfice Net = EBIT (Bénéfice Total - Charges)<br/>
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

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <div ref={mainContainerRef} className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6 md:mb-8 pb-2 sm:pb-3 md:pb-4 border-b-2 sm:border-b-3 md:border-b-4 border-blue-500">
          🧮 Simulateur Interactif - Analyse de Rentabilité Avancée
        </h1>

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
              📈 Sensibilité - Prix de Vente {selectedProductForPricing === 'Tous' ? '(Tous)' : selectedProductForPricing}
            </h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <LineChart data={(() => {
                const data = [];
                
                // DEBUG: Calculer le bénéfice de base avec les prix ORIGINAUX
                let baseBeneficeOriginal = 0;
                Object.entries(produitsOriginaux).map(([nom, data]) => {
                  let margeBrute;
                  if (data.editable && data.prixAchat && data.prixVente) {
                    margeBrute = calculerMargeBrute(data);
                  } else {
                    margeBrute = margeMoyenne;
                  }
                  const benefice = calculerBenefice(margeBrute, data.repartition, getNumericVolume());
                  baseBeneficeOriginal += benefice;
                  return { nom, ...data, margeBrute, benefice };
                });
                

                
                data.push({ variation: 'Base', benefice: baseBeneficeOriginal });
                
                // Simuler chaque variation comme si on faisait un vrai bump
                [50, 100, 150, 200].forEach(variation => {
                  // Simuler le bump: partir des prix originaux et appliquer la variation
                  const tempProduits = JSON.parse(JSON.stringify(produitsOriginaux));
                  Object.keys(tempProduits).forEach(nom => {
                    if (tempProduits[nom].editable && tempProduits[nom].prixVente) {
                      if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
                        tempProduits[nom].prixVente = tempProduits[nom].prixVente + variation;
                      }
                    }
                  });
                  
                  // Calculer la nouvelle margeMoyenne après bump (comme le ferait l'UI)
                  const produitsEditables = Object.entries(tempProduits).filter(([nom, data]) => 
                    data.editable && data.prixAchat && data.prixVente
                  );
                  const marges = produitsEditables.map(([nom, data]) => {
                    if (data.hasAbats) {
                      return ((data.prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / data.prixAchat) - 1;
                    } else {
                      return (data.prixVente / data.prixAchat) - 1;
                    }
                  });
                  const margeMoyenneApresVump = marges.length > 0 ? marges.reduce((sum, marge) => sum + marge, 0) / marges.length : 0;
                  
                  // Calculer le bénéfice avec les prix modifiés
                  let beneficeTotal = 0;
                  Object.entries(tempProduits).map(([nom, data]) => {
                    let margeBrute;
                    if (data.editable && data.prixAchat && data.prixVente) {
                      margeBrute = calculerMargeBrute(data);
                    } else {
                      // Utiliser la nouvelle margeMoyenne calculée après bump
                      margeBrute = margeMoyenneApresVump;
                    }
                    
                    const benefice = calculerBenefice(margeBrute, data.repartition, getNumericVolume());
                    beneficeTotal += benefice;
                    
                    return { nom, ...data, margeBrute, benefice };
                  });
                  
                  data.push({ variation: `+${variation}`, benefice: beneficeTotal });
                });
                
                return data;
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString() + ' FCFA', 'Bénéfice Total']}
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
              Impact sur le bénéfice total en modifiant le prix de vente {selectedProductForPricing === 'Tous' ? 'de tous les produits' : `du ${selectedProductForPricing.toLowerCase()}`}
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
                
                // DEBUG: Calculer le bénéfice de base avec les prix ORIGINAUX
                let baseBeneficeOriginal = 0;
                Object.entries(produitsOriginaux).map(([nom, data]) => {
                  let margeBrute;
                  if (data.editable && data.prixAchat && data.prixVente) {
                    margeBrute = calculerMargeBrute(data);
                  } else {
                    margeBrute = margeMoyenne;
                  }
                  const benefice = calculerBenefice(margeBrute, data.repartition, getNumericVolume());
                  baseBeneficeOriginal += benefice;
                  return { nom, ...data, margeBrute, benefice };
                });
                
                data.push({ variation: 'Base', benefice: baseBeneficeOriginal });
                
                // Simuler chaque variation comme si on faisait un vrai bump
                [-50, -100, -150, -200].forEach(variation => {
                  // Simuler le bump: partir des prix originaux et appliquer la variation
                  const tempProduits = JSON.parse(JSON.stringify(produitsOriginaux));
                  Object.keys(tempProduits).forEach(nom => {
                    if (tempProduits[nom].editable && tempProduits[nom].prixAchat) {
                      if (selectedProductForPricing === 'Tous' || nom === selectedProductForPricing) {
                        tempProduits[nom].prixAchat = tempProduits[nom].prixAchat + variation;
                      }
                    }
                  });
                  
                  // Calculer la nouvelle margeMoyenne après bump (comme le ferait l'UI)
                  const produitsEditables = Object.entries(tempProduits).filter(([nom, data]) => 
                    data.editable && data.prixAchat && data.prixVente
                  );
                  const marges = produitsEditables.map(([nom, data]) => {
                    if (data.hasAbats) {
                      return ((data.prixVente * (1 - getNumericPeration()) + getNumericAbatsParKg()) / data.prixAchat) - 1;
                    } else {
                      return (data.prixVente / data.prixAchat) - 1;
                    }
                  });
                  const margeMoyenneApresVump = marges.length > 0 ? marges.reduce((sum, marge) => sum + marge, 0) / marges.length : 0;
                  
                  // Calculer le bénéfice avec les prix modifiés
                  let beneficeTotal = 0;
                  Object.entries(tempProduits).map(([nom, data]) => {
                    let margeBrute;
                    if (data.editable && data.prixAchat && data.prixVente) {
                      margeBrute = calculerMargeBrute(data);
                    } else {
                      // Utiliser la nouvelle margeMoyenne calculée après bump
                      margeBrute = margeMoyenneApresVump;
                    }
                    
                    const benefice = calculerBenefice(margeBrute, data.repartition, getNumericVolume());
                    beneficeTotal += benefice;
                    
                    return { nom, ...data, margeBrute, benefice };
                  });
                  
                  data.push({ variation: `${variation}`, benefice: beneficeTotal });
                });
                
                return data;
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variation" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString() + ' FCFA', 'Bénéfice Total']}
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
              Impact sur le bénéfice total en modifiant le prix d'achat {selectedProductForPricing === 'Tous' ? 'de tous les produits' : `du ${selectedProductForPricing.toLowerCase()}`}
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