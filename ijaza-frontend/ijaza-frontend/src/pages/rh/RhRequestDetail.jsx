import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

export default function RhRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [actionEnCours, setActionEnCours] = useState(false);

  useEffect(() => {
    chargerDemande();
  }, [id]);

  async function chargerDemande() {
    setChargement(true);
    try {
      const { data } = await api.get(`/demandes/${id}/`);
      setDemande(data);
    } catch (err) {
      console.error("Erreur de chargement du détail :", err);
    } finally {
      setChargement(false);
    }
  }

  async function traiterAction(action) {
    if (action === "REFUSE" && !commentaire.trim()) {
      alert("Le motif du refus est obligatoire.");
      return;
    }

    setActionEnCours(true);
    try {
      let endpoint = `/demandes/${id}/valider/`;
      if (action === "REFUSE") endpoint = `/demandes/${id}/refuser/`;

      await api.post(endpoint, { commentaire });
      alert(`Action exécutée avec succès.`);
      navigate("/rh/dashboard");
    } catch (err) {
      console.error("Erreur lors de l'action RH :", err);
      alert("Impossible d'exécuter cette action.");
    } finally {
      setActionEnCours(false);
    }
  }

  if (chargement) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!demande) {
    return (
      <MainLayout>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Demande introuvable.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-xl bg-[#3c0038] px-4 py-2 text-xs font-bold text-white"
          >
            Retour
          </button>
        </div>
      </MainLayout>
    );
  }

  const u = demande.utilisateur_details || demande.utilisateur || {};
  const nomAgent = u.nom_complet || `${u.first_name || ""} ${u.last_name || ""}`.trim() || `Agent #${demande.utilisateur}`;

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#3c0038]"
          >
            ← Retour à la liste
          </button>
          <StatutBadge statut={demande.statut} />
        </div>

        {/* Info Employé */}
        <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3c0038] font-bold text-white">
              {nomAgent.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#3c0038]">{nomAgent}</h1>
              <p className="text-xs text-slate-500">
                Matricule: <span className="font-semibold">{u.matricule || "N/A"}</span> · Service:{" "}
                <span className="font-semibold">{u.service_nom || "N/A"}</span> · Division:{" "}
                <span className="font-semibold">{u.division_nom || "N/A"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Détails du congé */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#93003f]">
              Détails de la demande
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Type de congé:</span> <strong className="text-[#3c0038]">{demande.type_conge_libelle}</strong></p>
              <p><span className="text-slate-400">Période:</span> Du <strong>{demande.date_debut}</strong> au <strong>{demande.date_fin}</strong></p>
              <p><span className="text-slate-400">Durée totale:</span> <strong>{demande.nombre_jours} jour(s)</strong></p>
              <p><span className="text-slate-400">Date de demande:</span> {new Date(demande.date_creation || Date.now()).toLocaleDateString("fr-FR")}</p>
            </div>

            {demande.motif && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                <span className="font-bold block mb-1">Motif de l'employé :</span>
                {demande.motif}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#93003f]">
              Justificatifs & Validation
            </h2>

            {/* Fichier joint s'il existe */}
            {demande.piece_jointe ? (
              <a
                href={demande.piece_jointe}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#00efff]/50 bg-cyan-50/30 p-3 text-xs font-bold text-[#0097ff] hover:underline"
              >
                📎 Consulter la pièce jointe / Certificat
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic">Aucune pièce jointe transmise.</p>
            )}

            {/* Remarque du Chef de Service */}
            {demande.commentaire_chef && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs">
                <span className="font-bold text-amber-900 block">Avis du Chef de Service :</span>
                <p className="text-amber-800">{demande.commentaire_chef}</p>
              </div>
            )}
          </div>
        </div>

        {/* Zone d'action RH */}
        {(demande.statut === "EN_ATTENTE_RH" || demande.statut === "EN_ATTENTE_NIVEAU2") && (
          <div className="rounded-2xl border border-[#00efff]/40 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#3c0038]">Décision Ressources Humaines</h2>
            <textarea
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Remarque RH ou motif de refus (obligatoire en cas de refus)..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0097ff]"
            />

            <div className="flex justify-end gap-3">
              <button
                disabled={actionEnCours}
                onClick={() => traiterAction("REFUSE")}
                className="rounded-xl border border-rose-300 px-5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Refuser la demande
              </button>
              <button
                disabled={actionEnCours}
                onClick={() => traiterAction("VALIDE")}
                className="rounded-xl bg-[#93003f] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3c0038]"
              >
                Valider Définitivement
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}