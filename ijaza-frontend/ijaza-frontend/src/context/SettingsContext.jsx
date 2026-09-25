import React, { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "clair");
  const [langue, setLangue] = useState(() => localStorage.getItem("langue") || "fr");

  // Synchronisation du thème avec le DOM et localStorage
  useEffect(() => {
    if (theme === "sombre") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Synchronisation de la langue avec localStorage
  useEffect(() => {
    localStorage.setItem("langue", langue);
  }, [langue]);

  const changerTheme = (nouveauTheme) => {
    setTheme(nouveauTheme);
  };

  const changerLangue = (nouvelleLangue) => {
    setLangue(nouvelleLangue);
  };

  return (
    <SettingsContext.Provider value={{ theme, langue, changerTheme, changerLangue }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings doit être utilisé à l'intérieur d'un SettingsProvider");
  }
  return context;
}