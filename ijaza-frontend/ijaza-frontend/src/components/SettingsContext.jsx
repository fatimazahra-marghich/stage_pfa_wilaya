import React, { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("app_theme") || "clair"
  );
  const [langue, setLangue] = useState(
    () => localStorage.getItem("app_langue") || "fr"
  );
  const [notifEmail, setNotifEmail] = useState(() => {
    const s = localStorage.getItem("app_notif_email");
    return s !== null ? JSON.parse(s) : true;
  });
  const [notifDemandes, setNotifDemandes] = useState(() => {
    const s = localStorage.getItem("app_notif_demandes");
    return s !== null ? JSON.parse(s) : true;
  });

  // Appliquer le mode sombre sur la balise <html>
  useEffect(() => {
    if (theme === "sombre") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  // Appliquer la direction RTL si Arabe
  useEffect(() => {
    if (langue === "ar") {
      document.documentElement.setAttribute("dir", "rtl");
    } else {
      document.documentElement.setAttribute("dir", "ltr");
    }
    localStorage.setItem("app_langue", langue);
  }, [langue]);

  const enregistrerParametres = (nouveauTheme, nouvelleLangue, email, demandes) => {
    setTheme(nouveauTheme);
    setLangue(nouvelleLangue);
    setNotifEmail(email);
    setNotifDemandes(demandes);

    localStorage.setItem("app_notif_email", JSON.stringify(email));
    localStorage.setItem("app_notif_demandes", JSON.stringify(demandes));
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        langue,
        setLangue,
        notifEmail,
        setNotifEmail,
        notifDemandes,
        setNotifDemandes,
        enregistrerParametres,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);