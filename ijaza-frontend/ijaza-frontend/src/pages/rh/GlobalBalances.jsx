import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function GlobalBalances() {
  const [divisions, setDivisions] = useState([]);
  const [filtreDivision, setFiltreDivision] = useState(null);
  const [fonctionnaires, setFonctionnaires] = useState([]);
  const [chargement, setChargement] = useState(true);

  // État pour le modal de régularisation du solde
  const [agentSelectionne, setAgentSelectionne] = useState(null);
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motif, setMotif] = useState("");

  // Chargement des divisions pour le filtre
  useEffect(() => {
    api
      .get("/divisions/")
      .then(({ data }) => setDivisions(data.results ?? data))
      .catch((err) => console.error("Erreur de chargement des divisions:", err));
  }, []);

  // Chargement des soldes (Remplace /fonctionnaires/ qui renvoyait une 404)
  const chargerFonctionnaires = () => {
    setChargement(true);
    const params = filtreDivision ? { division: filtreDivision } : {};

    api
      .get("/soldes/", { params })
      .then(({ data }) => {
        const listeSoldes = data.results ?? data;

        // Adaptation des données reçues depuis l'endpoint /soldes/
        const adaptes = listeSoldes.map((s) => {
          const utilisateur = s.utilisateur_details || s.utilisateur || {};
          const soldeCalcule =
            s.solde_actuel ??
            ((s.droits_acquis || 0) + (s.jours_reportes || 0) - (s.jours_consommes || 0));

          return {
            id_solde: s.id,
            id_user: typeof utilisateur === "object" ? utilisateur.id : utilisateur,
            first_name: utilisateur.first_name || s.prenom || "Employé",
            last_name: utilisateur.last_name || s.nom || "",
            matricule: utilisateur.matricule || s.matricule || "N/A",
            service_nom: utilisateur.service_nom || s.service_nom || "N/A",
            division_nom: utilisateur.division_nom || s.division_nom || "N/A",
            bureau_nom: utilisateur.bureau_nom || s.bureau_nom || "N/A",
            solde_actuel: soldeCalcule,
            jours_consommes: s.jours_consommes || 0,
            jours_reportes: s.jours_reportes || 0,
            droits_acquis: s.droits_acquis || 0,
          };
        });

        setFonctionnaires(adaptes);
        setChargement(false);
      })
      .catch((err) => {
        console.error("Erreur lors de la récupération des soldes :", err);
        setChargement(false);
      });
  };

  useEffect(() => {
    chargerFonctionnaires();
  }, [filtreDivision]);

  // Action d'ajustement du solde RH
  const handleAjuster = async (e) => {
    e.preventDefault();
    if (!agentSelectionne || nouveauSolde === "" || !motif) return;

    try {
      // Nouveaux droits acquis = Solde désiré + Jours consommés - Jours reportés
      const nouveauxDroitsAcquis =
        parseFloat(nouveauSolde) +
        agentSelectionne.jours_consommes -
        agentSelectionne.jours_reportes;

      await api.patch(`/soldes/${agentSelectionne.id_solde}/`, {
        droits_acquis: nouveauxDroitsAcquis,
      });

      alert("Solde régularisé avec succès !");
      setAgentSelectionne(null);
      setNouveauSolde("");
      setMotif("");
      chargerFonctionnaires();
    } catch (err) {
      console.error("Erreur lors de la régularisation :", err);
      alert("Impossible de modifier le solde.");
    }
  };

  // Export CSV
  const exporterCSV = () => {
    const entetes = ["Nom", "Prenom", "Matricule", "Service", "Division", "Bureau", "Solde Actuel"];
    const lignes = fonctionnaires.map((f) => [
      f.last_name,
      f.first_name,
      f.matricule,
      f.service_nom,
      f.division_nom,
      f.bureau_nom,
      f.solde_actuel,
    ]);

    const contenu = [entetes, ...lignes].map((e) => e.join(",")).join("\n");
    const blob = new Blob([contenu], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `soldes_conges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Vue globale des soldes</h1>
          <p className="text-neutral-500">Filtrable par Division, Service ou Bureau.</p>
        </div>
        <button
          onClick={exporterCSV}
          className="rounded-xl border border-black px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
        >
          Exporter (CSV)
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltreDivision(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium border ${
            filtreDivision === null
              ? "bg-[#E91E8C] text-white border-[#E91E8C]"
              : "border-black text-black hover:bg-neutral-50"
          }`}
        >
          Toutes Divisions
        </button>
        {divisions.map((d) => (
          <button
            key={d.id}
            onClick={() => setFiltreDivision(d.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${
              filtreDivision === d.id
                ? "bg-[#E91E8C] text-white border-[#E91E8C]"
                : "border-black text-black hover:bg-neutral-50"
            }`}
          >
            {d.nom}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th className="px-6 py-4">Employé</th>
              <th className="px-6 py-4">Service / Division</th>
              <th className="px-6 py-4">Solde actuel (jours)</th>
              <th className="px-6 py-4">Bureau</th>
              <th className="px-6 py-4 text-right">Action RH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {chargement ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                  Chargement...
                </td>
              </tr>
            ) : fonctionnaires.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                  Aucun solde trouvé.
                </td>
              </tr>
            ) : (
              fonctionnaires.map((f) => (
                <tr key={f.id_solde}>
                  <td className="px-6 py-4">
                    <p className="font-semibold">
                      {f.first_name} {f.last_name}
                    </p>
                    <p className="text-xs text-neutral-400">Matricule: {f.matricule}</p>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {f.service_nom} — {f.division_nom}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-lg px-3 py-1 font-semibold ${
                        f.solde_actuel < 5
                          ? "bg-red-50 text-red-600"
                          : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {f.solde_actuel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{f.bureau_nom}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setAgentSelectionne(f);
                        setNouveauSolde(f.solde_actuel);
                      }}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50"
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

      {/* Modal d'Ajustement RH */}
      {agentSelectionne && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-xl font-bold">Régularisation du solde</h2>
            <p className="text-sm text-neutral-500">
              Agent :{" "}
              <span className="font-semibold text-black">
                {agentSelectionne.first_name} {agentSelectionne.last_name}
              </span>
            </p>

            <form onSubmit={handleAjuster} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Nouveau Solde (Jours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={nouveauSolde}
                  onChange={(e) => setNouveauSolde(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Motif de la régularisation
                </label>
                <textarea
                  rows="3"
                  placeholder="Ex : Réajustement suite à régularisation annuelle..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAgentSelectionne(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E91E8C] text-white text-sm font-semibold hover:bg-[#c81879]"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}