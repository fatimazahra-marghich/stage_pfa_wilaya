import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("ijaza_user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(matricule, password) {
    const { data } = await api.post("/auth/login/", { matricule, password });
    localStorage.setItem("ijaza_access_token", data.access);
    localStorage.setItem("ijaza_refresh_token", data.refresh);
    const userInfo = { role: data.role, nomComplet: data.nom_complet, matricule: data.matricule };
    localStorage.setItem("ijaza_user", JSON.stringify(userInfo));
    setUser(userInfo);
    return userInfo;
  }

  function logout() {
    localStorage.clear();
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
