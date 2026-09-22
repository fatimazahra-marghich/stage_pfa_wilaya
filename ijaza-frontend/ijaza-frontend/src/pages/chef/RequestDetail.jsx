import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

/* ------------------------------------------------------------------ */
/* Palette du projet                                                   */
/*   #3c0038 prune · #93003f bordeaux · #0097ff bleu                   */
/*   #00efff cyan  · #e7ffff cyan pâle                                 */
/* ------------------------------------------------------------------ */

function sePeuventChevaucher(d1, f1, d2, f2) {
  if (!d1 || !f1 || !d2 || !f2) return false;
  return new Date(d1) <= new Date(f2) && new Date(d2) <= new Date(f1);
}

function nomComplet(x) {
  if (!x) return "Agent Inconnu";
  const u = x.utilisateur_details || x;
  if (u && (u.nom_complet || u.first_name || u.last_name)) {
    return (
      u.nom_complet ||
      `${u.first_name || u.prenom || ""} ${u.last_name || u.nom || ""}`.trim()
    );
  }
  return x.utilisateur_nom || `Agent #${x.utilisateur || x.id}`;
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [chevauchements, setChevauchements] = useState([]);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        const { data: d } = await api.get(`/demandes/${id}/`);
        if (Number(d.nombre_jours) <= 0) {
        setErreur("Cette demande est invalide (durée de 0 jour).");
        return;
      }
        setDemande(d);

        // Récupérer les demandes de l'équipe pour vérifier les chevauchements
        const { data: equipe } = await api.get("/demandes/");
        const liste = equipe.results ?? equipe ?? [];
        
        const autres = liste.filter(
          (autre) =>
            autre.id !== d.id &&
            (autre.statut === "VALIDE" || autre.statut === "VALIDEE") &&
            sePeuventChevaucher(
              d.date_debut,
              d.date_fin,
              autre.date_debut,
              autre.date_fin
            )
        );
        setChevauchements(autres);
      } catch (err) {
        console.error("Erreur de chargement du détail :", err);
        setErreur("Impossible de charger le détail de cette demande.");
      }
    }
    if (id) charger();
  }, [id]);

  async function traiter(decision) {
    const estRefus = decision.startsWith("REFUS");
    if (estRefus && !commentaire.trim()) {
      alert("Un commentaire est obligatoire en cas de refus.");
      return;
    }
    setEnvoi(true);
    try {
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

  // Écran de chargement corrigé (MainLayout au lieu de Layout)
  if (!demande && !erreur) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-slate-400">
              Chargement des détails de la demande...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (erreur) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            <p className="font-bold">{erreur}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const estEnAttente =
    demande.statut === "EN_ATTENTE_CHEF" ||
    demande.statut === "EN_ATTENTE_NIVEAU1" ||
    demande.statut === "EN_ATTENTE";

  const nom = nomComplet(demande);
  const idUtilisateur = demande.utilisateur?.id || demande.utilisateur;
  const typeCongeLibelle =
    demande.type_conge_libelle ||
    demande.type_conge_details?.libelle ||
    demande.type_conge_code ||
    demande.type_conge ||
    "Congé";

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-[#93003f]"
        >
          <Icone d={I.retour} className="h-4 w-4" />
          Retour aux demandes
        </button>

        {/* En-tête */}
        <header className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Dossier d&apos;instruction
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Demande #{demande.id}
            </h1>
          </div>
          <StatutBadge statut={demande.statut} />
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Identité du demandeur */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#e7ffff] text-lg font-bold text-[#93003f]">
                    {nom[0] ? nom[0].toUpperCase() : "A"}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[#3c0038]">{nom}</p>
                    <p className="text-xs text-slate-400">Agent demandeur</p>
                  </div>
                </div>
              </div>

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Type de congé
                  </dt>
                  <dd className="font-semibold text-[#93003f]">
                    {typeCongeLibelle}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Motif
                  </dt>
                  <dd className="font-medium text-slate-700">
                    {demande.motif || "—"}
                  </dd>
                </div>
                {demande.piece_jointe && (
                  <div>
                    <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Pièce jointe
                    </dt>
                    <dd>
                      <a
                        href={demande.piece_jointe}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0097ff] hover:underline"
                      >
                        <Icone d={I.document} className="h-4 w-4" />
                        Consulter le justificatif
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Bouton d'accès à l'historique complet de l'agent */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/chef/agents/${idUtilisateur}/historique`)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00efff]/40 bg-[#e7ffff]/50 py-2.5 text-xs font-bold text-[#0097ff] transition hover:bg-[#0097ff] hover:text-white"
              >
                <Icone d={I.historique} className="h-4 w-4" />
                Consulter l'historique de l'agent
              </button>
            </div>
          </div>

          {/* Informations du congé */}
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-[#3c0038]">Informations du congé</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Date de départ
                </p>
                <p className="font-medium text-slate-700">{demande.date_debut}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Date de retour
                </p>
                <p className="font-medium text-slate-700">{demande.date_fin}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#e7ffff] px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#0097ff]">
                <Icone d={I.horloge} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Durée demandée
                </p>
                <p className="font-bold text-[#93003f]">
                  {demande.nombre_jours} jour{demande.nombre_jours > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Impact sur l'équipe */}
        {chevauchements.length > 0 && (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-[#3c0038]">Impact sur l&apos;équipe</h2>
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Icone d={I.alerte} className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Chevauchement détecté
                </p>
                <p className="text-sm text-amber-700">
                  {chevauchements.length} autre
                  {chevauchements.length > 1 ? "s" : ""} membre
                  {chevauchements.length > 1 ? "s" : ""} de l&apos;équipe
                  {chevauchements.length > 1 ? " sont" : " est"} déjà en congé sur
                  cette période.
                </p>
              </div>
            </div>
            <div className="divide-y divide-[#00efff]/20">
              {chevauchements.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="font-medium text-[#3c0038]">{nomComplet(c)}</span>
                  <span className="text-slate-500">
                    {c.date_debut} → {c.date_fin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Décision */}
        {estEnAttente && (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-[#3c0038]">
              Décision du chef de service
            </h2>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Commentaire (obligatoire en cas de refus)..."
              rows={2}
              className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={envoi}
                onClick={() => traiter("VALIDEE")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#93003f] py-3 font-semibold text-white transition hover:bg-[#3c0038] disabled:opacity-50"
              >
                <Icone d={I.valide} className="h-4 w-4" />
                Valider la demande
              </button>
              <button
                disabled={envoi}
                onClick={() => traiter("REFUSEE")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              >
                <Icone d={I.refuser} className="h-4 w-4" />
                Refuser
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}