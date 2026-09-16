import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function EmployesPage() {
  const [employes, setEmployes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("TOUS");

  // State Modal
  const [formOuvert, setFormOuvert] = useState(false);
  const [empEnEdition, setEmpEnEdition] = useState(null);

  // Formulaire local
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "EMPLOYE", // EMPLOYE, MANAGER, RH, ADMIN
    departement_id: "",
    solde_conge: 30,
    is_active: true,
  });

  // Charger les données (employés + départements)
  async function chargerDonnees() {
    setChargement(true);
    try {
      const [resEmp, resDep] = await Promise.all([
        api.get("/utilisateurs/"), // ou /employes/
        api.get("/departements/"),
      ]);

      setEmployes(resEmp.data.results ?? resEmp.data);
      setDepartements(resDep.data.results ?? resDep.data);
    } catch (err) {
      console.error("Erreur de chargement des données :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Ouvrir la modal en mode Création ou Édition
  const ouvrirFormulaire = (emp = null) => {
    if (emp) {
      setEmpEnEdition(emp);
      setForm({
        email: emp.email || "",
        first_name: emp.first_name || emp.prenom || "",
        last_name: emp.last_name || emp.nom || "",
        role: emp.role || "EMPLOYE",
        departement_id: emp.departement?.id || emp.departement || "",
        solde_conge: emp.solde_conge ?? 30,
        is_active: emp.is_active ?? true,
      });
    } else {
      setEmpEnEdition(null);
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        role: "EMPLOYE",
        departement_id: "",
        solde_conge: 30,
        is_active: true,
      });
    }
    setFormOuvert(true);
  };

  // Soumettre (POST ou PATCH)
  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      departement: form.departement_id || null,
      solde_conge: parseFloat(form.solde_conge),
      is_active: form.is_active,
    };

    try {
      if (empEnEdition) {
        await api.patch(`/utilisateurs/${empEnEdition.id}/`, payload);
      } else {
        await api.post("/utilisateurs/", payload);
      }
      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur d'enregistrement :", err.response?.data || err);
      alert("Erreur lors de l'enregistrement de l'employé.");
    }
  }

  // Supprimer un utilisateur
  async function handleSupprimer(id, nomComplet) {
    if (!window.confirm(`Voulez-vous supprimer l'utilisateur "${nomComplet}" ?`)) return;

    try {
      await api.delete(`/utilisateurs/${id}/`);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      alert("Impossible de supprimer cet utilisateur.");
    }
  }

  // Filtrage local (Recherche texte + Filtre par rôle)
  const employesFiltres = employes.filter((e) => {
    const nomComplet = `${e.first_name || e.prenom || ""} ${e.last_name || e.nom || ""}`.toLowerCase();
    const email = (e.email || "").toLowerCase();
    const matchTexte = nomComplet.includes(recherche.toLowerCase()) || email.includes(recherche.toLowerCase());
    
    const matchRole = filtreRole === "TOUS" || e.role === filtreRole;
    return matchTexte && matchRole;
  });

  return (
    <Layout>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">
            Gestion du Personnel
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gestion des comptes (Employés, Managers, RH) et de leurs soldes de congé
          </p>
        </div>

        <button
          onClick={() => ouvrirFormulaire()}
          className="rounded-xl bg-[#E91E8C] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#c81879] transition-all shadow-md active:scale-95"
        >
          + Ajouter un membre
        </button>
      </div>

      {/* Barre de Recherche et Filtres par Rôle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, prénom ou email..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full max-w-md bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E91E8C] shadow-sm"
        />

        <select
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value)}
          className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E91E8C] shadow-sm"
        >
          <option value="TOUS">Tous les rôles</option>
          <option value="EMPLOYE">Employés</option>
          <option value="MANAGER">Managers / Chefs</option>
          <option value="RH">Ressources Humaines</option>
        </select>
      </div>

      {/* Tableau des utilisateurs */}
      {chargement ? (
        <div className="py-12 text-center text-neutral-400 font-medium">
          Chargement de la liste des employés...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
              <tr>
                <th className="p-4">Employé</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Département</th>
                <th className="p-4">Solde Congés</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {employesFiltres.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-neutral-400 font-medium">
                    Aucun employé ne correspond à la recherche.
                  </td>
                </tr>
              ) : (
                employesFiltres.map((emp) => {
                  const nomComplet = `${emp.first_name || emp.prenom || ""} ${emp.last_name || emp.nom || ""}`;
                  const nomDept = emp.departement_detail?.nom || emp.departement_nom || "-";

                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50/50">
                      <td className="p-4">
                        <div className="font-bold text-neutral-900">{nomComplet || "Sans nom"}</div>
                        <div className="text-xs text-neutral-400">{emp.email}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                            emp.role === "RH"
                              ? "bg-purple-100 text-purple-700"
                              : emp.role === "MANAGER"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {emp.role || "EMPLOYE"}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600 font-medium">{nomDept}</td>
                      <td className="p-4">
                        <span className="font-bold text-neutral-900">
                          {emp.solde_conge ?? 0}
                        </span>{" "}
                        <span className="text-xs text-neutral-400">jours</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            emp.is_active ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          ● {emp.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-3 text-xs font-semibold">
                        <button
                          onClick={() => ouvrirFormulaire(emp)}
                          className="text-neutral-600 hover:text-black"
                        >
                          ✏️ Éditer
                        </button>
                        <button
                          onClick={() => handleSupprimer(emp.id, nomComplet)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulaire Ajouter / Éditer */}
      {formOuvert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-neutral-900">
              {empEnEdition ? "Modifier le compte" : "Ajouter un nouvel employé"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Nom</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Email professionnel</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Rôle Système</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C] bg-white"
                >
                  <option value="EMPLOYE">Employé</option>
                  <option value="MANAGER">Chef d'équipe / Manager</option>
                  <option value="RH">Ressources Humaines</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Département</label>
                <select
                  value={form.departement_id}
                  onChange={(e) => setForm({ ...form, departement_id: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C] bg-white"
                >
                  <option value="">-- Aucun --</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom || d.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Solde de congés (jours)</label>
              <input
                type="number"
                step="0.5"
                value={form.solde_conge}
                onChange={(e) => setForm({ ...form, solde_conge: e.target.value })}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="accent-[#E91E8C] h-4 w-4 rounded"
              />
              <span className="text-xs font-bold text-neutral-800">
                Compte actif (autoriser la connexion)
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#E91E8C] text-white py-2.5 text-sm font-semibold hover:bg-[#c81879]"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}