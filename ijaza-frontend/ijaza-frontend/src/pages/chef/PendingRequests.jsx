import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

function nomComplet(d) {
  const u = d.utilisateur_details;
  if (u) {
    return (
      u.nom_complet ||
      `${u.first_name || u.prenom || ""} ${u.last_name || u.nom || ""}`.trim()
    );
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur}`;
}

export default function PendingRequests() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("TOUS");

  // État pour la modale de refus
  const [demandeRefus, setDemandeRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreurRefus, setErreurRefus] = useState("");

  async function charger() {
    setChargement(true);
    try {
      const { data } = await api.get("/demandes/");
      const liste = data.results ?? data;
      const enAttente = liste.filter(
        (d) =>
          d.statut === "EN_ATTENTE_CHEF" ||
          d.statut === "EN_ATTENTE_NIVEAU1" ||
          d.statut === "EN_ATTENTE"
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

  const typesDisponibles = useMemo(() => {
    const types = demandes.map((d) => d.type_conge_libelle).filter(Boolean);
    return ["TOUS", ...Array.from(new Set(types))];
  }, [demandes]);

  const demandesFiltrees = useMemo(
    () =>
      demandes.filter((d) => {
        const correspondNom = nomComplet(d)
          .toLowerCase()
          .includes(recherche.toLowerCase());
        const correspondType =
          filtreType === "TOUS" || d.type_conge_libelle === filtreType;
        return correspondNom && correspondType;
      }),
    [demandes, recherche, filtreType]
  );

  const stats = useMemo(() => {
    const totalJours = demandes.reduce(
      (acc, curr) => acc + (Number(curr.nombre_jours) || 0),
      0
    );
    const agentsUniques = new Set(demandes.map((d) => d.utilisateur)).size;
    const maladieAvis = demandes.filter(
      (d) =>
        (d.type_conge_code === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie")) &&
        Number(d.nombre_jours) > 4
    ).length;

    return { total: demandes.length, totalJours, agentsUniques, maladieAvis };
  }, [demandes]);

  // Traitement : Validation simple ou Demande de Contre-Visite
  async function traiterAction(id, action, commentaire = "") {
    try {
      let endpoint = `/demandes/${id}/valider/`;
      let payload = { commentaire };

      if (action === "REFUSE") {
        endpoint = `/demandes/${id}/refuser/`;
      } else if (action === "CONTRE_VISITE") {
        endpoint = `/demandes/${id}/demander-contre-visite/`;
        payload = { commentaire: commentaire || "Demande de contre-visite ordonnée par le Chef de service." };
      }

      await api.post(endpoint, payload);
      setDemandeRefus(null);
      setMotifRefus("");
      charger();
    } catch (err) {
      console.error(`Erreur lors de l'action ${action} :`, err);
      alert("Une erreur est survenue lors du traitement du dossier.");
    }
  }

  function validerRefus() {
    if (!motifRefus.trim()) {
      setErreurRefus("Le motif du refus est obligatoire.");
      return;
    }
    setErreurRefus("");
    traiterAction(demandeRefus.id, "REFUSE", motifRefus);
  }

  const cartesStats = [
    { cle: "total", libelle: "À traiter", valeur: stats.total, icone: I.horloge },
    {
      cle: "agents",
      libelle: "Agents concernés",
      valeur: stats.agentsUniques,
      icone: I.utilisateurs,
    },
    {
      cle: "jours",
      libelle: "Volume demandé",
      valeur: `${stats.totalJours} j`,
      icone: I.calendrier,
      accent: true,
    },
  ];

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* En-tête */}
        <header className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Espace validation</span>
            <span>·</span>
            <span className="text-[#93003f]">Chef de service</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
            Demandes en attente
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Instruction et arbitrage des autorisations d'absence du personnel.
          </p>
        </header>

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cartesStats.map((c) => (
            <div
              key={c.cle}
              className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {c.libelle}
                </p>
                <p
                  className={`mt-1 text-2xl font-extrabold ${
                    c.accent ? "text-[#93003f]" : "text-[#3c0038]"
                  }`}
                >
                  {c.valeur}
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
                <Icone d={c.icone} className="h-5 w-5" />
              </span>
            </div>
          ))}
        </div>

        {/* Recherche & Filtres */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un agent par son nom..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
            />
          </div>
          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/40 px-4 py-2.5 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
          >
            {typesDisponibles.map((t) => (
              <option key={t} value={t}>
                {t === "TOUS" ? "Tous les motifs" : t}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des demandes */}
        {chargement ? (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-slate-400">
              Chargement des dossiers...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {demandesFiltrees.map((d) => {
              const nom = nomComplet(d);
              const idUtilisateur = d.utilisateur?.id || d.utilisateur;
              const estMaladieLongue =
                (d.type_conge_code === "MALADIE" ||
                  d.type_conge_libelle?.toLowerCase().includes("maladie")) &&
                Number(d.nombre_jours) > 4;

              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition hover:border-[#0097ff]/40 hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <Link
                      to={`/chef/demandes/${d.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e7ffff] font-bold text-[#93003f]">
                        {nom[0] ? nom[0].toUpperCase() : "A"}
                      </div>
                      <div className="truncate">
                        <p className="truncate font-semibold text-[#3c0038] transition hover:text-[#93003f]">
                          {nom}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-semibold text-[#0097ff]">
                            {d.type_conge_libelle || "Congé"}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            REF #{d.id}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-3 md:justify-end md:border-t-0 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Période
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {d.date_debut} <span className="text-slate-400">→</span> {d.date_fin}
                        </p>
                        <span className="mt-0.5 inline-block rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-bold text-[#93003f]">
                          {d.nombre_jours} jour{d.nombre_jours > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Boutons d'action pour congés standards */}
                      {!estMaladieLongue && (
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/chef/agents/${idUtilisateur}/historique`}
                            title="Historique de l'agent"
                            className="inline-flex items-center justify-center rounded-xl border border-[#00efff]/40 bg-[#e7ffff] p-2.5 text-[#0097ff] transition hover:bg-[#0097ff] hover:text-white"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => {
                              setDemandeRefus(d);
                              setMotifRefus("");
                              setErreurRefus("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Icone d={I.refuser} className="h-4 w-4" />
                            Refuser
                          </button>
                          <button
                            onClick={() => traiterAction(d.id, "VALIDE")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#93003f] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#3c0038]"
                          >
                            <Icone d={I.valide} className="h-4 w-4" />
                            Valider 
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloc spécifique : Congé maladie > 4 jours */}
                  {estMaladieLongue && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-amber-600">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-amber-900">
                            Arrêt maladie supérieur à 4 jours ({d.nombre_jours} jours)
                          </p>
                          <p className="mt-0.5 text-xs text-amber-700">
                            En tant que Chef de service, vous pouvez valider la demande directement ou solliciter une contre-visite médicale auprès des RH.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              to={`/chef/agents/${idUtilisateur}/historique`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0097ff]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#0097ff] hover:bg-[#0097ff] hover:text-white"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Historique de l'agent
                            </Link>
                            <button
                              onClick={() => traiterAction(d.id, "VALIDE")}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              Valider sans contre-visite
                            </button>
                            <button
                              onClick={() => traiterAction(d.id, "CONTRE_VISITE")}
                              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                            >
                              Demander une contre-visite (RH)
                            </button>
                            <button
                              onClick={() => {
                                setDemandeRefus(d);
                                setMotifRefus("");
                                setErreurRefus("");
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {demandesFiltrees.length === 0 && (
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center shadow-sm">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7ffff] text-[#0097ff]">
                  <Icone d={I.valide} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm text-slate-500">
                  {demandes.length === 0
                    ? "Aucune demande en attente de traitement."
                    : "Aucun dossier ne correspond à vos critères de recherche."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modale de Saisie du Motif de Refus */}
        {demandeRefus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[#3c0038]">
                Refuser la demande #{demandeRefus.id}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Veuillez spécifier le motif du refus pour l'agent{" "}
                <span className="font-semibold text-slate-700">
                  {nomComplet(demandeRefus)}
                </span>
                .
              </p>

              <textarea
                rows={4}
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                placeholder="Saisissez le motif de refus obligatoire..."
                className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
              />

              {erreurRefus && (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  {erreurRefus}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setDemandeRefus(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={validerRefus}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}