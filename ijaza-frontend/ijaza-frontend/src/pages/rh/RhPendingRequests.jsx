import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import StatutBadge from "../../components/StatutBadge";

export default function RhPendingRequests() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [commentaire, setCommentaire] = useState({});
  const [actionEnCours, setActionEnCours] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Récupération de l'utilisateur connecté depuis le localStorage ou votre state global
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(user.id);

    chargerDemandesRH();
  }, []);

  const chargerDemandesRH = async () => {
    try {
      const { data } = await api.get("/demandes/");
      const liste = data.results ?? data;
      const enAttenteRH = liste.filter(
        (d) => d.statut === "EN_ATTENTE_RH" || d.statut === "EN_ATTENTE_NIVEAU2"
      );
      setDemandes(enAttenteRH);
    } catch (err) {
      console.error("Erreur lors de la récupération :", err);
    } finally {
      setChargement(false);
    }
  };

  const handleDecision = async (id, decision) => {
    setActionEnCours(id);
    const motif = commentaire[id] || "";

    if (decision === "REFUSE" && !motif.trim()) {
      alert("Le motif de refus est obligatoire.");
      setActionEnCours(null);
      return;
    }

    try {
      const endpoint =
        decision === "REFUSE"
          ? `/demandes/${id}/refuser/`
          : `/demandes/${id}/valider/`;

      await api.post(endpoint, { commentaire: motif });
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      alert(`Demande ${decision === "REFUSE" ? "refusée" : "validée"} avec succès.`);
    } catch (err) {
      console.error("Erreur de traitement RH :", err);
      const msg = err.response?.data?.error || "Impossible de traiter cette demande.";
      alert(`Erreur : ${msg}`);
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-1">Validation RH Finale</h1>
      <p className="text-neutral-500 mb-8">
        Demandes pré-approuvées par les chefs de service et demandes RH en attente de décision finale.
      </p>

      {chargement ? (
        <p className="text-neutral-400">Chargement...</p>
      ) : demandes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-8 text-center text-neutral-500">
          Aucune demande en attente de validation RH. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {demandes.map((d) => {
            const userDetails = d.utilisateur_details;
            const nomAgent = userDetails
              ? (userDetails.nom_complet || `${userDetails.first_name || userDetails.prenom || ''} ${userDetails.last_name || userDetails.nom || ''}`.trim())
              : d.utilisateur_nom || `Agent #${d.utilisateur}`;

            // Détection si c'est la demande du RH actuellement connecté
            const estMaDemande = d.utilisateur === currentUserId;

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm space-y-4 ${
                  estMaDemande ? "border-[#E91E8C]/50 bg-pink-50/20" : "border-black/10"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">{nomAgent}</h3>
                      {estMaDemande && (
                        <span className="bg-[#E91E8C]/10 text-[#E91E8C] text-xs font-bold px-2.5 py-0.5 rounded-full">
                          Ma demande
                        </span>
                      )}
                      <StatutBadge statut={d.statut} />
                    </div>
                    <p className="text-sm text-[#E91E8C] font-medium mt-1">
                      {d.type_conge_libelle} — {d.nombre_jours} jours
                    </p>
                  </div>

                  <div className="text-sm text-neutral-600">
                    <p className="font-medium">
                      Du {d.date_debut} au {d.date_fin}
                    </p>
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
            );
          })}
        </div>
      )}
    </Layout>
  );
}