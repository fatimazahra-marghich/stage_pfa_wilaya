import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import StatutBadge from "../../components/StatutBadge";

function sePeuventChevaucher(d1, f1, d2, f2) {
  return new Date(d1) <= new Date(f2) && new Date(d2) <= new Date(f1);
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [chevauchements, setChevauchements] = useState([]);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    async function charger() {
      try {
        // ✅ Corrected endpoints without /conges/
        const { data: d } = await api.get(`/demandes/${id}/`);
        setDemande(d);

        const { data: equipe } = await api.get("/demandes/");
        const liste = equipe.results ?? equipe;
        const autres = liste.filter(
          (autre) =>
            autre.id !== d.id &&
            autre.statut === "VALIDE" &&
            sePeuventChevaucher(d.date_debut, d.date_fin, autre.date_debut, autre.date_fin)
        );
        setChevauchements(autres);
      } catch (err) {
        console.error("Erreur de chargement du détail :", err);
      }
    }
    charger();
  }, [id]);

  async function traiter(decision) {
    const estRefus = decision.startsWith("REFUS");

    if (estRefus && !commentaire.trim()) {
      alert("Un commentaire est obligatoire en cas de refus.");
      return;
    }

    setEnvoi(true);

    try {
      // ✅ Corrected endpoints without /conges/
      const endpoint = estRefus
        ? `/demandes/${id}/refuser/`
        : `/demandes/${id}/valider/`;

      await api.post(endpoint, { commentaire });

      alert("Décision enregistrée avec succès !");
      navigate(-1);
    } catch (err) {
      console.error("Erreur lors du traitement de la demande :", err);
      alert("Une erreur est survenue lors de l'enregistrement de votre décision.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!demande) {
    return (
      <Layout>
        <p className="text-neutral-400">Chargement de la demande...</p>
      </Layout>
    );
  }

  const estEnAttente =
    demande.statut === "EN_ATTENTE_CHEF" || demande.statut === "EN_ATTENTE_NIVEAU1" || demande.statut === "EN_ATTENTE";

  const userDetails = demande.utilisateur_details;
  const nomAffichage = userDetails
    ? (userDetails.nom_complet || `${userDetails.first_name || userDetails.prenom || ''} ${userDetails.last_name || userDetails.nom || ''}`.trim())
    : demande.utilisateur_nom || `Employé #${demande.utilisateur}`;

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-neutral-500 hover:text-black mb-4 transition-colors"
      >
        ← Retour aux demandes
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Détail de la demande #{demande.id}</h1>
        <StatutBadge statut={demande.statut} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-lg text-neutral-600">
              {nomAffichage[0] ? nomAffichage[0].toUpperCase() : "E"}
            </div>
            <div>
              <p className="font-semibold text-lg">{nomAffichage}</p>
            </div>
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-neutral-400 uppercase text-xs mb-1">Type de congé</dt>
              <dd className="font-medium text-[#E91E8C]">{demande.type_conge_libelle}</dd>
            </div>
            <div>
              <dt className="text-neutral-400 uppercase text-xs mb-1">Motif</dt>
              <dd className="font-medium">{demande.motif || "—"}</dd>
            </div>
            {demande.piece_jointe && (
              <div>
                <dt className="text-neutral-400 uppercase text-xs mb-1">Pièce jointe</dt>
                <dd>
                  <a
                    href={demande.piece_jointe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E91E8C] font-semibold hover:underline"
                  >
                    📎 Consulter le justificatif
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
          <h2 className="font-bold mb-4">Informations du congé</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-400 uppercase text-xs mb-1">Date de départ</p>
              <p className="font-medium">{demande.date_debut}</p>
            </div>
            <div>
              <p className="text-neutral-400 uppercase text-xs mb-1">Date de retour</p>
              <p className="font-medium">{demande.date_fin}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-neutral-400 uppercase text-xs mb-1">Durée demandée</p>
            <p className="font-semibold text-[#E91E8C]">
              {demande.nombre_jours} jours
            </p>
          </div>
        </div>
      </div>

      {chevauchements.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6 mb-6">
          <h2 className="font-bold mb-4">Impact sur l'équipe</h2>
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-red-700 mb-1">⚠ Chevauchement détecté</p>
            <p className="text-sm text-red-600">
              {chevauchements.length} autre{chevauchements.length > 1 ? "s" : ""} membre
              {chevauchements.length > 1 ? "s" : ""} de l'équipe est déjà en congé sur cette période.
            </p>
          </div>
          <div className="divide-y divide-black/5">
            {chevauchements.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">
                  {c.utilisateur_details?.nom_complet || c.utilisateur_nom || `Employé #${c.utilisateur}`}
                </span>
                <span className="text-neutral-500">
                  {c.date_debut} — {c.date_fin}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {estEnAttente && (
        <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
          <h2 className="font-bold mb-4">Décision du Chef de service</h2>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Commentaire (obligatoire en cas de refus)..."
            rows={2}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm mb-4 outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
          />
          <div className="flex gap-3">
            <button
              disabled={envoi}
              onClick={() => traiter("VALIDEE")}
              className="flex-1 rounded-xl bg-[#E91E8C] text-white font-semibold py-3 hover:bg-[#c81879] transition-colors disabled:opacity-50"
            >
              Valider la demande
            </button>
            <button
              disabled={envoi}
              onClick={() => traiter("REFUSEE")}
              className="flex-1 rounded-xl border border-black font-semibold py-3 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}