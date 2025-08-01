import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SimulateurRentabilite = () => {
  const mainContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'volume', 'charges', 'dcf', 'dcfSimulation' ou 'faq'
  const [volume, setVolume] = useState(20000000);
  const [abatsParKg, setAbatsParKg] = useState(200);
  const [peration, setPeration] = useState(0.1);
  
  // Nouveaux états pour la simulation de volume
  const [selectedProduct, setSelectedProduct] = useState('Poulet');
  const [additionalVolume, setAdditionalVolume] = useState(5000000);
  
  // États pour les charges
  const [chargesFixes, setChargesFixes] = useState(5000000);
  const [dureeAmortissement, setDureeAmortissement] = useState(24); // Durée en mois
  const [salaire, setSalaire] = useState(250000);
  const [electricite, setElectricite] = useState(25000);
  const [eau, setEau] = useState(5000);
  const [internet, setInternet] = useState(10000);
  const [sacsLivraison, setSacsLivraison] = useState(30000);
  const [chargesTransport, setChargesTransport] = useState(150000);
  const [loyer, setLoyer] = useState(250000);
  const [autresCharges, setAutresCharges] = useState(0);
  
  // États pour le DCF
  const [tauxActualisationAnnuel, setTauxActualisationAnnuel] = useState(12); // 12% par défaut
  const [dureeAnalyse, setDureeAnalyse] = useState(60); // 5 ans par défaut
  
  // États pour le DCF avancé
  const [capex, setCapex] = useState(24000000); // 24M par défaut (10% du CA annuel)
  const [bfr, setBfr] = useState(18000000); // 18M par défaut (7.5% du CA annuel)
  const [wacc, setWacc] = useState(15); // 15% par défaut
  const [croissanceTerminale, setCroissanceTerminale] = useState(3); // 3% par défaut
  const [dette, setDette] = useState(5000000); // 5M par défaut
  const [tresorerie, setTresorerie] = useState(5000000); // 5M par défaut
  const [tauxImposition, setTauxImposition] = useState(30); // 30% par défaut
  const [depreciationAmortissement, setDepreciationAmortissement] = useState(12000000); // 12M par défaut (50% du CAPEX)
  
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
    if (activeTab === 'volume' && additionalVolume > 0) {
      return volume + additionalVolume;
    }
    return volume;
  };

  // Répartitions originales (fixes)
  const originalRepartitions = {
    'Boeuf': 0.7017824621363722,
    'Veau': 0.04459239053187431,
    'Ovin': 0.05224405260523153,
    'Poulet': 0.10293212414146351,
    'Oeuf': 0.047725982941789515,
    'Autres': 0.036695010434228736,
    'Pack': 0.014027977209040234
  };

  // Calcul des répartitions ajustées pour la simulation
  const getAdjustedRepartitions = () => {
    if (activeTab === 'volume' && additionalVolume > 0) {
      const adjustedProduits = { ...produits };
      const totalVolume = volume + additionalVolume;
      
      // Calculer les volumes absolus de chaque produit
      const volumes = {};
      Object.keys(adjustedProduits).forEach(nom => {
        if (nom === selectedProduct) {
          // Pour le produit sélectionné : volume original + volume ajouté
          volumes[nom] = originalRepartitions[nom] * volume + additionalVolume;
        } else {
          // Pour les autres produits : volume original (inchangé)
          volumes[nom] = originalRepartitions[nom] * volume;
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
    // Reset des charges
    setChargesFixes(5000000);
    setDureeAmortissement(24);
    setSalaire(250000);
    setElectricite(25000);
    setEau(5000);
    setInternet(10000);
    setSacsLivraison(30000);
    setChargesTransport(150000);
    setLoyer(250000);
    setAutresCharges(0);
    // Reset DCF
    setTauxActualisationAnnuel(12);
    setDureeAnalyse(60);
    setCapex(24000000);
    setBfr(18000000);
    setWacc(15);
    setCroissanceTerminale(3);
    setDette(5000000);
    setTresorerie(5000000);
    setTauxImposition(30);
    setDepreciationAmortissement(12000000);
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
  const chargesMensuelles = salaire + electricite + eau + internet + sacsLivraison + chargesTransport + loyer + autresCharges;
  const amortissementChargesFixes = chargesFixes / dureeAmortissement; // Amortissement sur la durée définie
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
    
    const benefice = calculerBenefice(margeBrute, data.repartition, volume);
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
  const produitsActifs = activeTab === 'volume' ? produitsAvecCalculsSimulation : produitsAvecCalculs;
  const volumeActif = activeTab === 'volume' ? adjustedVolume : volume;
  
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
    return activeTab === 'volume' ? beneficeTotalSimulation : beneficeTotal;
  };

  // Calculs financiers avancés
  const calculerEBIT = () => {
    return getBeneficeTotalActif() - chargesTotales;
  };

  const calculerEBITDA = () => {
    return calculerEBIT() + depreciationAmortissement;
  };

  const calculerNOPAT = () => {
    return calculerEBIT() * (1 - tauxImposition / 100);
  };

  const calculerFCF = () => {
    return calculerNOPAT() + depreciationAmortissement - capex - bfr;
  };

  const calculerValeurTerminale = () => {
    const fcfFinal = calculerFCF();
    const waccDecimal = wacc / 100;
    const croissanceDecimal = croissanceTerminale / 100;
    return (fcfFinal * (1 + croissanceDecimal)) / (waccDecimal - croissanceDecimal);
  };

  const calculerEnterpriseValue = () => {
    const fcf = calculerFCF();
    const valeurTerminale = calculerValeurTerminale();
    const waccDecimal = wacc / 100;
    
    // Actualisation des FCF sur 5 ans
    let fcfActualise = 0;
    for (let annee = 1; annee <= 5; annee++) {
      fcfActualise += fcf / Math.pow(1 + waccDecimal, annee);
    }
    
    // Actualisation de la valeur terminale
    const valeurTerminaleActualisee = valeurTerminale / Math.pow(1 + waccDecimal, 5);
    
    return fcfActualise + valeurTerminaleActualisee;
  };

  const calculerEquityValue = () => {
    return calculerEnterpriseValue() - dette + tresorerie;
  };

  // Calculs DCF
  const tauxActualisationMensuel = Math.pow(1 + tauxActualisationAnnuel / 100, 1/12) - 1;
  
  // Calcul des flux de trésorerie mensuels
  const calculerFluxDCF = () => {
    const flux = [];
    const beneficeBrutMensuel = beneficeTotal;
    const chargesFixesMensuelles = chargesTotales;
    const investissementInitial = -chargesFixes; // Décaissement initial
    
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
    for (let mois = 1; mois <= dureeAnalyse; mois++) {
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
        
        for (let mois = 1; mois <= dureeAnalyse; mois++) {
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
    const investissementInitial = -chargesFixes; // Décaissement initial
    
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
    for (let mois = 1; mois <= dureeAnalyse; mois++) {
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
        
        for (let mois = 1; mois <= dureeAnalyse; mois++) {
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
          </div>
        </div>

        {/* Résumé global */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📊 Résumé Global</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <div className="text-sm text-gray-600">Volume point de vente:</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800">{activeTab === 'volume' ? adjustedVolume.toLocaleString() : volume.toLocaleString()}</div>
            {activeTab === 'volume' && (
              <div className="text-xs text-blue-600">(+{additionalVolume.toLocaleString()})</div>
            )}
            </div>
            <div>
              <div className="text-sm text-gray-600">Bénéfice Total:</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">{Math.round(activeTab === 'volume' ? getBeneficeTotalActif() : beneficeTotal).toLocaleString()}</div>
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
                <span className="font-medium">{(originalRepartitions[selectedProduct] * volume).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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
            Volume total: {volume.toLocaleString()} → {adjustedVolume.toLocaleString()} (+{additionalVolume.toLocaleString()})
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
                 onChange={(e) => setChargesFixes(parseFloat(e.target.value) || 0)}
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
                 onChange={(e) => setDureeAmortissement(parseInt(e.target.value) || 1)}
                 className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                 style={{ fontSize: '16px' }}
               />
               <div className="text-xs text-gray-500 mt-1">{(dureeAmortissement / 12).toFixed(1)} années</div>
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
                onChange={(e) => setSalaire(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Électricité</label>
              <input 
                type="number"
                value={electricite}
                onChange={(e) => setElectricite(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eau</label>
              <input 
                type="number"
                value={eau}
                onChange={(e) => setEau(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internet</label>
              <input 
                type="number"
                value={internet}
                onChange={(e) => setInternet(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sacs de livraison</label>
              <input 
                type="number"
                value={sacsLivraison}
                onChange={(e) => setSacsLivraison(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Charges transport</label>
              <input 
                type="number"
                value={chargesTransport}
                onChange={(e) => setChargesTransport(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loyer</label>
              <input 
                type="number"
                value={loyer}
                onChange={(e) => setLoyer(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autres charges</label>
              <input 
                type="number"
                value={autresCharges}
                onChange={(e) => setAutresCharges(parseFloat(e.target.value) || 0)}
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
              onChange={(e) => setTauxActualisationAnnuel(parseFloat(e.target.value) || 0)}
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
              onChange={(e) => setDureeAnalyse(parseInt(e.target.value) || 60)}
              className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
              style={{ fontSize: '16px' }}
            />
            <div className="text-xs text-gray-500 mt-1">{(dureeAnalyse / 12).toFixed(1)} années</div>
          </div>
                      <div className="flex items-end">
            <div className="w-full p-2 sm:p-3 bg-indigo-100 rounded text-sm">
              <div className="text-indigo-800 font-medium">Investissement initial</div>
              <div className="text-indigo-600 text-xs">{chargesFixes.toLocaleString()}</div>
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
                onChange={(e) => setCapex(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setBfr(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setDepreciationAmortissement(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setWacc(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setCroissanceTerminale(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setTauxImposition(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setDette(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => setTresorerie(parseFloat(e.target.value) || 0)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded text-base"
                style={{ fontSize: '16px' }}
              />
              <div className="text-xs text-gray-500 mt-1">Liquidités disponibles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateurs DCF */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📈 Indicateurs DCF</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
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
          <div>
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
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">💰 Flux de Trésorerie Détailés</h3>
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
              {fluxDCF.slice(0, 13).map((flux, index) => (
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
              {fluxDCF.length > 13 && (
                <tr className="bg-gray-100">
                  <td colSpan="6" className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-gray-600">
                    ... et {fluxDCF.length - 13} mois supplémentaires
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
              onChange={(e) => setTauxActualisationAnnuel(parseFloat(e.target.value) || 0)}
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
              onChange={(e) => setDureeAnalyse(parseInt(e.target.value) || 60)}
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

      {/* Indicateurs DCF */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-green-800">📈 Indicateurs DCF - Simulation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
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
          <div>
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
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">💰 Flux de Trésorerie Détailés - Simulation</h3>
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
              {fluxDCFSimulation.slice(0, 13).map((flux, index) => (
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
              {fluxDCFSimulation.length > 13 && (
                <tr className="bg-gray-100">
                  <td colSpan="6" className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm text-gray-600">
                    ... et {fluxDCFSimulation.length - 13} mois supplémentaires
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
              <div className="text-sm text-gray-600">Volume de vente mensuel total de tous les produits</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">CA Annuel</div>
              <div className="text-lg font-bold text-blue-600">240,000,000</div>
              <div className="text-sm text-gray-600">20,000,000 × 12 mois</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">Bénéfice Mensuel Approximatif</div>
              <div className="text-lg font-bold text-green-600">~2,000,000</div>
              <div className="text-sm text-gray-600">Environ 10% du CA mensuel</div>
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
              <div className="text-lg font-bold text-purple-600">24,000,000</div>
              <div className="text-sm text-gray-600">10% du CA annuel (240M × 10%)</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">BFR (annuel)</div>
              <div className="text-lg font-bold text-orange-600">18,000,000</div>
              <div className="text-sm text-gray-600">7.5% du CA annuel (240M × 7.5%)</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-800">D&A (annuel)</div>
              <div className="text-lg font-bold text-indigo-600">12,000,000</div>
              <div className="text-sm text-gray-600">50% du CAPEX (24M × 50%)</div>
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
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">🥧 Répartition des Bénéfices</h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="benefice"
                  label={({nom, percent, volume}) => `${nom}: ${(percent * 100).toFixed(1)}% (${volume.toLocaleString()})`}
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
                          <div className="text-xs text-blue-600 mt-1">
                            {Math.round(produit.repartition * adjustedVolume).toLocaleString()}
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