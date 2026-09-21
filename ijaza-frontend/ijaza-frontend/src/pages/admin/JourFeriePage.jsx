import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

/* ------------------------------------------------------------------ */
/* Palette du projet                                                   */
/*   #3c0038 prune · #93003f bordeaux · #0097ff bleu                   */
/*   #00efff cyan  · #e7ffff cyan pâle                                 */
/* ------------------------------------------------------------------ */

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const MOIS_COURT = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc"
];

function formaterDateLongue(iso) {
  if (!iso) return "—";
  const [a, m, j] = iso.split("-");
  return `${Number(j)} ${MOIS[Number(m) - 1] ?? ""} ${a}`;
}

function nombreDeJours(debut, fin) {
  if (!debut) return 0;

  const d = new Date(`${debut}T00:00:00`);
  const f = new Date(`${fin || debut}T00:00:00`);

  const diff = Math.round((f - d) / 86_400_000) + 1;

  return Number.isFinite(diff) ? Math.max(1, diff) : 1;
}

function dateDuJourISO() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Icônes */
const Icone = ({ d, className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const I = {
  plus: "M12 5v14M5 12h14",
  gauche: "M15 18l-6-6 6-6",
  droite: "M9 6l6 6-6 6",
  crayon: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  corbeille: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  loupe: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  boucle: "M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  croix: "M18 6L6 18M6 6l12 12",
  calendrier: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  info: "M12 16v-4M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  alerte: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  valide: "M20 6L9 17l-5-5",
  horloge: "M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  fleche: "M5 12h14M13 6l6 6-6 6",
};

export default function JourFeriePage() {
  const [tousLesJoursFeries, setTousLesJoursFeries] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);

  const [anneeFiltre, setAnneeFiltre] = useState(
    new Date().getFullYear()
  );

  const [recherche, setRecherche] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("tous");

  const [formOuvert, setFormOuvert] = useState(false);
  const [elementEnEdition, setElementEnEdition] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [notification, setNotification] = useState(null);

  const champNom = useRef(null);

  const [form, setForm] = useState({
    nom: "",
    date_debut: "",
    date_fin: "",
    est_recurrent: false,
  });

  /* ---------------------------- données ---------------------------- */

  async function chargerJoursFeries() {
    setChargement(true);
    setErreurChargement(null);

    try {
      const { data } = await api.get("/jours-feries/");
      setTousLesJoursFeries(data.results ?? data);
    } catch (err) {
      console.error(
        "Erreur lors du chargement des jours fériés:",
        err
      );

      setErreurChargement(
        "Le calendrier n'a pas pu être chargé. Vérifiez votre connexion au serveur."
      );
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerJoursFeries();
  }, []);

  useEffect(() => {
    if (!notification) return;

    const t = setTimeout(
      () => setNotification(null),
      4000
    );

    return () => clearTimeout(t);
  }, [notification]);

  useEffect(() => {
    function surTouche(e) {
      if (e.key !== "Escape") return;

      if (aSupprimer) {
        setASupprimer(null);
      } else if (formOuvert) {
        setFormOuvert(false);
      }
    }

    window.addEventListener("keydown", surTouche);

    return () =>
      window.removeEventListener("keydown", surTouche);
  }, [formOuvert, aSupprimer]);

  useEffect(() => {
    if (formOuvert) {
      champNom.current?.focus();
    }
  }, [formOuvert]);

  /* ------------------- filtrage / tri / regroupement --------------- */

  const joursFeriesAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return tousLesJoursFeries
      .filter((item) => {
        // 1. Filtre par type (Fixes / Ponctuels)
        if (typeFiltre === "recurrents" && !item.est_recurrent) return false;
        if (typeFiltre === "ponctuels" && item.est_recurrent) return false;

        // 2. Filtre par recherche de texte
        const intitule = String(item.nom || item.libelle || "").toLowerCase();
        if (!intitule.includes(terme)) return false;

        // 3. Filtre par année :
        // Si c'est RÉCURRENT -> On l'affiche TOUJOURS (quelle que soit l'année)
        if (item.est_recurrent) return true;

        // Si c'est PONCTUEL -> On vérifie que c'est bien l'année sélectionnée
        const d = item.date_debut || item.date;
        if (!d) return false;
        return Number(d.split("-")[0]) === Number(anneeFiltre);
      })
      .map((item) => {
        const dDebut = item.date_debut || item.date;
        const dFin = item.date_fin || dDebut;

        // Pour les récurrents, on force l'affichage avec l'année en cours de visualisation
        if (item.est_recurrent && dDebut) {
          const moisJourDebut = dDebut.slice(5); // Extrait "MM-DD"
          const moisJourFin = dFin ? dFin.slice(5) : moisJourDebut;

          return {
            ...item,
            date_debut_affiche: `${anneeFiltre}-${moisJourDebut}`,
            date_fin_affiche: `${anneeFiltre}-${moisJourFin}`,
          };
        }

        return {
          ...item,
          date_debut_affiche: dDebut,
          date_fin_affiche: dFin || dDebut,
        };
      })
      .sort((a, b) =>
        String(a.date_debut_affiche).localeCompare(String(b.date_debut_affiche))
      );
  }, [tousLesJoursFeries, anneeFiltre, recherche, typeFiltre]);

  const parMois = useMemo(() => {
    const groupes = new Map();

    for (const item of joursFeriesAffiches) {
      const mois =
        Number(
          String(item.date_debut_affiche).split("-")[1]
        ) - 1;

      const cle = Number.isFinite(mois)
        ? mois
        : 12;

      if (!groupes.has(cle)) {
        groupes.set(cle, []);
      }

      groupes.get(cle).push(item);
    }

    return [...groupes.entries()].sort(
      (a, b) => a[0] - b[0]
    );
  }, [joursFeriesAffiches]);

  const stats = useMemo(() => {
    const jours =
      joursFeriesAffiches.reduce(
        (acc, i) =>
          acc +
          nombreDeJours(
            i.date_debut_affiche,
            i.date_fin_affiche
          ),
        0
      );

    return {
      total: joursFeriesAffiches.length,
      recurrents: joursFeriesAffiches.filter(
        (i) => i.est_recurrent
      ).length,
      ponctuels: joursFeriesAffiches.filter(
        (i) => !i.est_recurrent
      ).length,
      jours,
    };
  }, [joursFeriesAffiches]);

  const prochain = useMemo(() => {
    const aujourdHui = dateDuJourISO();

    const anneeCourante = Number(
      aujourdHui.split("-")[0]
    );

    const candidats =
      tousLesJoursFeries.flatMap((item) => {
        const dDebut =
          item.date_debut || item.date;

        if (!dDebut) return [];

        if (item.est_recurrent) {
          return [
            anneeCourante,
            anneeCourante + 1,
          ].map((annee) => ({
            ...item,
            date_debut_affiche:
              `${annee}-${dDebut.slice(5)}`,
          }));
        }

        return [
          {
            ...item,
            date_debut_affiche: dDebut,
          },
        ];
      });

    return candidats
      .filter(
        (c) =>
          c.date_debut_affiche >= aujourdHui
      )
      .sort((a, b) =>
        a.date_debut_affiche.localeCompare(
          b.date_debut_affiche
        )
      )[0];
  }, [tousLesJoursFeries]);

  const joursAvantProchain = prochain
    ? Math.max(
        0,
        Math.round(
          (
            new Date(
              `${prochain.date_debut_affiche}T00:00:00`
            ) -
            new Date(
              `${dateDuJourISO()}T00:00:00`
            )
          ) / 86_400_000
        )
      )
    : null;

  /* --------------------------- formulaire -------------------------- */

  function ouvrirFormulaire(item = null) {
    setErreurForm(null);

    if (item) {
      setElementEnEdition(item);

      setForm({
        nom: item.nom || item.libelle || "",
        date_debut:
          item.date_debut ||
          item.date ||
          "",
        date_fin:
          item.date_fin ||
          item.date_debut ||
          item.date ||
          "",
        est_recurrent: Boolean(
          item.est_recurrent
        ),
      });
    } else {
      setElementEnEdition(null);

      const dateDefaut =
        `${anneeFiltre}-01-01`;

      setForm({
        nom: "",
        date_debut: dateDefaut,
        date_fin: dateDefaut,
        est_recurrent: false,
      });
    }

    setFormOuvert(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurForm(null);

    if (!form.nom.trim()) {
      setErreurForm(
        "Indiquez l'intitulé du jour férié."
      );
      return;
    }

    if (
      form.date_fin &&
      form.date_fin < form.date_debut
    ) {
      setErreurForm(
        "La date de fin doit être postérieure ou égale à la date de début."
      );
      return;
    }

    const anneeCalculee = form.date_debut
      ? Number(form.date_debut.split("-")[0])
      : Number(anneeFiltre);

    const payload = {
      nom: form.nom.trim(),
      libelle: form.nom.trim(),
      date_debut: form.date_debut,
      date_fin:
        form.date_fin ||
        form.date_debut,
      date: form.date_debut,
      annee: anneeCalculee,
      est_recurrent: form.est_recurrent,
    };

    setEnregistrement(true);

    try {
      if (elementEnEdition) {
        await api.patch(
          `/jours-feries/${elementEnEdition.id}/`,
          payload
        );
      } else {
        await api.post(
          "/jours-feries/",
          payload
        );
      }

      setFormOuvert(false);

      setNotification({
        type: "succes",
        texte: elementEnEdition
          ? "Jour férié modifié."
          : "Jour férié enregistré.",
      });

      chargerJoursFeries();
    } catch (err) {
      console.error(
        "Détails erreur:",
        err.response?.data || err
      );

      const errData =
        err.response?.data;

      const detail = errData
        ? typeof errData === "object"
          ? Object.entries(errData)
              .map(
                ([champ, msg]) =>
                  `${champ} : ${
                    Array.isArray(msg)
                      ? msg.join(", ")
                      : msg
                  }`
              )
              .join(" — ")
          : String(errData)
        : "Le serveur n'a pas répondu.";

      setErreurForm(
        `L'enregistrement a échoué. ${detail}`
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function confirmerSuppression() {
    const item = aSupprimer;

    if (!item) return;

    try {
      await api.delete(
        `/jours-feries/${item.id}/`
      );

      setASupprimer(null);

      setNotification({
        type: "succes",
        texte: `« ${
          item.nom || item.libelle
        } » a été supprimé.`,
      });

      chargerJoursFeries();
    } catch (err) {
      console.error(
        "Erreur de suppression:",
        err
      );

      setASupprimer(null);

      setNotification({
        type: "erreur",
        texte:
          "La suppression a échoué. Réessayez.",
      });
    }
  }

  /* ------------------------ classes partagées ---------------------- */

  const champ =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#3c0038] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40";

  const label =
    "mb-1.5 block text-sm font-semibold text-[#3c0038]";

  const anneeActuelle =
    new Date().getFullYear();

  const repartitionTotal = Math.max(
    1,
    stats.recurrents + stats.ponctuels
  );

  /* ----------------------------- rendu ----------------------------- */

  return (
    <MainLayout>

      <div className="mx-auto max-w-7xl space-y-6">

        {/* ========================================================= */}
        {/* EN-TÊTE                                                  */}
        {/* ========================================================= */}

        <header className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">

          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
                Jours fériés et fêtes
              </h1>

              <p className="mt-1.5 max-w-prose text-sm text-slate-500">
                Calendrier officiel de référence.
                Ces dates sont déduites automatiquement
                du décompte des congés.
              </p>
            </div>

            <button
              onClick={() =>
                ouvrirFormulaire()
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#93003f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3c0038]"
            >
              <Icone d={I.plus} />
              Nouveau jour férié
            </button>

          </div>

          <dl className="grid grid-cols-3 divide-x divide-[#00efff]/30 border-t border-[#00efff]/30 bg-[#e7ffff]/40">

            {[
              {
                valeur: stats.total,
                libelle: `événements en ${anneeFiltre}`,
              },
              {
                valeur: stats.jours,
                libelle: "jours chômés",
              },
              {
                valeur: stats.recurrents,
                libelle: "dates fixes",
              },
            ].map((s) => (
              <div
                key={s.libelle}
                className="px-4 py-3 text-center sm:px-6 sm:text-left"
              >
                <dd className="text-xl font-bold tabular-nums text-[#93003f]">
                  {s.valeur}
                </dd>

                <dt className="mt-0.5 text-xs text-slate-500">
                  {s.libelle}
                </dt>
              </div>
            ))}

          </dl>
        </header>

        {/* ========================================================= */}
        {/* CORPS                                                     */}
        {/* ========================================================= */}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">

          {/* COLONNE PRINCIPALE */}

          <div className="min-w-0 space-y-6">

            {/* Barre d'outils */}

            <div className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-4 md:flex-row md:items-center md:justify-between">

              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">

                <div className="relative w-full sm:max-w-xs">

                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#0097ff]">
                    <Icone d={I.loupe} />
                  </span>

                  <input
                    type="search"
                    value={recherche}
                    onChange={(e) =>
                      setRecherche(
                        e.target.value
                      )
                    }
                    placeholder="Rechercher un intitulé"
                    className={`${champ} pl-10`}
                    aria-label="Rechercher un jour férié"
                  />

                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white p-1">

                  {[
                    {
                      cle: "tous",
                      texte: "Tous",
                    },
                    {
                      cle: "recurrents",
                      texte: "Fixes",
                    },
                    {
                      cle: "ponctuels",
                      texte: "Ponctuels",
                    },
                  ].map((t) => (
                    <button
                      key={t.cle}
                      type="button"
                      onClick={() =>
                        setTypeFiltre(
                          t.cle
                        )
                      }
                      aria-pressed={
                        typeFiltre ===
                        t.cle
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                        typeFiltre ===
                        t.cle
                          ? "bg-[#3c0038] text-white"
                          : "text-slate-500 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                      }`}
                    >
                      {t.texte}
                    </button>
                  ))}

                </div>

              </div>

              <div className="flex items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">

                <button
                  onClick={() =>
                    setAnneeFiltre(
                      (a) => a - 1
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#93003f] transition-colors hover:bg-[#e7ffff]"
                  aria-label="Année précédente"
                >
                  <Icone
                    d={I.gauche}
                  />
                </button>

                <span className="px-3 text-base font-bold tabular-nums text-[#3c0038]">
                  {anneeFiltre}
                </span>

                <button
                  onClick={() =>
                    setAnneeFiltre(
                      (a) => a + 1
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#93003f] transition-colors hover:bg-[#e7ffff]"
                  aria-label="Année suivante"
                >
                  <Icone
                    d={I.droite}
                  />
                </button>

                {anneeFiltre !==
                  anneeActuelle && (
                  <button
                    onClick={() =>
                      setAnneeFiltre(
                        anneeActuelle
                      )
                    }
                    className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0097ff] hover:bg-[#e7ffff]"
                  >
                    Aujourd'hui
                  </button>
                )}

              </div>

            </div>

            {/* ===================================================== */}
            {/* LISTE                                                  */}
            {/* ===================================================== */}

            {chargement ? (

              <ul
                className="space-y-3"
                aria-busy="true"
              >
                {[0, 1, 2, 3].map(
                  (i) => (
                    <li
                      key={i}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-[#e7ffff]" />

                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-48 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                      </div>
                    </li>
                  )
                )}
              </ul>

            ) : erreurChargement ? (

              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6">

                <span className="mt-0.5 text-rose-600">
                  <Icone
                    d={I.alerte}
                    className="h-5 w-5"
                  />
                </span>

                <div>

                  <p className="text-sm font-semibold text-rose-900">
                    {erreurChargement}
                  </p>

                  <button
                    onClick={
                      chargerJoursFeries
                    }
                    className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Recharger le calendrier
                  </button>

                </div>

              </div>

            ) : joursFeriesAffiches.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-[#00efff]/60 bg-white px-6 py-16 text-center">

                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7ffff] text-[#0097ff]">
                  <Icone
                    d={I.calendrier}
                    className="h-5 w-5"
                  />
                </span>

                <p className="mt-4 text-base font-bold text-[#3c0038]">
                  {recherche ||
                  typeFiltre !==
                    "tous"
                    ? "Aucun résultat pour ces critères"
                    : `Le calendrier ${anneeFiltre} est vide`}
                </p>

                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                  {recherche ||
                  typeFiltre !==
                    "tous"
                    ? "Modifiez la recherche, changez de filtre ou consultez une autre année."
                    : "Enregistrez les fêtes nationales et religieuses pour que les congés soient calculés correctement."}
                </p>

                {!recherche &&
                  typeFiltre ===
                    "tous" && (
                    <button
                      onClick={() =>
                        ouvrirFormulaire()
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#93003f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3c0038]"
                    >
                      <Icone
                        d={I.plus}
                      />
                      Ajouter le premier jour férié
                    </button>
                  )}

              </div>

            ) : (

              <div className="space-y-7">

                {parMois.map(
                  ([mois, elements]) => (
                    <section key={mois}>

                      <div className="mb-3 flex items-center gap-3">

                        <h2 className="text-sm font-bold text-[#3c0038]">
                          {MOIS[mois]
                            ? `${MOIS[
                                mois
                              ]
                                .charAt(
                                  0
                                )
                                .toUpperCase()}${MOIS[
                                mois
                              ].slice(1)}`
                            : "Sans date"}
                        </h2>

                        <span className="h-px flex-1 bg-[#00efff]/40" />

                        <span className="text-xs tabular-nums text-slate-400">
                          {elements.length}{" "}
                          {elements.length >
                          1
                            ? "événements"
                            : "événement"}
                        </span>

                      </div>

                      <ul className="space-y-2.5">

                        {elements.map(
                          (item) => {
                            const duree =
                              nombreDeJours(
                                item.date_debut_affiche,
                                item.date_fin_affiche
                              );

                            const [, m, j] =
                              String(
                                item.date_debut_affiche
                              ).split(
                                "-"
                              );

                            return (
                              <li
                                key={
                                  item.id
                                }
                                className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:border-[#00efff]/60 sm:flex-row sm:items-center sm:gap-5"
                              >

                                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[#00efff]/40 bg-[#e7ffff] leading-tight">

                                  <span className="text-lg font-bold tabular-nums text-[#93003f]">
                                    {Number(
                                      j
                                    ) ||
                                      "—"}
                                  </span>

                                  <span className="text-[10px] font-semibold text-[#0097ff]">
                                    {MOIS_COURT[
                                      Number(
                                        m
                                      ) -
                                        1
                                    ] ??
                                      ""}
                                  </span>

                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <h3 className="truncate text-[15px] font-bold text-[#3c0038]">
                                      {item.nom ||
                                        item.libelle}
                                    </h3>

                                    {item.est_recurrent ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#93003f]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#93003f]">
                                        <Icone
                                          d={
                                            I.boucle
                                          }
                                          className="h-3 w-3"
                                        />
                                        Chaque année
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-[#0097ff]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#0097ff]">
                                        Ponctuel
                                      </span>
                                    )}

                                  </div>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {duree >
                                    1
                                      ? `Du ${formaterDateLongue(
                                          item.date_debut_affiche
                                        )} au ${formaterDateLongue(
                                          item.date_fin_affiche
                                        )} — ${duree} jours`
                                      : `${formaterDateLongue(
                                          item.date_debut_affiche
                                        )} — 1 jour`}
                                  </p>

                                </div>

                                <div className="flex items-center gap-1 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">

                                  <button
                                    onClick={() =>
                                      ouvrirFormulaire(
                                        item
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-[#0097ff] transition-colors hover:bg-[#e7ffff]"
                                  >
                                    <Icone
                                      d={
                                        I.crayon
                                      }
                                    />
                                    <span className="hidden sm:inline">
                                      Modifier
                                    </span>
                                  </button>

                                  <button
                                    onClick={() =>
                                      setASupprimer(
                                        item
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-[#93003f] transition-colors hover:bg-rose-50"
                                  >
                                    <Icone
                                      d={
                                        I.corbeille
                                      }
                                    />
                                    <span className="hidden sm:inline">
                                      Supprimer
                                    </span>
                                  </button>

                                </div>

                              </li>
                            );
                          }
                        )}

                      </ul>

                    </section>
                  )
                )}

              </div>
            )}

          </div>

          {/* ======================================================= */}
          {/* PANNEAU LATÉRAL                                         */}
          {/* ======================================================= */}

          <aside className="space-y-4 lg:sticky lg:top-6">

            <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">

              <div className="flex items-center gap-2 border-b border-[#00efff]/30 bg-[#3c0038] px-4 py-3">

                <span className="text-[#00efff]">
                  <Icone
                    d={I.horloge}
                    className="h-4 w-4"
                  />
                </span>

                <h2 className="text-sm font-bold text-white">
                  Prochain jour férié
                </h2>

              </div>

              <div className="p-4">

                {prochain ? (
                  <>
                    <p className="text-base font-bold text-[#3c0038]">
                      {prochain.nom ||
                        prochain.libelle}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {formaterDateLongue(
                        prochain.date_debut_affiche
                      )}
                    </p>

                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e7ffff] px-3 py-1 text-xs font-semibold text-[#0097ff]">
                      {joursAvantProchain ===
                      0
                        ? "C'est aujourd'hui"
                        : `Dans ${joursAvantProchain} jour${
                            joursAvantProchain >
                            1
                              ? "s"
                              : ""
                          }`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aucune date à venir n'est encore enregistrée.
                  </p>
                )}

              </div>

            </div>

            <div className="rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm">

              <h2 className="text-sm font-bold text-[#3c0038]">
                Répartition en {anneeFiltre}
              </h2>

              {stats.total === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Rien à afficher pour cette année.
                </p>
              ) : (
                <>
                  <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">

                    <span
                      className="bg-[#93003f]"
                      style={{
                        width: `${
                          (stats.recurrents /
                            repartitionTotal) *
                          100
                        }%`,
                      }}
                    />

                    <span
                      className="bg-[#0097ff]"
                      style={{
                        width: `${
                          (stats.ponctuels /
                            repartitionTotal) *
                          100
                        }%`,
                      }}
                    />

                  </div>

                  <ul className="mt-3 space-y-2 text-sm">

                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-[#93003f]" />
                        Dates fixes
                      </span>

                      <span className="font-semibold tabular-nums text-[#3c0038]">
                        {stats.recurrents}
                      </span>
                    </li>

                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-[#0097ff]" />
                        Ponctuelles
                      </span>

                      <span className="font-semibold tabular-nums text-[#3c0038]">
                        {stats.ponctuels}
                      </span>
                    </li>

                  </ul>
                </>
              )}

            </div>

            <div className="rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/50 p-4">

              <div className="flex items-start gap-2.5">

                <span className="mt-0.5 shrink-0 text-[#0097ff]">
                  <Icone
                    d={I.info}
                    className="h-4 w-4"
                  />
                </span>

                <p className="text-sm text-slate-600">
                  Les fêtes religieuses changent de
                  date chaque année et doivent être
                  ressaisies chaque{" "}
                  {anneeActuelle + 1} : pensez à
                  mettre le calendrier à jour en fin
                  d'année.
                </p>

              </div>

            </div>

          </aside>

        </div>

      </div>

      {/* ========================================================= */}
      {/* FORMULAIRE                                                */}
      {/* ========================================================= */}

      {formOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#3c0038]/50 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget &&
            setFormOuvert(false)
          }
        >

          <form
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-form-ferie"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#00efff]/30 bg-white shadow-2xl sm:rounded-2xl"
          >

            <div className="flex items-start justify-between gap-4 border-b border-[#00efff]/30 bg-[#e7ffff]/50 px-6 py-5">

              <div>

                <h2
                  id="titre-form-ferie"
                  className="text-lg font-bold text-[#3c0038]"
                >
                  {elementEnEdition
                    ? "Modifier le jour férié"
                    : "Nouveau jour férié"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {elementEnEdition
                    ? "La modification s'appliquera aux prochains calculs de congés."
                    : "Renseignez l'intitulé officiel et la période concernée."}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOuvert(false)
                }
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-[#93003f]"
                aria-label="Fermer le formulaire"
              >
                <Icone d={I.croix} />
              </button>

            </div>

            <div className="space-y-5 px-6 py-5">

              <div>

                <label
                  htmlFor="nom-ferie"
                  className={label}
                >
                  Intitulé officiel
                </label>

                <input
                  id="nom-ferie"
                  ref={champNom}
                  type="text"
                  value={form.nom}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nom: e.target.value,
                    })
                  }
                  required
                  maxLength={120}
                  className={champ}
                  placeholder="Fête du Trône, Aïd Al Fitr, Aïd Al Adha…"
                />

              </div>

              <fieldset className="rounded-xl border border-slate-200 p-4">

                <legend className="px-1.5 text-sm font-semibold text-[#3c0038]">
                  Période concernée
                </legend>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <div>

                    <label
                      htmlFor="debut-ferie"
                      className={label}
                    >
                      Premier jour
                    </label>

                    <input
                      id="debut-ferie"
                      type="date"
                      value={form.date_debut}
                      onChange={(e) => {
                        const debut =
                          e.target.value;

                        setForm((f) => ({
                          ...f,
                          date_debut:
                            debut,
                          date_fin:
                            !f.date_fin ||
                            f.date_fin <
                              debut
                              ? debut
                              : f.date_fin,
                        }));
                      }}
                      required
                      className={`${champ} tabular-nums`}
                    />

                  </div>

                  <div>

                    <label
                      htmlFor="fin-ferie"
                      className={label}
                    >
                      Dernier jour
                    </label>

                    <input
                      id="fin-ferie"
                      type="date"
                      value={form.date_fin}
                      min={
                        form.date_debut ||
                        undefined
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          date_fin:
                            e.target.value,
                        })
                      }
                      className={`${champ} tabular-nums`}
                    />

                  </div>

                </div>

                {form.date_debut && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <span className="text-[#0097ff]">
                      <Icone d={I.info} />
                    </span>

                    Durée retenue :{" "}
                    {nombreDeJours(
                      form.date_debut,
                      form.date_fin
                    )}{" "}
                    {nombreDeJours(
                      form.date_debut,
                      form.date_fin
                    ) > 1
                      ? "jours"
                      : "jour"}
                  </p>
                )}

              </fieldset>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  form.est_recurrent
                    ? "border-[#93003f]/40 bg-[#93003f]/5"
                    : "border-[#00efff]/40 bg-[#e7ffff]/50"
                }`}
              >

                <input
                  type="checkbox"
                  checked={
                    form.est_recurrent
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      est_recurrent:
                        e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 accent-[#93003f]"
                />

                <span className="text-sm">

                  <span className="font-semibold text-[#3c0038]">
                    Revient chaque année à la même date
                  </span>

                  <span className="mt-1 block text-slate-500">
                    À cocher pour les fêtes du
                    calendrier grégorien. À laisser
                    décoché pour les fêtes religieuses,
                    dont la date change d'une année à
                    l'autre.
                  </span>

                </span>

              </label>

              {erreurForm && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
                >
                  <span className="mt-0.5">
                    <Icone d={I.alerte} />
                  </span>

                  {erreurForm}
                </p>
              )}

            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setFormOuvert(false)
                }
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={enregistrement}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#93003f] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3c0038] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement ? (
                  "Enregistrement…"
                ) : (
                  <>
                    <Icone
                      d={I.valide}
                    />
                    Enregistrer
                  </>
                )}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION SUPPRESSION                                  */}
      {/* ========================================================= */}

      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) =>
            e.target === e.currentTarget &&
            setASupprimer(null)
          }
        >

          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-2xl"
          >

            <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
              <Icone
                d={I.alerte}
                className="h-5 w-5"
              />
            </span>

            <h2 className="mt-4 text-lg font-bold text-[#3c0038]">
              Supprimer «{" "}
              {aSupprimer.nom ||
                aSupprimer.libelle}{" "}
              » ?
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Cette date redeviendra un jour
              ouvrable dans le calcul des congés.
              L'opération est définitive.
            </p>

            <div className="mt-5 flex gap-3">

              <button
                onClick={() =>
                  setASupprimer(null)
                }
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                onClick={
                  confirmerSuppression
                }
                className="flex-1 rounded-xl bg-[#93003f] py-2.5 text-sm font-semibold text-white hover:bg-[#3c0038]"
              >
                Supprimer
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* NOTIFICATION                                              */}
      {/* ========================================================= */}

      {notification && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            notification.type ===
            "erreur"
              ? "bg-rose-600"
              : "bg-[#3c0038]"
          }`}
        >

          <Icone
            d={
              notification.type ===
              "erreur"
                ? I.alerte
                : I.valide
            }
          />

          {notification.texte}

        </div>
      )}

    </MainLayout>
  );
}