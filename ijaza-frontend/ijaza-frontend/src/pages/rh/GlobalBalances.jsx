import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

export default function GlobalBalances() {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [bureaux, setBureaux] = useState([]);

  // Filtres
  const [filtreDivision, setFiltreDivision] = useState("");
  const [filtreService, setFiltreService] = useState("");
  const [filtreBureau, setFiltreBureau] = useState("");
  const [recherche, setRecherche] = useState("");

  const [fonctionnaires, setFonctionnaires] = useState([]);
  const [chargement, setChargement] = useState(true);

  // État pour le modal de régularisation
  const [agentSelectionne, setAgentSelectionne] = useState(null);
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motif, setMotif] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);

  useEffect(() => {
    chargerStructureEtSoldes();
  }, []);

  async function chargerStructureEtSoldes() {
    setChargement(true);
    try {
      const [resDivs, resServs, resBurs, resSoldes] = await Promise.all([
        api.get("/divisions/").catch(() => ({ data: [] })),
        api.get("/services/").catch(() => ({ data: [] })),
        api.get("/bureaux/").catch(() => ({ data: [] })),
        api.get("/soldes/").catch(() => ({ data: [] })),
      ]);

      setDivisions(resDivs.data?.results ?? resDivs.data ?? []);
      setServices(resServs.data?.results ?? resServs.data ?? []);
      setBureaux(resBurs.data?.results ?? resBurs.data ?? []);

      const listeSoldes = resSoldes.data?.results ?? resSoldes.data ?? [];
      
      const adaptes = listeSoldes.map((s) => {
        const u = s.utilisateur_details || s.utilisateur || {};
        const soldeCalcule =
          s.solde_actuel ??
          ((s.droits_acquis || 0) + (s.jours_reportes || 0) - (s.jours_consommes || 0));

        return {
          id_solde: s.id,
          id_user: typeof u === "object" ? u.id : u,
          first_name: u.first_name || s.prenom || "Employé",
          last_name: u.last_name || s.nom || "",
          nom_complet: u.nom_complet || `${u.first_name || s.prenom || ''} ${u.last_name || s.nom || ''}`.trim(),
          matricule: u.matricule || s.matricule || "N/A",
          id_division: u.division || s.division,
          id_service: u.service || s.service,
          id_bureau: u.bureau || s.bureau,
          service_nom: u.service_nom || s.service_nom || "N/A",
          division_nom: u.division_nom || s.division_nom || "N/A",
          bureau_nom: u.bureau_nom || s.bureau_nom || "N/A",
          solde_actuel: soldeCalcule,
          jours_consommes: s.jours_consommes || 0,
          jours_reportes: s.jours_reportes || 0,
          droits_acquis: s.droits_acquis || 0,
        };
      });

      setFonctionnaires(adaptes);
    } catch (err) {
      console.error("Erreur de chargement des soldes :", err);
    } finally {
      setChargement(false);
    }
  }

  // Filtrage combiné (Division, Service, Bureau, Recherche texte)
  const fonctionnairesFiltres = useMemo(() => {
    return fonctionnaires.filter((f) => {
      if (filtreDivision && String(f.id_division) !== String(filtreDivision)) return false;
      if (filtreService && String(f.id_service) !== String(filtreService)) return false;
      if (filtreBureau && String(f.id_bureau) !== String(filtreBureau)) return false;

      if (recherche) {
        const q = recherche.toLowerCase();
        const matchNom = f.nom_complet.toLowerCase().includes(q);
        const matchMatricule = f.matricule.toLowerCase().includes(q);
        if (!matchNom && !matchMatricule) return false;
      }
      return true;
    });
  }, [fonctionnaires, filtreDivision, filtreService, filtreBureau, recherche]);

  // Action d'ajustement du solde RH
  const handleAjuster = async (e) => {
    e.preventDefault();
    if (!agentSelectionne || nouveauSolde === "" || !motif) return;

    setActionEnCours(true);
    try {
      const nouveauxDroitsAcquis =
        parseFloat(nouveauSolde) +
        agentSelectionne.jours_consommes -
        agentSelectionne.jours_reportes;

      await api.patch(`/soldes/${agentSelectionne.id_solde}/`, {
        droits_acquis: nouveauxDroitsAcquis,
        motif_regularisation: motif,
      });

      alert("Solde régularisé avec succès !");
      setAgentSelectionne(null);
      setNouveauSolde("");
      setMotif("");
      chargerStructureEtSoldes();
    } catch (err) {
      console.error("Erreur lors de la régularisation :", err);
      alert("Impossible de modifier le solde.");
    } finally {
      setActionEnCours(false);
    }
  };

  // Export CSV
  const exporterCSV = () => {
    const entetes = ["Nom complet", "Matricule", "Division", "Service", "Bureau", "Solde Actuel (Jours)"];
    const lignes = fonctionnairesFiltres.map((f) => [
      `"${f.nom_complet}"`,
      `"${f.matricule}"`,
      `"${f.division_nom}"`,
      `"${f.service_nom}"`,
      `"${f.bureau_nom}"`,
      f.solde_actuel,
    ]);

    const contenu = [entetes.join(","), ...lignes.map((e) => e.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + contenu], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `soldes_conges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Gestion des Ressources Humaines</span>
              <span>·</span>
              <span className="text-[#93003f]">Soldes des Agents</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Vue Globale & Régularisation des Soldes
            </h1>
          </div>

          <button
            onClick={exporterCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-[#3c0038]"
          >
            <Icone d={I.telecharger} className="h-4 w-4 text-[#0097ff]" />
            Exporter (CSV)
          </button>
        </header>

        {/* Barre de Filtres par Structure */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {/* Filter Division */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Division</label>
            <select
              value={filtreDivision}
              onChange={(e) => {
                setFiltreDivision(e.target.value);
                setFiltreService("");
                setFiltreBureau("");
              }}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Toutes les divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.nom || d.libelle}</option>
              ))}
            </select>
          </div>

          {/* Filter Service */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Service</label>
            <select
              value={filtreService}
              onChange={(e) => {
                setFiltreService(e.target.value);
                setFiltreBureau("");
              }}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Tous les services</option>
              {services
                .filter((s) => !filtreDivision || String(s.division) === String(filtreDivision))
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.nom || s.libelle}</option>
                ))}
            </select>
          </div>

          {/* Filter Bureau */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Bureau</label>
            <select
              value={filtreBureau}
              onChange={(e) => setFiltreBureau(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0097ff]"
            >
              <option value="">Tous les bureaux</option>
              {bureaux
                .filter((b) => !filtreService || String(b.service) === String(filtreService))
                .map((b) => (
                  <option key={b.id} value={b.id}>{b.nom || b.libelle}</option>
                ))}
            </select>
          </div>

          {/* Recherche agent */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Recherche</label>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom ou matricule..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#0097ff]"
            />
          </div>
        </div>

        {/* Tableau des soldes */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase text-slate-400 border-b border-slate-200">
              <tr>
                <th className="p-4">Employé</th>
                <th className="p-4">Structure (Div / Serv / Bur)</th>
                <th className="p-4 text-center">Solde Actuel</th>
                <th className="p-4 text-center">Consommés</th>
                <th className="p-4 text-right">Action RH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chargement ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Chargement des données...
                  </td>
                </tr>
              ) : fonctionnairesFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Aucun solde trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                fonctionnairesFiltres.map((f) => (
                  <tr key={f.id_solde} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <p className="font-bold text-[#3c0038]">{f.nom_complet}</p>
                      <p className="text-[11px] text-slate-400">Matricule : {f.matricule}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{f.service_nom}</span>
                      <span className="block text-[11px] text-slate-400">
                        {f.division_nom} • {f.bureau_nom}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block rounded-lg px-3 py-1 font-bold ${
                          f.solde_actuel < 5
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
                          setNouveauSolde(f.solde_actuel);
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

        {/* Modal de Régularisation RH */}
        {agentSelectionne && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-[#3c0038]">
                  Régularisation du solde
                </h3>
                <button
                  onClick={() => setAgentSelectionne(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Agent : <strong className="text-[#3c0038]">{agentSelectionne.nom_complet}</strong> (Matricule : {agentSelectionne.matricule})
              </p>

              <form onSubmit={handleAjuster} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nouveau Solde Total (en Jours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={nouveauSolde}
                    onChange={(e) => setNouveauSolde(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#0097ff]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Motif obligatoire
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex : Régularisation annuelle, correction erreur de saisie..."
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#0097ff]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAgentSelectionne(null)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={actionEnCours}
                    className="rounded-xl bg-[#93003f] px-4 py-2 text-xs font-bold text-white hover:bg-[#3c0038]"
                  >
                    Valider le réajustement
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