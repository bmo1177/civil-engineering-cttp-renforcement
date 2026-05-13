'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Lang = 'en' | 'fr'

const STORAGE_KEY = 'cttp_lang'

const translations: Record<string, { en: string; fr: string }> = {
  // App
  'app.title': { en: 'CTTP Renforcement', fr: 'CTTP Renforcement' },
  'app.subtitle': { en: 'v1 · Guide 1992', fr: 'v1 · Guide 1992' },
  'app.footer': { en: 'CTTP — Guide des Renforcements des Chaussées Souples (Déc 1992)', fr: 'CTTP — Guide des Renforcements des Chaussées Souples (Déc 1992)' },

  // Tabs
  'tab.design': { en: 'Design', fr: 'Dimensionnement' },
  'tab.analysis': { en: 'AI Analysis', fr: 'Analyse IA' },
  'tab.results': { en: 'Results', fr: 'Résultats' },

  // Design form
  'design.title': { en: 'Design Parameters', fr: 'Paramètres de Dimensionnement' },
  'design.traffic_class': { en: 'Traffic Class', fr: 'Classe de Trafic' },
  'design.surface_type': { en: 'Surface Type', fr: 'Type de Surface' },
  'design.visual_status': { en: 'Visual Status', fr: 'État Visuel' },
  'design.uni': { en: 'UNI', fr: 'UNI' },
  'design.uni_hint': { en: '(mm/km, 0-5000)', fr: '(mm/km, 0-5000)' },
  'design.uni_tooltip': { en: 'Uniformity Index (mm/km) — measures pavement surface evenness.', fr: 'Indice d\'Uniformité (mm/km) — mesure la régularité de la surface de la chaussée.' },

  // Deflection Correction
  'deflection.title': { en: 'Deflection Correction Calculator', fr: 'Calculateur de Correction de Flèche' },
  'deflection.description': { en: 'd = dc × Cs × Cr × Ct — computed in real-time as you adjust parameters', fr: 'd = dc × Cs × Cr × Ct — calculé en temps réel' },
  'deflection.measured': { en: 'Measured Deflection dc', fr: 'Flèche Mesurée dc' },
  'deflection.measured_hint': { en: '(1/100 mm)', fr: '(1/100 mm)' },
  'deflection.season': { en: 'Season (Cs)', fr: 'Saison (Cs)' },
  'deflection.season_tooltip': { en: 'Seasonal correction factor (Cs). Adjusts deflection for wet/dry conditions.', fr: 'Facteur de correction saisonnier (Cs). Ajuste la flèche selon les conditions.' },
  'deflection.season_wet': { en: 'Wet (Cs=1.00)', fr: 'Humide (Cs=1.00)' },
  'deflection.season_intermediate': { en: 'Intermediate (Cs=1.15)', fr: 'Intermédiaire (Cs=1.15)' },
  'deflection.season_dry': { en: 'Dry (Cs=1.25)', fr: 'Sec (Cs=1.25)' },
  'deflection.region': { en: 'Region (Cr)', fr: 'Région (Cr)' },
  'deflection.region_tooltip': { en: 'Regional correction factor (Cr). Accounts for Algeria\'s geographic zones.', fr: 'Facteur de correction régional (Cr). Tient compte des zones géographiques algériennes.' },
  'deflection.region_north': { en: 'North (Cr=1.00)', fr: 'Nord (Cr=1.00)' },
  'deflection.region_hauts_plateaux': { en: 'Hauts-Plateaux (Cr=0.80)', fr: 'Hauts-Plateaux (Cr=0.80)' },
  'deflection.region_sahara': { en: 'Sahara (Cr=0.50)', fr: 'Sahara (Cr=0.50)' },
  'deflection.temperature': { en: 'Pavement Temperature', fr: 'Température de la Chaussée' },
  'deflection.temperature_hint': { en: '(°C)', fr: '(°C)' },
  'deflection.temperature_tooltip': { en: 'Temperature correction factor (Ct). Applies when bitumen layer exceeds 10cm.', fr: 'Facteur de correction thermique (Ct). S\'applique si la couche de bitume dépasse 10cm.' },
  'deflection.bitumen': { en: 'Bitumen Layer', fr: 'Couche de Bitume' },
  'deflection.bitumen_disabled': { en: 'Disabled: Ct=1.0 when bitumen ≤10cm', fr: 'Désactivé : Ct=1.0 si bitume ≤10cm' },
  'deflection.formula': { en: 'd = dc × Cs × Cr × Ct — computed in real-time as you adjust parameters', fr: 'd = dc × Cs × Cr × Ct — calculé en temps réel' },

  // Compute
  'compute.button': { en: 'Compute Reinforcement Design', fr: 'Calculer le Renforcement' },
  'compute.computing': { en: 'Computing...', fr: 'Calcul en cours...' },
  'compute.success_title': { en: 'Design computed successfully per CTTP p.45', fr: 'Dimensionnement calculé selon CTTP p.45' },
  'compute.results_hint': { en: 'Results →', fr: 'Résultats →' },

  // AI Analysis
  'analysis.title': { en: 'AI Analysis', fr: 'Analyse IA' },
  'analysis.analyze': { en: 'Analyze with AI', fr: 'Analyser avec IA' },
  'analysis.analyzing': { en: 'Analyzing...', fr: 'Analyse en cours...' },
  'analysis.demo_notice': { en: 'Using demo detections. Add a Gemini API key in Settings for real analysis.', fr: 'Détections de démonstration. Ajoutez une clé API Gemini dans Paramètres.' },
  'analysis.api_missing_notice': { en: 'No valid key found. Edit your API key in Settings.', fr: 'Aucune clé valide. Modifiez votre clé API dans Paramètres.' },

  // Status badges
  'status.ai_active_user': { en: 'AI Active (User)', fr: 'IA Active (Utilisateur)' },
  'status.ai_active_system': { en: 'AI Active (System)', fr: 'IA Active (Système)' },
  'status.offline': { en: 'Offline', fr: 'Hors Ligne' },
  'status.settings': { en: 'Settings', fr: 'Paramètres' },
  'status.help': { en: 'Help — CTTP Guide', fr: 'Aide — Guide CTTP' },

  // Settings
  'settings.title': { en: 'Settings', fr: 'Paramètres' },
  'settings.description': { en: 'Configure your API key and preferences.', fr: 'Configurez votre clé API et vos préférences.' },
  'settings.language': { en: 'Language', fr: 'Langue' },
  'settings.english': { en: 'English', fr: 'Anglais' },
  'settings.french': { en: 'Français', fr: 'Français' },

  // Image Uploader
  'upload.dropzone': { en: 'Drop pavement image or video here, or click to browse', fr: 'Déposez une image ou vidéo de chaussée ici, ou cliquez pour parcourir' },
  'upload.supported': { en: 'PNG, JPG, WebP, MP4 up to 20MB', fr: 'PNG, JPG, WebP, MP4 jusqu\'à 20 Mo' },
  'upload.delete': { en: 'Delete', fr: 'Supprimer' },
  'upload.error_size': { en: 'File exceeds 20MB limit', fr: 'Fichier dépasse la limite de 20 Mo' },
  'upload.error_type': { en: 'Unsupported file type', fr: 'Type de fichier non supporté' },

  // License
  'license.placeholder': { en: 'License Key', fr: 'Clé de Licence' },
  'license.activate': { en: 'Activate', fr: 'Activer' },
  'license.active': { en: 'Licensed', fr: 'Licencié' },
  'license.inactive': { en: 'Unlicensed', fr: 'Non Licencié' },
  'license.valid': { en: 'Valid License', fr: 'Licence Valide' },
  'license.invalid': { en: 'Invalid Key', fr: 'Clé Invalide' },

  // Loading
  'loading.calculator': { en: 'Loading calculator...', fr: 'Chargement du calculateur...' },

  // Errors
  'error.generic': { en: 'Something went wrong. Please try again.', fr: 'Une erreur est survenue. Veuillez réessayer.' },
  'error.network': { en: 'Network error. Check your connection.', fr: 'Erreur réseau. Vérifiez votre connexion.' },
  'error.compute_failed': { en: 'Design computation failed.', fr: 'Le calcul du dimensionnement a échoué.' },
  'error.analysis_failed': { en: 'AI analysis failed.', fr: 'L\'analyse IA a échoué.' },
}

export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] ?? key
}

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'en' || stored === 'fr') {
      setLangState(stored)
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const translate = useCallback((key: string) => t(key, lang), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
