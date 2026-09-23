import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

export default function RhHistory() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [services, setServices] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [serviceSelectionne, setServiceSelectionne] = useState("");
  const [employeSelectionne, setEmployeSelectionne] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerStructureEtHistorique();
  }, []);

  async function chargerStructureEtHistorique() {
    setChargement(true);
    try {
      const [resDemandes, resServices, resEmployes] = await Promise.all([
        api.get("/demandes/").catch(() => ({ data: [] })),
        api.get("/services/").catch(() => ({ data: [] })),
        api.get("/soldes/").catch(() => ({ data: [] })), // Ou endpoint /utilisateurs/
      ]);

      const listeDemandes = resDemandes.data?.results ?? resDemandes.data ?? [];
      const listeServices = resServices.data?.results ?? resServices.data ?? [];
      const listeEmployes = resEmployes.data?.results ?? resEmployes.data ?? [];

      setDemandes(Array.isArray(listeDemandes) ? listeDemandes : []);
      setServices(Array.isArray(listeServices) ? listeServices : []);
      setEmployes(Array.isArray(listeEmployes) ? listeEmployes : []);
    } catch (err) {
      console.error("Erreur de chargement historique RH :", err);
    } finally {
      setChargement(false);
    }
  }

  // Liste filtrée des employés en fonction du service choisi
  const employesFiltres = useMemo(() => {
    if (!serviceSelectionne) return employes;
    return employes.filter(
      (e) => String(e.service || e.service_id || e.utilisateur_details?.service) === String(serviceSelectionne)
    );
  }, [employes, serviceSelectionne]);

  // RàZ du filtre employé si on change de service
  const handleServiceChange = (e) => {
    setServiceSelectionne(e.target.value);
    setEmployeSelectionne("");
  };

  // Filtrage global des demandes
  const demandesFiltrees = useMemo(() => {
    return demandes.filter((d) => {
      const u = d.utilisateur_details || d.utilisateur || {};
      const idUser = u.id || d.utilisateur;
      const nomComplet = (u.nom_complet || `${u.first_name || ""} ${u.last_name || ""}`).toLowerCase();
      const idService = u.service || u.service_id;

      // Filtre Service
      if (serviceSelectionne && String(idService) !== String(serviceSelectionne)) return false;

      // Filtre Employé spécifique
      if (employeSelectionne && String(idUser) !== String(employeSelectionne)) return false;

      // Filtre Statut
      if (statutFilter && d.statut !== statutFilter) return false;

      // Recherche texte (nom, prénom ou matricule)
      if (recherche && !nomComplet.includes(recherche.toLowerCase())) return false;

      return true;
    });
  }, [demandes, serviceSelectionne, employeSelectionne, statutFilter, recherche]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
            Historique Général des Demandes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recherchez et filtrez l'intégralité des congés par Service, Employé ou Statut.
          </p>
        </div>

        {/* Barre de Filtres Avancée */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Sélection du Service */}
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">Service</label>
            <select
              value={serviceSelectionne}
              onChange={handleServiceChange}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Tous les services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.nom || s.libelle}</option>
              ))}
            </select>
          </div>

          {/* 2. Sélection de l'Employé (Dynamique) */}
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">Employé</label>
            <select
              value={employeSelectionne}
              onChange={(e) => setEmployeSelectionne(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Tous les employés</option>
              {employesFiltres.map((emp) => {
                const u = emp.utilisateur_details || emp;
                const nom = u.nom_complet || `${u.first_name || ""} ${u.last_name || ""}`.trim();
                return (
                  <option key={u.id || emp.id} value={u.id || emp.id}>
                    {nom || `Agent #${u.id}`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Filtre par Statut */}
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">Statut</label>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Tous les statuts</option>
              <option value="VALIDEE">Validée (RH)</option>
              <option value="EN_ATTENTE_CHEF">En attente Chef</option>
              <option value="EN_ATTENTE_RH">En attente RH</option>
              <option value="REFUSEE_CHEF">Refusée Chef</option>
              <option value="REFUSEE_RH">Refusée RH</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>

          {/* 4. Recherche par mot-clé */}
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">Recherche</label>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, matricule..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0097ff]"
            />
          </div>
        </div>

        {/* Tableau des Demandes */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-400 border-b border-slate-200">
              <tr>
                <th className="p-4">Employé</th>
                <th className="p-4">Service</th>
                <th className="p-4">Type</th>
                <th className="p-4">Période</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Chargement de l'historique...
                  </td>
                </tr>
              ) : demandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Aucune demande trouvée avec ces critères.
                  </td>
                </tr>
              ) : (
                demandesFiltrees.map((d) => {
                  const u = d.utilisateur_details || d.utilisateur || {};
                  const nomAgent = u.nom_complet || `${u.first_name || ""} ${u.last_name || ""}`.trim() || `Agent #${d.utilisateur}`;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-bold text-[#3c0038]">{nomAgent}</td>
                      <td className="p-4 text-slate-500">{u.service_nom || "N/A"}</td>
                      <td className="p-4 font-semibold text-slate-700">{d.type_conge_libelle}</td>
                      <td className="p-4 text-slate-500">
                        {d.date_debut} → {d.date_fin} ({d.nombre_jours}j)
                      </td>
                      <td className="p-4">
                        <StatutBadge statut={d.statut} />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/rh/demandes/${d.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-[#0097ff] hover:bg-cyan-50"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}