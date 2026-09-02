import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("ijaza_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Remplace matricule par email dans les paramètres
  async function login(email, password) {
    const { data } = await api.post("/users/auth/login/", { email, password });
    
    localStorage.setItem("ijaza_access_token", data.access);
    localStorage.setItem("ijaza_refresh_token", data.refresh);
    
    const userInfo = { 
      role: data.role, 
      nomComplet: data.nom_complet, 
      email: data.email,
      matricule: data.matricule 
    };
    
    localStorage.setItem("ijaza_user", JSON.stringify(userInfo));
    setUser(userInfo);
    return userInfo;
  }

  function logout() {
    localStorage.removeItem("ijaza_access_token");
    localStorage.removeItem("ijaza_refresh_token");
    localStorage.removeItem("ijaza_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}