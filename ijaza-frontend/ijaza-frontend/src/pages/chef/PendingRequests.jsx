import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function PendingRequests() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setChargement(true);
    try {
      const { data } = await api.get("/conges/demandes/");
      const liste = data.results ?? data;
      // Filtrer les demandes en attente de validation
      const enAttente = liste.filter(
        (d) => d.statut === "EN_ATTENTE_CHEF" || d.statut === "EN_ATTENTE_NIVEAU1"
      );
      setDemandes(enAttente);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function traiter(id, decision) {
    let commentaire = "";
    if (decision === "REFUSEE" || decision === "REFUSE") {
      commentaire = window.prompt("Motif du refus (obligatoire) :") ?? "";
      if (!commentaire.trim()) return;
    }

    const statutFinal = decision.startsWith("REFUS") ? "REFUSEE" : "VALIDEE";

    try {
      // 1. Enregistrer l'étape de validation dans Django
      await api.post("/conges/etapes-validation/", {
        demande: id,
        statut: statutFinal,
        commentaire: commentaire,
      });

      // 2. Mettre à jour le statut de la demande
      await api.patch(`/conges/demandes/${id}/`, {
        statut: statutFinal,
      });

      charger();
    } catch (err) {
      console.error("Erreur lors de la validation :", err);
      alert("Une erreur est survenue lors du traitement.");
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-1">Demandes en attente</h1>
      <p className="text-neutral-500 mb-8">
        {demandes.length} demande{demandes.length > 1 ? "s" : ""} nécessite
        {demandes.length > 1 ? "nt" : ""} votre attention.
      </p>

      {chargement ? (
        <p className="text-neutral-400">Chargement...</p>
      ) : (
        <div className="space-y-4">
          {demandes.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-black/10 bg-white shadow-sm p-5 flex items-center justify-between"
            >
              <Link to={`/chef/demandes/${d.id}`} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                  {d.utilisateur_nom ? d.utilisateur_nom[0] : "E"}
                </div>
                <div>
                  <p className="font-semibold hover:text-[#E91E8C]">
                    {d.utilisateur_nom || `Employé #${d.utilisateur}`}
                  </p>
                  <p className="text-sm text-neutral-500">{d.type_conge_libelle}</p>
                </div>
              </Link>

              <div className="text-sm text-neutral-600">
                <p className="font-medium">
                  {d.date_debut} — {d.date_fin}
                </p>
                <p className="text-neutral-400">{d.nombre_jours} jours</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => traiter(d.id, "REFUSEE")}
                  className="rounded-xl border border-black px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
                >
                  Refuser
                </button>
                <button
                  onClick={() => traiter(d.id, "VALIDEE")}
                  className="rounded-xl bg-[#E91E8C] text-white px-5 py-2 text-sm font-semibold hover:bg-[#c81879]"
                >
                  Valider
                </button>
              </div>
            </div>
          ))}
          {demandes.length === 0 && (
            <p className="text-neutral-400 text-center py-12">
              Aucune demande en attente. 🎉
            </p>
          )}
        </div>
      )}
    </Layout>
  );
}