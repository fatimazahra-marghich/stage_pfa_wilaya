import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function PlanningPage() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [moisSelectionne, setMoisSelectionne] = useState(
    new Date().toISOString().slice(0, 7) // Format YYYY-MM
  );

  async function chargerPlanning() {
    setChargement(true);
    try {
      const { data } = await api.get("/demandes-conge/");
      const liste = data.results ?? data;
      // Exclure les demandes refusées du planning
      setDemandes(
        liste.filter(
          (d) => d.statut !== "REFUSEE_RH" && d.statut !== "REFUSEE_CHEF"
        )
      );
    } catch (err) {
      console.error("Erreur de chargement du planning :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerPlanning();
  }, []);

  // Calcul du nombre de jours pour le mois sélectionné
  const [annee, mois] = moisSelectionne.split("-").map(Number);
  const nombreJoursDansMois = new Date(annee, mois, 0).getDate();
  const joursDuMois = Array.from({ length: nombreJoursDansMois }, (_, i) => i + 1);

  // Vérification de présence en congé sur un jour précis
  const estEnConge = (demande, jour) => {
    const dateJour = new Date(annee, mois - 1, jour);
    const debut = new Date(demande.date_debut);
    const fin = new Date(demande.date_fin);
    return dateJour >= debut && dateJour <= fin;
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">Planning Global</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Vue d'ensemble des absences pour l'organisation des services
          </p>
        </div>
        <div>
          <input
            type="month"
            value={moisSelectionne}
            onChange={(e) => setMoisSelectionne(e.target.value)}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold bg-white outline-none focus:border-[#E91E8C]"
          />
        </div>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-neutral-400 font-medium">
          Chargement du planning...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-3 font-bold text-neutral-700 min-w-[180px] sticky left-0 bg-neutral-50 z-10">
                  Agent / Employé
                </th>
                <th className="p-3 font-bold text-neutral-700 min-w-[120px]">Type</th>
                {joursDuMois.map((j) => (
                  <th
                    key={j}
                    className="p-2 text-center border-l border-neutral-200 w-8 font-semibold text-neutral-500"
                  >
                    {j}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {demandes.length === 0 ? (
                <tr>
                  <td
                    colSpan={joursDuMois.length + 2}
                    className="p-8 text-center text-neutral-400 font-medium"
                  >
                    Aucun congé planifié pour ce mois.
                  </td>
                </tr>
              ) : (
                demandes.map((d) => {
                  const nomAgent =
                    d.utilisateur_details?.full_name ||
                    d.utilisateur_details?.username ||
                    `Agent #${d.utilisateur}`;

                  return (
                    <tr key={d.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-bold text-neutral-900 sticky left-0 bg-white z-10 border-r border-neutral-100 shadow-sm">
                        {nomAgent}
                      </td>
                      <td className="p-3 text-neutral-500 font-medium">
                        {d.type_conge_libelle || "Congé"}
                      </td>
                      {joursDuMois.map((j) => {
                        const enConge = estEnConge(d, j);
                        const estValide = d.statut === "VALIDEE";

                        return (
                          <td
                            key={j}
                            className={`p-1 text-center border-l border-neutral-100 ${
                              enConge
                                ? estValide
                                  ? "bg-[#E91E8C] text-white font-bold"
                                  : "bg-amber-300 text-amber-900 font-bold"
                                : ""
                            }`}
                            title={enConge ? `${nomAgent} (${d.statut})` : ""}
                          >
                            {enConge ? "•" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende */}
      <div className="flex items-center gap-6 mt-4 text-xs font-semibold text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#E91E8C] rounded-sm"></span>
          <span>Congé Validé</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-300 rounded-sm"></span>
          <span>En cours de validation</span>
        </div>
      </div>
    </Layout>
  );
}
