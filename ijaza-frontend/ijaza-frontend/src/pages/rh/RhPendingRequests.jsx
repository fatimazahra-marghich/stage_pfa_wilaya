import { useEffect, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

export default function RhPendingRequests() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [commentaire, setCommentaire] = useState({});
  const [actionEnCours, setActionEnCours] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Récupération sécurisée de l'utilisateur connecté
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user.id || user.pk);
      }
    } catch (e) {
      console.error("Erreur lecture utilisateur :", e);
    }

    chargerDemandesRH();
  }, []);

  const chargerDemandesRH = async () => {
    setChargement(true);
    try {
      const { data } = await api.get("/demandes/");
      const liste = data.results ?? data ?? [];
      
      // Filtre : Demandes en attente de la décision RH
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
      
      // Suppression fluide de la demande validée/refusée de la liste
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      alert(`Demande ${decision === "REFUSE" ? "refusée" : "validée"} avec succès.`);
    } catch (err) {
      console.error("Erreur de traitement RH :", err);
      const msg = err.response?.data?.error || err.response?.data?.detail || "Impossible de traiter cette demande.";
      alert(`Erreur : ${msg}`);
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Moderne */}
        <header className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Ressources Humaines</span>
            <span>·</span>
            <span className="text-[#93003f]">Validation Définitive</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
            Demandes de Congé en Attente RH
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Examinez et donnez votre approbation finale pour les demandes pré-approuvées ou soumises directement.
          </p>
        </header>

        {/* Liste des demandes */}
        {chargement ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400">
            Chargement des demandes RH...
          </div>
        ) : demandes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <Icone d={I.check} className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-[#3c0038]">Toutes les demandes ont été traitées !</p>
            <p className="mt-1 text-xs text-slate-400">Aucune attente de validation RH pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {demandes.map((d) => {
              const u = d.utilisateur_details || d.utilisateur || {};
              const nomAgent = typeof u === "object"
                ? (u.nom_complet || `${u.first_name || u.prenom || ''} ${u.last_name || u.nom || ''}`.trim())
                : d.utilisateur_nom || `Agent #${d.utilisateur}`;

              const estMaDemande = (typeof u === "object" ? u.id : u) === currentUserId;

              return (
                <div
                  key={d.id}
                  className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md space-y-4 ${
                    estMaDemande 
                      ? "border-[#93003f]/40 bg-gradient-to-r from-rose-50/30 to-transparent" 
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-bold text-[#3c0038]">{nomAgent}</h2>
                        {estMaDemande && (
                          <span className="rounded-full bg-[#93003f]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#93003f]">
                            Ma propre demande
                          </span>
                        )}
                        <StatutBadge statut={d.statut} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#93003f]">
                        {d.type_conge_libelle || "Congé"} — <span className="font-bold">{d.nombre_jours} jour(s)</span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3.5 py-2 text-right border border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Période</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        Du {d.date_debut} au {d.date_fin}
                      </p>
                    </div>
                  </div>

                  {/* Champ de remarque / motif */}
                  <div>
                    <input
                      type="text"
                      placeholder="Remarque RH ou motif obligatoire en cas de refus..."
                      value={commentaire[d.id] || ""}
                      onChange={(e) =>
                        setCommentaire({ ...commentaire, [d.id]: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none transition focus:border-[#0097ff] focus:ring-1 focus:ring-[#0097ff]"
                    />
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      disabled={actionEnCours === d.id}
                      onClick={() => handleDecision(d.id, "REFUSE")}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      {actionEnCours === d.id ? "Traitement..." : "Refuser"}
                    </button>
                    
                    <button
                      disabled={actionEnCours === d.id}
                      onClick={() => handleDecision(d.id, "VALIDE")}
                      className="rounded-xl bg-[#3c0038] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#93003f] disabled:opacity-50"
                    >
                      {actionEnCours === d.id ? "Traitement..." : "Validation Définitive"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}