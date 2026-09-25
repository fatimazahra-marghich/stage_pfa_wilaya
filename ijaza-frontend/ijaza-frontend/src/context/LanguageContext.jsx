import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  fr: {
    // Roles
    role_EMPLOYE: "Espace agent",
    role_CHEF_SERVICE: "Chef de service",
    role_RH: "Ressources humaines",
    role_ADMIN: "Administration",

    // Section Titres
    myLeaves: "Mes congés",
    myService: "Mon service",
    hrSpace: "Espace RH",
    overview: "Vue d'ensemble",
    systemMgmt: "Gestion Système",
    preferences: "Préférences",

    // Navigation Labels
    dashboard: "Tableau de bord",
    dashboardRh: "Tableau de bord RH",
    dashboardAdmin: "Tableau de bord Admin",
    newRequest: "Nouvelle demande",
    history: "Historique",
    globalHistory: "Historique Global",
    requestsToValidate: "Demandes à valider",
    validationRequests: "Validation des demandes",
    teamPlanning: "Planning équipe",
    globalPlanning: "Planning global",
    agentHistory: "Historique des agents",
    balanceCorrection: "Régularisation solde",
    globalBalances: "Vue globale des soldes",
    reports: "Rapports statistiques",
    employees: "Gestion des Employés",
    structure: "Structure Organisationnelle",
    holidays: "Jours Fériés",
    leaveTypes: "Types de Congés",
    profile: "Mon Profil",
    settings: "Paramètres (Langue / Mode)",
    logout: "Déconnexion",
    support: "Support technique",
  },
  ar: {
    // Roles
    role_EMPLOYE: "فضاء الموظف",
    role_CHEF_SERVICE: "رئيس المصلحة",
    role_RH: "الموارد البشرية",
    role_ADMIN: "الإدارة",

    // Section Titres
    myLeaves: "إجازاتي",
    myService: "مصلحتي",
    hrSpace: "فضاء الموارد البشرية",
    overview: "نظرة عامة",
    systemMgmt: "إدارة النظام",
    preferences: "التفضيلات",

    // Navigation Labels
    dashboard: "لوحة التحكم",
    dashboardRh: "لوحة تحكم الموارد البشرية",
    dashboardAdmin: "لوحة تحكم الإدارة",
    newRequest: "طلب جديد",
    history: "السجل",
    globalHistory: "السجل العام",
    requestsToValidate: "طلبات للتحقق",
    validationRequests: "التحقق من الطلبات",
    teamPlanning: "جدول الفريق",
    globalPlanning: "الجدول العام",
    agentHistory: "سجل الموظفين",
    balanceCorrection: "تسوية الرصيد",
    globalBalances: "عرض شامل للأرصدة",
    reports: "التقارير الإحصائية",
    employees: "إدارة الموظفين",
    structure: "الهيكل التنظيمي",
    holidays: "العطل الرسمية",
    leaveTypes: "أنواع الإجازات",
    profile: "الملف الشخصي",
    settings: "الإعدادات (اللغة / الوضع)",
    logout: "تسجيل الخروج",
    support: "الدعم الفني",
  },
  en: {
    // Roles
    role_EMPLOYE: "Agent Space",
    role_CHEF_SERVICE: "Head of Department",
    role_RH: "Human Resources",
    role_ADMIN: "Administration",

    // Section Titres
    myLeaves: "My Leaves",
    myService: "My Department",
    hrSpace: "HR Space",
    overview: "Overview",
    systemMgmt: "System Management",
    preferences: "Preferences",

    // Navigation Labels
    dashboard: "Dashboard",
    dashboardRh: "HR Dashboard",
    dashboardAdmin: "Admin Dashboard",
    newRequest: "New Request",
    history: "History",
    globalHistory: "Global History",
    requestsToValidate: "Requests to Validate",
    validationRequests: "Request Validation",
    teamPlanning: "Team Schedule",
    globalPlanning: "Global Schedule",
    agentHistory: "Agent History",
    balanceCorrection: "Balance Regularization",
    globalBalances: "Global Balances View",
    reports: "Statistical Reports",
    employees: "Employee Management",
    structure: "Organizational Structure",
    holidays: "Public Holidays",
    leaveTypes: "Leave Types",
    profile: "My Profile",
    settings: "Settings (Language / Mode)",
    logout: "Log out",
    support: "Technical Support",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [langue, setLangue] = useState(
    () => localStorage.getItem("app_langue") || "fr"
  );

  useEffect(() => {
    localStorage.setItem("app_langue", langue);
    if (langue === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = langue;
    }
  }, [langue]);

  const t = (key) => translations[langue]?.[key] || translations["fr"][key] || key;

  return (
    <LanguageContext.Provider value={{ langue, setLangue, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);