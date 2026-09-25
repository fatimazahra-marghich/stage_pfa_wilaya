import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

export default function GlobalBalances() {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);

  // Filtres
  const [filtreDivision, setFiltreDivision] = useState("");
  const [filtreService, setFiltreService] = useState("");
  const [recherche, setRecherche] = useState("");

  const [fonctionnaires, setFonctionnaires] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Modale de régularisation
  const [agentSelectionne, setAgentSelectionne] = useState(null);
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motif, setMotif] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);

  const anneeActuelle = new Date().getFullYear();

  useEffect(() => {
    chargerStructureEtSoldes();
  }, []);

  async function chargerStructureEtSoldes() {
    setChargement(true);
    try {
      const [resDivs, resServs, resSoldes, resUsers] = await Promise.all([
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
        api.get("/soldes/").catch(() => ({ data: [] })),
        api.get("/users/").catch(() => api.get("/utilisateurs/")).catch(() => ({ data: [] })),
      ]);

      const extraire = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.results)) return res.data.results;
        if (Array.isArray(res.data.data)) return res.data.data;
        return [];
      };

      const listeDivisions = extraire(resDivs);
      const listeServices = extraire(resServs);
      const listeSoldes = extraire(resSoldes);
      const listeUsers = extraire(resUsers);

      setDivisions(listeDivisions);
      setServices(listeServices);

      const mapDivisions = new Map(listeDivisions.map((d) => [String(d.id), d.nom || d.libelle || "—"]));
      const mapServices = new Map(listeServices.map((s) => [String(s.id), s]));
      const mapUsers = new Map(listeUsers.map((u) => [String(u.id), u]));

      const adaptes = listeSoldes.map((s) => {
        let u = s.utilisateur_details || s.utilisateur || s.agent || {};
        if (typeof u !== "object" || u === null) {
          u = mapUsers.get(String(u)) || {};
        }

        const prenom = u.first_name || u.prenom || "";
        const nom = u.last_name || u.nom || "";
        
        let nomComplet = "";
        if (u.nom_complet) {
          nomComplet = u.nom_complet;
        } else if (prenom || nom) {
          nomComplet = `${prenom} ${nom}`.trim();
        } else if (u.username) {
          nomComplet = u.username;
        } else if (s.nom_complet || s.nom_agent) {
          nomComplet = s.nom_complet || s.nom_agent;
        } else {
          nomComplet = "Agent sans nom";
        }

        const matricule = u.matricule || s.matricule || "N/A";

        let id_service = (typeof u.service === "object" ? u.service?.id : u.service) ?? s.service;
        let id_division = (typeof u.division === "object" ? u.division?.id : u.division) ?? s.division;

        const objService = mapServices.get(String(id_service));
        if (objService && !id_division) {
          id_division = typeof objService.division === "object" ? objService.division?.id : objService.division;
        }

        const division_nom =
          (typeof u.division === "object" ? u.division?.nom : null) ||
          mapDivisions.get(String(id_division)) ||
          u.division_nom ||
          s.division_nom ||
          "—";

        const service_nom =
          (typeof u.service === "object" ? u.service?.nom : null) ||
          objService?.nom ||
          objService?.libelle ||
          u.service_nom ||
          s.service_nom ||
          "—";

        const soldeCalcule =
          s.solde_actuel ??
          ((s.droits_acquis || 0) + (s.jours_reportes || 0) - (s.jours_consommes || 0));

        return {
          id_solde: s.id,
          id_user: u.id || s.utilisateur,
          nom_complet: nomComplet,
          matricule: matricule,
          id_division: id_division ? String(id_division) : "",
          id_service: id_service ? String(id_service) : "",
          service_nom: service_nom,
          division_nom: division_nom,
          solde_actuel: soldeCalcule,
          jours_consommes: s.jours_consommes || 0,
          jours_reportes: s.jours_reportes || 0,
          droits_acquis: s.droits_acquis || 0,
        };
      });

      setFonctionnaires(adaptes);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setChargement(false);
    }
  }

  // Filtrage
  const fonctionnairesFiltres = useMemo(() => {
    return fonctionnaires.filter((f) => {
      if (filtreDivision && String(f.id_division) !== String(filtreDivision)) return false;
      if (filtreService && String(f.id_service) !== String(filtreService)) return false;

      if (recherche) {
        const q = recherche.toLowerCase();
        const matchNom = f.nom_complet.toLowerCase().includes(q);
        const matchMatricule = String(f.matricule).toLowerCase().includes(q);
        if (!matchNom && !matchMatricule) return false;
      }
      return true;
    });
  }, [fonctionnaires, filtreDivision, filtreService, recherche]);

  // Calcul dynamique de l'écart
  const ecart = useMemo(() => {
    if (!agentSelectionne || nouveauSolde === "" || isNaN(parseInt(nouveauSolde, 10))) return "—";
    const diff = parseInt(nouveauSolde, 10) - agentSelectionne.solde_actuel;
    return diff > 0 ? `+${diff} j` : `${diff} j`;
  }, [agentSelectionne, nouveauSolde]);

  // Validation RH
  const handleAjuster = async (e) => {
    e.preventDefault();
    if (!agentSelectionne || nouveauSolde === "" || !motif) return;

    setActionEnCours(true);
    try {
      const nouveauSoldeInt = parseInt(nouveauSolde, 10);
      const nouveauxDroitsAcquis =
        nouveauSoldeInt + agentSelectionne.jours_consommes - agentSelectionne.jours_reportes;

      // Envoi du PATCH avec plusieurs formats possibles selon la logique backend Django
      await api.patch(
        `/soldes/${agentSelectionne.id_solde}/`,
        {
          droits_acquis: nouveauxDroitsAcquis,
          solde_actuel: nouveauSoldeInt,
          motif_regularisation: motif,
          motif: motif,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      setAgentSelectionne(null);
      setNouveauSolde("");
      setMotif("");
      chargerStructureEtSoldes();
    } catch (err) {
      console.error("Erreur de régularisation :", err.response?.data || err.message);
      alert(
        `Impossible de modifier le solde. ${
          err.response?.data ? JSON.stringify(err.response.data) : ""
        }`
      );
    } finally {
      setActionEnCours(false);
    }
  };

  // Export CSV
  const exporterCSV = () => {
    const entetes = ["Nom complet", "Matricule", "Division", "Service", "Solde Actuel (Jours)", "Consommés"];
    const lignes = fonctionnairesFiltres.map((f) => [
      `"${f.nom_complet}"`,
      `"${f.matricule}"`,
      `"${f.division_nom}"`,
      `"${f.service_nom}"`,
      f.solde_actuel,
      f.jours_consommes,
    ]);

    const contenu = [entetes.join(","), ...lignes.map((e) => e.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + contenu], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `soldes_agents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-cyan-600">
              <span>Gestion RH</span>
              <span>•</span>
              <span className="text-[#800038]">Soldes des Agents</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-[#3c0038]">
              Vue Globale & Régularisation des Soldes
            </h1>
          </div>

          <button
            onClick={exporterCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Icone d={I.telecharger} className="h-4 w-4 text-cyan-600" />
            Exporter (CSV)
          </button>
        </header>

        {/* Filtres */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-extrabold uppercase text-slate-400">Division</label>
            <select
              value={filtreDivision}
              onChange={(e) => {
                setFiltreDivision(e.target.value);
                setFiltreService("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
            >
              <option value="">Toutes les divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.nom || d.libelle}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-extrabold uppercase text-slate-400">Service</label>
            <select
              value={filtreService}
              onChange={(e) => setFiltreService(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400"
            >
              <option value="">Tous les services</option>
              {services
                .filter((s) => {
                  if (!filtreDivision) return true;
                  const divId = typeof s.division === "object" ? s.division?.id : s.division;
                  return String(divId) === String(filtreDivision);
                })
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.nom || s.libelle}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-extrabold uppercase text-slate-400">Recherche</label>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom ou matricule..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="p-4">Employé</th>
                <th className="p-4">Structure (Div / Serv)</th>
                <th className="p-4 text-center">Solde Actuel</th>
                <th className="p-4 text-center">Consommés</th>
                <th className="p-4 text-right">Action RH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Chargement des soldes...
                  </td>
                </tr>
              ) : fonctionnairesFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Aucun solde trouvé.
                  </td>
                </tr>
              ) : (
                fonctionnairesFiltres.map((f) => (
                  <tr key={f.id_solde} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <p className="font-bold text-[#3c0038] text-sm">{f.nom_complet}</p>
                      <p className="text-[11px] text-slate-400">Matricule : {f.matricule}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{f.service_nom}</span>
                      <span className="block text-[11px] text-slate-400">
                        {f.division_nom}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block rounded-lg px-3 py-1 font-bold ${
                          f.solde_actuel <= 3
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {f.solde_actuel} j
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-500 font-medium">
                      {f.jours_consommes} j
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setAgentSelectionne(f);
                          setNouveauSolde("");
                          setMotif("");
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-bold text-[#3c0038] hover:bg-slate-50 hover:border-[#3c0038]"
                      >
                        Régulariser
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Compact de Régularisation */}
        {agentSelectionne && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-cyan-100 relative">
              
              <button
                onClick={() => setAgentSelectionne(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>

              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#800038]">
                  Régularisation Administrative
                </p>
                <h2 className="text-base font-black text-[#3c0038] mt-0.5">
                  Ajuster le solde d'un agent
                </h2>
              </div>

              <form onSubmit={handleAjuster} className="space-y-3.5">
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3c0038] mb-1">
                      Type de congé
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="Congé Annuel"
                      className="w-full rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs font-bold text-slate-600 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3c0038] mb-1">
                      Année
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={anneeActuelle}
                      className="w-full rounded-lg border border-slate-100 bg-white p-2 text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center">
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                      Solde Actuel
                    </span>
                    <span className="block mt-0.5 text-sm font-black text-[#3c0038]">
                      {agentSelectionne.solde_actuel} j
                    </span>
                  </div>

                  <div className="rounded-lg border border-cyan-200 bg-cyan-50/30 p-2 text-center">
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-cyan-600">
                      Nouveau Solde
                    </span>
                    <span className="block mt-0.5 text-sm font-black text-cyan-700">
                      {nouveauSolde !== "" ? `${nouveauSolde} j` : "—"}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center">
                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                      Écart
                    </span>
                    <span className="block mt-0.5 text-sm font-black text-slate-500">
                      {ecart}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3c0038] mb-1">
                    Nouveau solde (en jours entiers)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Exemple: 20"
                    value={nouveauSolde}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setNouveauSolde(val);
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#3c0038] mb-1">
                    Justification / Motif
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Rectification suite à un oubli..."
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={actionEnCours}
                    className="w-full rounded-xl bg-[#800038] py-2.5 text-xs font-extrabold text-white transition hover:bg-[#3c0038] shadow-sm disabled:opacity-50"
                  >
                    {actionEnCours ? "Traitement..." : "Valider la régularisation"}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}