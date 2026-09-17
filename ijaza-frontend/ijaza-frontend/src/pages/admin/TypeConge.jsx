import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
/* ------------------------------------------------------------------ */
/* Palette du projet                                                   */
/*   #3c0038 prune · #93003f bordeaux · #0097ff bleu                   */
/*   #00efff cyan  · #e7ffff cyan pâle                                 */
/* ------------------------------------------------------------------ */

/* Icônes en SVG : pas de dépendance, rendu net à toutes les tailles */
const Icone = ({ d, className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const I = {
  plus: "M12 5v14M5 12h14",
  crayon: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  corbeille: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  loupe: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  oeil: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z",
  info: "M12 16v-4M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  alerte: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6",
  bouclier: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  jauge: "M12 12l4-2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  croix: "M18 6L6 18M6 6l12 12",
};

export default function TypeCongePage() {
  const [types, setTypes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous"); // tous | avec | sans

  // Modals
  const [formOuvert, setFormOuvert] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState(null);
  const [typeSelectionne, setTypeSelectionne] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);
  const [notification, setNotification] = useState(null);

  const champLibelle = useRef(null);

  // Formulaire local
  const [form, setForm] = useState({
    libelle: "",
    duree_max: "",
    description: "",
    justificatif_requis: false,
  });

  /* ---------------------------- données ---------------------------- */

  async function charger() {
    setChargement(true);
    setErreurChargement(null);
    try {
      const { data } = await api.get("/types-conge/");
      const liste = data.results ?? data;
      setTypes(liste);
      return liste;
    } catch (err) {
      console.error("Erreur de chargement des types :", err);
      setErreurChargement("Le référentiel n'a pas pu être chargé. Vérifiez votre connexion au serveur.");
      return [];
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  useEffect(() => {
    function surTouche(e) {
      if (e.key !== "Escape") return;
      if (aSupprimer) setASupprimer(null);
      else if (typeSelectionne) setTypeSelectionne(null);
      else if (formOuvert) setFormOuvert(false);
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [formOuvert, aSupprimer, typeSelectionne]);

  useEffect(() => {
    if (formOuvert) champLibelle.current?.focus();
  }, [formOuvert]);

  /* --------------- lecture unifiée des champs serveur -------------- */

  const lire = {
    nom: (t) => t.libelle || t.nom || "Sans nom",
    plafond: (t) => t.duree_max ?? t.nb_jours_max ?? t.solde_par_defaut,
    justificatif: (t) => Boolean(t.justificatif_requis ?? t.attestation_obligatoire),
  };

  /* ------------------- filtrage / tri / synthèse ------------------- */

  const typesAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return types
      .filter((t) => {
        const j = lire.justificatif(t);
        if (filtre === "avec" && !j) return false;
        if (filtre === "sans" && j) return false;
        return lire.nom(t).toLowerCase().includes(terme);
      })
      .sort((a, b) => lire.nom(a).localeCompare(lire.nom(b)));
  }, [types, recherche, filtre]);

  const stats = useMemo(() => {
    const avec = types.filter((t) => lire.justificatif(t)).length;
    const plafonds = types.map((t) => Number(lire.plafond(t))).filter((n) => Number.isFinite(n) && n > 0);
    const plafondMax = plafonds.length ? Math.max(...plafonds) : 0;
    return {
      total: types.length,
      avec,
      sans: types.length - avec,
      plafondMax,
    };
  }, [types]);

  const repartitionTotal = Math.max(1, stats.avec + stats.sans);

  /* --------------------------- formulaire -------------------------- */

  const ouvrirFormulaire = (type = null) => {
    setErreurForm(null);
    if (type) {
      setTypeEnEdition(type);
      setForm({
        libelle: type.libelle || type.nom || "",
        duree_max: type.duree_max ?? type.nb_jours_max ?? type.solde_par_defaut ?? "",
        description: type.description || "",
        justificatif_requis: lire.justificatif(type),
      });
    } else {
      setTypeEnEdition(null);
      setForm({ libelle: "", duree_max: "", description: "", justificatif_requis: false });
    }
    setFormOuvert(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurForm(null);

    if (!form.libelle.trim()) {
      setErreurForm("Indiquez le libellé du type de congé.");
      return;
    }

    const dureeNum = form.duree_max ? parseInt(form.duree_max, 10) : null;

    // Envoi exhaustif pour s'adapter à toutes les déclinaisons des Serializers Django
    const payload = {
      libelle: form.libelle.trim(),
      nom: form.libelle.trim(),
      description: form.description,
      duree_max: dureeNum,
      nb_jours_max: dureeNum,
      solde_par_defaut: dureeNum,
      justificatif_requis: form.justificatif_requis,
      attestation_obligatoire: form.justificatif_requis,
    };

    setEnregistrement(true);
    try {
      if (typeEnEdition) {
        await api.patch(`/types-conge/${typeEnEdition.id}/`, payload);
      } else {
        await api.post("/types-conge/", payload);
      }

      const listeAjour = await charger();

      if (typeEnEdition) {
        const itemAJour = listeAjour.find((item) => item.id === typeEnEdition.id);
        if (itemAJour) setTypeSelectionne(itemAJour);
      }

      setFormOuvert(false);
      setNotification({
        type: "succes",
        texte: typeEnEdition ? "Type de congé modifié." : "Type de congé enregistré.",
      });
    } catch (err) {
      console.error("Erreur serveur :", err.response?.data || err);
      const errData = err.response?.data;
      const detail = errData
        ? typeof errData === "object"
          ? Object.entries(errData)
              .map(([champ, msg]) => `${champ} : ${Array.isArray(msg) ? msg.join(", ") : msg}`)
              .join(" — ")
          : String(errData)
        : "Le serveur n'a pas répondu.";
      setErreurForm(`L'enregistrement a échoué. ${detail}`);
    } finally {
      setEnregistrement(false);
    }
  }

  async function confirmerSuppression() {
    const item = aSupprimer;
    if (!item) return;
    try {
      await api.delete(`/types-conge/${item.id}/`);
      if (typeSelectionne?.id === item.id) setTypeSelectionne(null);
      setASupprimer(null);
      setNotification({ type: "succes", texte: `« ${lire.nom(item)} » a été supprimé.` });
      charger();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      setASupprimer(null);
      setNotification({ type: "erreur", texte: "La suppression a échoué. Réessayez." });
    }
  }

  /* ------------------------ classes partagées ---------------------- */

  const champ =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#3c0038] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40";
  const labelCls = "mb-1.5 block text-sm font-semibold text-[#3c0038]";

  /* ----------------------------- rendu ----------------------------- */

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* En-tête : identité de la page + action principale */}
        <header className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
                Types de congés
              </h1>
              <p className="mt-1.5 max-w-prose text-sm text-slate-500">
                Référentiel des régimes de congé. Ces règles encadrent la saisie et le décompte
                des demandes.
              </p>
            </div>

            <button
              onClick={() => ouvrirFormulaire()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#93003f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3c0038] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93003f]"
            >
              <Icone d={I.plus} />
              Nouveau type
            </button>
          </div>

          {/* Synthèse du référentiel */}
          <dl className="grid grid-cols-3 divide-x divide-[#00efff]/30 border-t border-[#00efff]/30 bg-[#e7ffff]/40">
            {[
              { valeur: stats.total, libelle: "types enregistrés" },
              { valeur: stats.avec, libelle: "avec justificatif" },
              { valeur: stats.plafondMax || "—", libelle: "plafond max (jours)" },
            ].map((s) => (
              <div key={s.libelle} className="px-4 py-3 text-center sm:px-6 sm:text-left">
                <dd className="text-xl font-bold tabular-nums text-[#93003f]">{s.valeur}</dd>
                <dt className="mt-0.5 text-xs text-slate-500">{s.libelle}</dt>
              </div>
            ))}
          </dl>
        </header>

        {/* Corps : liste à gauche, panneau de contexte à droite */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
          {/* ------------------------- Colonne principale ------------------------- */}
          <div className="min-w-0 space-y-6">
            {/* Barre d'outils */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#0097ff]">
                  <Icone d={I.loupe} />
                </span>
                <input
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un libellé"
                  className={`${champ} pl-10`}
                  aria-label="Rechercher un type de congé"
                />
              </div>

              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                {[
                  { cle: "tous", texte: "Tous" },
                  { cle: "avec", texte: "Justificatif" },
                  { cle: "sans", texte: "Sans" },
                ].map((t) => (
                  <button
                    key={t.cle}
                    type="button"
                    onClick={() => setFiltre(t.cle)}
                    aria-pressed={filtre === t.cle}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      filtre === t.cle
                        ? "bg-[#3c0038] text-white"
                        : "text-slate-500 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                    }`}
                  >
                    {t.texte}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste / Grille */}
            {chargement ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-[#e7ffff]" />
                  </div>
                ))}
              </div>
            ) : erreurChargement ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <span className="mt-0.5 text-rose-600"><Icone d={I.alerte} className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-rose-900">{erreurChargement}</p>
                  <button
                    onClick={charger}
                    className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Recharger le référentiel
                  </button>
                </div>
              </div>
            ) : typesAffiches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#00efff]/60 bg-white px-6 py-16 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7ffff] text-[#0097ff]">
                  <Icone d={I.document} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-base font-bold text-[#3c0038]">
                  {recherche || filtre !== "tous"
                    ? "Aucun résultat pour ces critères"
                    : "Aucun type de congé enregistré"}
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                  {recherche || filtre !== "tous"
                    ? "Modifiez la recherche ou changez de filtre."
                    : "Déclarez les régimes de congé pour encadrer la saisie des demandes."}
                </p>
                {!recherche && filtre === "tous" && (
                  <button
                    onClick={() => ouvrirFormulaire()}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#93003f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3c0038]"
                  >
                    <Icone d={I.plus} />
                    Ajouter le premier type
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {typesAffiches.map((t) => {
                  const aJustificatif = lire.justificatif(t);
                  const plafond = lire.plafond(t);
                  const nom = lire.nom(t);

                  return (
                    <article
                      key={t.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 pl-6 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-[#00efff]/40"
                    >
                      {/* Barre d'accent latérale colorée */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-1.5 ${
                          aJustificatif
                            ? "bg-gradient-to-b from-[#93003f] to-[#3c0038]"
                            : "bg-gradient-to-b from-[#00efff] to-[#0097ff]"
                        }`}
                      />

                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm ${
                                aJustificatif
                                  ? "bg-gradient-to-br from-[#93003f] to-[#3c0038]"
                                  : "bg-gradient-to-br from-[#0097ff] to-[#00efff]"
                              }`}
                            >
                              <Icone d={I.document} className="h-5 w-5" />
                            </span>
                            <h3 className="truncate text-base font-bold leading-tight text-[#3c0038]">{nom}</h3>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              aJustificatif
                                ? "bg-[#93003f]/10 text-[#93003f]"
                                : "bg-[#0097ff]/10 text-[#0097ff]"
                            }`}
                          >
                            <Icone d={aJustificatif ? I.bouclier : I.info} className="h-3.5 w-3.5" />
                            {aJustificatif ? "Justificatif" : "Libre"}
                          </span>
                        </div>

                        <p className="mt-3 min-h-[40px] text-sm text-slate-500 line-clamp-2">
                          {t.description || "Aucune règle spécifique enregistrée."}
                        </p>

                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold tabular-nums text-[#93003f]">
                            {plafond ? plafond : "—"}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {plafond ? "jours / an" : "selon réglementation"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
                        <button
                          onClick={() => setTypeSelectionne(t)}
                          className="inline-flex items-center gap-1.5 text-[#0097ff] hover:text-[#3c0038]"
                        >
                          <Icone d={I.oeil} /> Détails
                        </button>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => ouvrirFormulaire(t)}
                            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#3c0038]"
                          >
                            <Icone d={I.crayon} /> Modifier
                          </button>
                          <button
                            onClick={() => setASupprimer(t)}
                            className="inline-flex items-center gap-1.5 text-rose-500 hover:text-rose-700"
                          >
                            <Icone d={I.corbeille} /> Supprimer
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* ------------------------- Panneau de contexte ------------------------- */}
          <aside className="space-y-4 lg:sticky lg:top-6">
            {/* Répartition */}
            <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#3c0038]">Répartition des régimes</h2>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-[#93003f]"
                  style={{ width: `${(stats.avec / repartitionTotal) * 100}%` }}
                />
                <div
                  className="bg-[#0097ff]"
                  style={{ width: `${(stats.sans / repartitionTotal) * 100}%` }}
                />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#93003f]" /> Avec justificatif
                  </dt>
                  <dd className="font-bold tabular-nums text-[#3c0038]">{stats.avec}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0097ff]" /> Sans justificatif
                  </dt>
                  <dd className="font-bold tabular-nums text-[#3c0038]">{stats.sans}</dd>
                </div>
              </dl>
            </div>

            {/* Note */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-5">
              <span className="mt-0.5 text-[#0097ff]"><Icone d={I.info} className="h-5 w-5" /></span>
              <p className="text-sm text-slate-600">
                Les types exigeant un justificatif imposent une pièce jointe lors de la demande.
                Le plafond limite le nombre de jours accordés par an.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* ------------------------------ Notification ------------------------------ */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            notification.type === "succes" ? "bg-[#3c0038]" : "bg-rose-600"
          }`}
          role="status"
        >
          <Icone d={notification.type === "succes" ? I.info : I.alerte} className="h-4 w-4" />
          {notification.texte}
        </div>
      )}

      {/* ------------------------------ Modal Formulaire ------------------------------ */}
      {formOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* En-tête en dégradé */}
            <div className="relative bg-gradient-to-br from-[#93003f] to-[#3c0038] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                  <Icone d={typeEnEdition ? I.crayon : I.plus} className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {typeEnEdition ? "Modifier le type" : "Nouveau type de congé"}
                  </h2>
                  <p className="text-xs text-white/70">
                    {typeEnEdition ? "Ajustez les règles de ce type." : "Définissez un nouveau régime de congé."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Fermer"
              >
                <Icone d={I.croix} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {erreurForm && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <Icone d={I.alerte} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{erreurForm}</span>
                </div>
              )}

              <div>
                <label className={labelCls}>Libellé</label>
                <input
                  ref={champLibelle}
                  type="text"
                  value={form.libelle}
                  onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  className={champ}
                  placeholder="Congé annuel, maladie…"
                />
              </div>

              <div>
                <label className={labelCls}>Plafond annuel (jours)</label>
                <input
                  type="number"
                  min="0"
                  value={form.duree_max}
                  onChange={(e) => setForm({ ...form, duree_max: e.target.value })}
                  className={champ}
                  placeholder="Laisser vide si selon réglementation"
                />
              </div>

              <div>
                <label className={labelCls}>Description / Règles</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${champ} resize-none`}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-3 transition-colors hover:bg-[#e7ffff]/70">
                <input
                  type="checkbox"
                  checked={form.justificatif_requis}
                  onChange={(e) => setForm({ ...form, justificatif_requis: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#93003f]"
                />
                <span className="text-sm font-semibold text-[#3c0038]">
                  Justificatif médical / administratif obligatoire
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {enregistrement ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------ Modal Détails ------------------------------ */}
      {typeSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* En-tête en dégradé, teinte selon le régime */}
            <div
              className={`relative px-6 py-6 ${
                lire.justificatif(typeSelectionne)
                  ? "bg-gradient-to-br from-[#93003f] to-[#3c0038]"
                  : "bg-gradient-to-br from-[#0097ff] to-[#00cfff]"
              }`}
            >
              <button
                onClick={() => setTypeSelectionne(null)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Fermer"
              >
                <Icone d={I.croix} />
              </button>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                <Icone d={lire.justificatif(typeSelectionne) ? I.bouclier : I.jauge} className="h-6 w-6" />
              </span>
              <h2 className="mt-3 text-xl font-bold text-white">{lire.nom(typeSelectionne)}</h2>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                {lire.justificatif(typeSelectionne) ? "Justificatif requis" : "Libre"}
              </span>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {typeSelectionne.description || "Aucune règle précisée."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#93003f] shadow-sm">
                    <Icone d={I.jauge} className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-xs text-slate-400">Plafond annuel</p>
                  <p className="text-lg font-bold text-[#3c0038]">
                    {lire.plafond(typeSelectionne)
                      ? `${lire.plafond(typeSelectionne)} j`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0097ff] shadow-sm">
                    <Icone d={I.bouclier} className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-xs text-slate-400">Justificatif</p>
                  <p className="text-lg font-bold text-[#3c0038]">
                    {lire.justificatif(typeSelectionne) ? "Requis" : "Optionnel"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTypeSelectionne(null)}
                className="w-full rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ Confirmation suppression ------------------------------ */}
      {aSupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
              <Icone d={I.corbeille} className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#3c0038]">Supprimer ce type ?</h2>
              <p className="mt-1 text-sm text-slate-500">
                « {lire.nom(aSupprimer)} » sera définitivement retiré du référentiel.
                Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setASupprimer(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
