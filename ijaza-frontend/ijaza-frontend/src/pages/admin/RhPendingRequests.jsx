import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import StatutBadge from "../../components/StatutBadge";

export default function RhPendingRequests() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [commentaire, setCommentaire] = useState({});
  const [actionEnCours, setActionEnCours] = useState(null);

  useEffect(() => {
    chargerDemandesRH();
  }, []);

  const chargerDemandesRH = async () => {
    try {
      const { data } = await api.get("/conges/demandes/");
      const liste = data.results ?? data;
      const enAttenteRH = liste.filter((d) => d.statut === "EN_ATTENTE_RH");
      setDemandes(enAttenteRH);
    } catch (err) {
      console.error("Erreur lors de la récupération :", err);
    } finally {
      setChargement(false);
    }
  };

  const handleDecision = async (id, decision) => {
    setActionEnCours(id);
    const statutFinal = decision === "VALIDE" ? "VALIDEE" : "REFUSEE";

    try {
      await api.post("/conges/etapes-validation/", {
        demande: id,
        statut: statutFinal,
        commentaire: commentaire[id] || "",
      });

      await api.patch(`/conges/demandes/${id}/`, {
        statut: statutFinal,
      });

      setDemandes((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Erreur de traitement RH :", err);
      alert("Impossible de traiter cette demande.");
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-1">Validation RH Finale</h1>
      <p className="text-neutral-500 mb-8">
        Demandes pré-approuvées par les chefs de service en attente de décision finale.
      </p>

      {chargement ? (
        <p className="text-neutral-400">Chargement...</p>
      ) : demandes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-8 text-center text-neutral-500">
          Aucune demande en attente de validation RH. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {demandes.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-black/10 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">
                      {d.utilisateur_nom || `Agent #${d.utilisateur}`}
                    </h3>
                    <StatutBadge statut={d.statut} />
                  </div>
                  <p className="text-sm text-[#E91E8C] font-medium mt-1">
                    {d.type_conge_libelle} — {d.nombre_jours} jours
                  </p>
                </div>

                <div className="text-sm text-neutral-600">
                  <p className="font-medium">Du {d.date_debut} au {d.date_fin}</p>
                </div>
              </div>

              <input
                type="text"
                placeholder="Remarque RH (optionnelle)..."
                value={commentaire[d.id] || ""}
                onChange={(e) =>
                  setCommentaire({ ...commentaire, [d.id]: e.target.value })
                }
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={actionEnCours === d.id}
                  onClick={() => handleDecision(d.id, "REFUSE")}
                  className="px-5 py-2 rounded-xl border border-black text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
                >
                  Refuser
                </button>
                <button
                  disabled={actionEnCours === d.id}
                  onClick={() => handleDecision(d.id, "VALIDE")}
                  className="px-5 py-2 rounded-xl bg-[#E91E8C] text-white text-sm font-semibold hover:bg-[#c81879] disabled:opacity-50"
                >
                  Validation Définitive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}