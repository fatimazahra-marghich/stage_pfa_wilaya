import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

function nomComplet(d) {
  if (!d) return "Inconnu";
  const u = d.utilisateur_details || d.utilisateur || d;
  if (typeof u === "object" && u !== null) {
    if (u.nom_complet) return u.nom_complet;
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    if (u.username) return u.username;
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur?.id || d.utilisateur || d.id || "?"}`;
}

function extraireDivisionInfo(d, listeDivisions = []) {
  const u = d?.utilisateur_details || d?.utilisateur || {};
  const srv = u?.service_details || u?.service || d?.service_details || d?.service || {};
  const divObj = srv?.division_details || srv?.division || u?.division_details || u?.division || d?.division || {};

  const divId =
    typeof divObj === "object" && divObj !== null
      ? divObj.id
      : srv?.division_id ||
        (typeof srv?.division === "number" || typeof srv?.division === "string" ? srv.division : null) ||
        (typeof u?.division === "number" || typeof u?.division === "string" ? u.division : null) ||
        (typeof d?.division === "number" || typeof d?.division === "string" ? d.division : null);

  let nom =
    typeof divObj === "object" && divObj !== null
      ? divObj.nom || divObj.libelle
      : srv?.division_nom || u?.division_nom || d?.division_nom;

  if (!nom && divId && Array.isArray(listeDivisions)) {
    const divTrouvee = listeDivisions.find((item) => String(item.id) === String(divId));
    if (divTrouvee) {
      nom = divTrouvee.nom || divTrouvee.libelle || divTrouvee.code;
    }
  }

  if (nom) return { id: divId, nom };
  if (divId) return { id: divId, nom: `Division #${divId}` };
  return { id: null, nom: "—" };
}

export default function RhHistory() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [divisionSelectionnee, setDivisionSelectionnee] = useState("");
  const [serviceSelectionne, setServiceSelectionne] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);
    try {
      const [resDemandes, resDivisions, resServices] = await Promise.all([
        api.get("/demandes/").catch(() => ({ data: [] })),
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
      ]);

      const extraire = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.results)) return res.data.results;
        if (Array.isArray(res.data.data)) return res.data.data;
        return [];
      };

      const rawDivisions = extraire(resDivisions);
      let rawServices = extraire(resServices);

      if (rawDivisions.length > 0) {
        const mapServices = new Map();
        rawServices.forEach((s) => s?.id && mapServices.set(String(s.id), s));
        rawDivisions.forEach((div) => {
          if (Array.isArray(div.services)) {
            div.services.forEach((s) => {
              if (s?.id && !mapServices.has(String(s.id))) {
                mapServices.set(String(s.id), { ...s, division: s.division || div.id || div });
              }
            });
          }
        });
        rawServices = Array.from(mapServices.values());
      }

      setDemandes(extraire(resDemandes));
      setDivisions(rawDivisions);
      setServices(rawServices);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setChargement(false);
    }
  }

  const servicesFiltres = useMemo(() => {
    if (!divisionSelectionnee) return services;
    return services.filter((s) => {
      const divId = s?.division?.id ?? s?.division ?? s?.division_id;
      return String(divId) === String(divisionSelectionnee);
    });
  }, [services, divisionSelectionnee]);

  const handleDivisionChange = (e) => {
    setDivisionSelectionnee(e.target.value);
    setServiceSelectionne("");
  };

  const demandesFiltrees = useMemo(() => {
    return demandes.filter((d) => {
      const u = d.utilisateur_details || d.utilisateur || {};
      const agentNom = nomComplet(d).trim().toLowerCase();

      // Suppression automatique de l'agent test test
      if (agentNom === "test test" || agentNom === "test") {
        return false;
      }

      const srvId = String(
        u?.service?.id ?? u?.service ?? u?.service_details?.id ?? d?.service?.id ?? d?.service ?? ""
      );
      const srvTrouve = services.find((s) => String(s.id) === String(srvId));
      const divId = String(
        u?.service?.division?.id ??
        u?.service?.division ??
        u?.service_details?.division?.id ??
        u?.service_details?.division ??
        u?.division?.id ??
        u?.division ??
        d?.division?.id ??
        d?.division ??
        srvTrouve?.division?.id ??
        srvTrouve?.division ??
        srvTrouve?.division_id ??
        ""
      );

      if (divisionSelectionnee && divId !== String(divisionSelectionnee)) return false;
      if (serviceSelectionne && srvId !== String(serviceSelectionne)) return false;
      if (statutFilter && String(d.statut).toUpperCase() !== String(statutFilter).toUpperCase()) return false;
      if (recherche && !agentNom.includes(recherche.toLowerCase())) return false;

      return true;
    });
  }, [demandes, divisionSelectionnee, serviceSelectionne, statutFilter, recherche, services]);

  // Calculs des KPIs généraux
  const stats = useMemo(() => {
    const total = demandesFiltrees.length;
    const validees = demandesFiltrees.filter((d) => String(d.statut).toUpperCase() === "VALIDEE").length;
    const joursTotaux = demandesFiltrees.reduce((acc, d) => acc + (Number(d.nombre_jours) || 0), 0);
    const malades = demandesFiltrees.filter((d) =>
      (d.type_conge_libelle || "").toLowerCase().includes("maladie")
    ).length;

    return { total, validees, joursTotaux, malades };
  }, [demandesFiltrees]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        
        {/* En-tête principal de la page */}
        <header className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50/40 via-white to-pink-50/30 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-cyan-600">
            <span>Ressources Humaines</span>
            <span>•</span>
            <span className="text-[#800038]">Suivi Central</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#3c0038]">
            Historique Général des Demandes
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Gérez et consultez les demandes de congé de l'ensemble de la structure.
          </p>
        </header>

        {/* Cartes KPI - Style inspiré de l'image */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/30 p-5 transition hover:shadow-md">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600">
              Total Demandes
            </span>
            <div className="mt-2 text-3xl font-black text-[#3c0038]">{stats.total}</div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              <span className="font-bold text-emerald-600">{stats.validees}</span> validée(s)
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/30 p-5 transition hover:shadow-md">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600">
              Jours Demandés
            </span>
            <div className="mt-2 text-3xl font-black text-[#800038]">{stats.joursTotaux} <span className="text-sm font-bold">jours</span></div>
            <p className="mt-1 text-xs text-slate-500 font-medium">Sur les critères sélectionnés</p>
          </div>

          <div className="rounded-2xl border border-pink-200 bg-pink-50/30 p-5 transition hover:shadow-md">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#800038]">
              Dossiers Maladie
            </span>
            <div className="mt-2 text-3xl font-black text-[#800038]">{stats.malades}</div>
            <p className="mt-1 text-xs text-slate-500 font-medium">Arrêts / Congés maladie</p>
          </div>
        </div>

        {/* Section Barre de Filtres */}
        <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Recherche globale */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icone d={I.loupe} className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une demande ou agent..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Filtre Division */}
            <select
              value={divisionSelectionnee}
              onChange={handleDivisionChange}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
            >
              <option value="">Toutes les Divisions ({divisions.length})</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.nom || div.libelle || div.code || `Division ${div.id}`}
                </option>
              ))}
            </select>

            {/* Filtre Service */}
            <select
              value={serviceSelectionne}
              onChange={(e) => setServiceSelectionne(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
            >
              <option value="">Tous les Services ({servicesFiltres.length})</option>
              {servicesFiltres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom || s.libelle || s.code || `Service ${s.id}`}
                </option>
              ))}
            </select>

            {/* Filtre Statut */}
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-cyan-50/40 px-3 py-2 text-xs font-semibold text-cyan-900 outline-none focus:border-cyan-400"
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
        </div>

        {/* Tableau récapitulatif avec le design moderne (En-tête Cyan clair, Pill Durée, design doux) */}
        <div className="overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-cyan-50/60 text-[11px] font-extrabold uppercase tracking-wider text-cyan-800 border-b border-cyan-100">
              <tr>
                <th className="p-4">Agent / Service</th>
                <th className="p-4">Type</th>
                <th className="p-4">Période</th>
                <th className="p-4 text-center">Durée</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs font-semibold text-slate-400">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    Chargement des demandes...
                  </td>
                </tr>
              ) : demandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center font-medium text-slate-400">
                    Aucune demande ne correspond aux filtres actuels.
                  </td>
                </tr>
              ) : (
                demandesFiltrees.map((d) => {
                  const agentNom = nomComplet(d);
                  const divInfo = extraireDivisionInfo(d, divisions);
                  const u = d.utilisateur_details || d.utilisateur || {};
                  const serviceNom = u.service_nom || d.service_nom || "—";

                  return (
                    <tr key={d.id} className="transition hover:bg-cyan-50/20">
                      {/* Agent & Division */}
                      <td className="p-4">
                        <div className="font-bold text-[#3c0038] text-sm">{agentNom}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {divInfo.nom} <span className="text-slate-300">•</span> {serviceNom}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-4 font-bold text-[#800038]">
                        {d.type_conge_libelle || "Congé"}
                      </td>

                      {/* Période */}
                      <td className="p-4 text-slate-600 font-medium">
                        <div>{d.date_debut}</div>
                        <div className="text-[11px] text-slate-400">→ {d.date_fin}</div>
                      </td>

                      {/* Durée (Badge pilule cyan inspiré de l'image) */}
                      <td className="p-4 text-center">
                        <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800 border border-cyan-100">
                          {d.nombre_jours}j
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="p-4">
                        <StatutBadge statut={d.statut} />
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => navigate(`/rh/demandes/${d.id}`)}
                          className="rounded-xl bg-cyan-50/80 px-3.5 py-1.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 border border-cyan-200"
                        >
                          Détails →
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