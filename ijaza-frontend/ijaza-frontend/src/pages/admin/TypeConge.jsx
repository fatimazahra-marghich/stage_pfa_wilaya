import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

/* Icônes en SVG */
const Icone = ({ d, className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const I = {
  crayon: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  loupe: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  oeil: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z",
  info: "M12 16v-4M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  alerte: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6",
  bouclier: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  croix: "M18 6L6 18M6 6l12 12",
  cadenas: "M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2v-2c0-3.3-2.7-6-6-6s-6 2.7-6 6v2c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zm-8-2c0-2.2 1.8-4 4-4s4 1.8 4 4v2H10v-2z"
};

export default function TypeCongePage() {
  const [types, setTypes] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");

  // Modals
  const [formOuvert, setFormOuvert] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState(null);
  const [typeSelectionne, setTypeSelectionne] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);

  const champDescription = useRef(null);

  // Formulaire local
  const [form, setForm] = useState({
    libelle: "",
    duree_max: "",
    description: "",
    justificatif_requis: false,
    type_justificatif: "",
  });

  async function charger() {
    setChargement(true);
    try {
      const { data } = await api.get("/types-conge/");
      const liste = data.results ?? data;
      setTypes(Array.isArray(liste) ? liste : []);
    } catch (err) {
      console.error("Erreur de chargement des types :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    if (formOuvert) champDescription.current?.focus();
  }, [formOuvert]);

  const lire = {
    nom: (t) => t.libelle || t.nom || "Sans nom",
    plafond: (t) => t.duree_max ?? t.nb_jours_max ?? t.solde_par_defaut,
    justificatif: (t) => Boolean(t.justificatif_requis ?? t.attestation_obligatoire),
    labelJustificatif: (t) => t.type_justificatif || "Justificatif",
  };

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

  const ouvrirFormulaire = (type) => {
    setErreurForm(null);
    setTypeEnEdition(type);
    setForm({
      libelle: type.libelle || type.nom || "",
      duree_max: type.duree_max ?? type.nb_jours_max ?? type.solde_par_defaut ?? "",
      description: type.description || "",
      justificatif_requis: lire.justificatif(type),
      type_justificatif: type.type_justificatif || "",
    });
    setFormOuvert(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurForm(null);
    setEnregistrement(true);

    try {
      await api.patch(`/types-conge/${typeEnEdition.id}/`, {
        description: form.description,
      });

      await charger();
      setFormOuvert(false);
    } catch (err) {
      console.error("Erreur serveur :", err.response?.data || err);
      setErreurForm("Erreur lors de la mise à jour de la description.");
    } finally {
      setEnregistrement(false);
    }
  }

  const champ =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#3c0038] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
  const labelCls = "mb-1.5 block text-sm font-semibold text-[#3c0038]";

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* En-tête */}
        <header className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
              Types de congés (Référentiel Réglementaire)
            </h1>
            <p className="mt-1.5 max-w-prose text-sm text-slate-500">
              Les règles de calcul et plafonds sont régis par le Statut Général de la Fonction Publique. 
              Vous pouvez personnaliser les descriptions à titre d'information pour les agents.
            </p>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-[#00efff]/30 border-t border-[#00efff]/30 bg-[#e7ffff]/40">
            {[
              { valeur: stats.total, libelle: "régimes réglementaires" },
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

        {/* Corps */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
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

            {/* Liste */}
            {chargement ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : typesAffiches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#00efff]/60 bg-white px-6 py-16 text-center">
                <p className="text-base font-bold text-[#3c0038]">Aucun type trouvé</p>
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
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 pl-6 shadow-sm ring-1 ring-slate-100"
                    >
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
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm bg-gradient-to-br from-[#3c0038] to-[#93003f]">
                              <Icone d={I.document} className="h-5 w-5" />
                            </span>
                            <h3 className="truncate text-base font-bold text-[#3c0038]">{nom}</h3>
                          </div>
                          
                          {/* Badge Dynamique */}
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            aJustificatif ? "bg-[#93003f]/10 text-[#93003f]" : "bg-[#0097ff]/10 text-[#0097ff]"
                          }`}>
                            <Icone d={aJustificatif ? I.bouclier : I.info} className="h-3.5 w-3.5" />
                            {aJustificatif ? lire.labelJustificatif(t) : "Libre"}
                          </span>
                        </div>

                        <p className="mt-3 min-h-[40px] text-sm text-slate-500 line-clamp-2">
                          {t.description || "Aucune description renseignée."}
                        </p>

                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold tabular-nums text-[#93003f]">
                            {plafond ? plafond : "—"}
                          </span>
                          <span className="text-xs font-medium text-slate-400">jours / an</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
                        <button
                          onClick={() => setTypeSelectionne(t)}
                          className="inline-flex items-center gap-1.5 text-[#0097ff] hover:text-[#3c0038]"
                        >
                          <Icone d={I.oeil} /> Détails
                        </button>
                        <button
                          onClick={() => ouvrirFormulaire(t)}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#3c0038]"
                        >
                          <Icone d={I.crayon} /> Modifier la description
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#3c0038]">Répartition des régimes</h2>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-[#93003f]" style={{ width: `${(stats.avec / repartitionTotal) * 100}%` }} />
                <div className="bg-[#0097ff]" style={{ width: `${(stats.sans / repartitionTotal) * 100}%` }} />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-5">
              <span className="mt-0.5 text-[#0097ff]"><Icone d={I.cadenas} className="h-5 w-5" /></span>
              <p className="text-xs text-slate-600">
                Les droits, plafonds et exigences de justificatifs sont verrouillés conformément à la loi. L'administrateur RH ne peut modifier que les textes explicatifs.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal Edition Description */}
      {formOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-[#93003f] to-[#3c0038] px-6 py-5">
              <h2 className="text-lg font-bold text-white">Modifier la description</h2>
              <p className="text-xs text-white/70">{form.libelle}</p>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="absolute right-4 top-4 text-white/70 hover:text-white"
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
                <label className={labelCls}>Libellé (Réglementaire)</label>
                <input type="text" value={form.libelle} disabled className={champ} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Plafond (jours)</label>
                  <input type="text" value={form.duree_max || "Réglementaire"} disabled className={champ} />
                </div>
                <div>
                  <label className={labelCls}>Justificatif</label>
                  <input
                    type="text"
                    value={form.justificatif_requis ? (form.type_justificatif || "Obligatoire") : "Non requis"}
                    disabled
                    className={champ}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description / Notes d'information</label>
                <textarea
                  ref={champDescription}
                  rows="4"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${champ} resize-none`}
                  placeholder="Expliquez la procédure ou les détails pour les agents..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOuvert(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {enregistrement ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Détails */}
      {typeSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-[#93003f] to-[#3c0038] px-6 py-6">
              <button
                onClick={() => setTypeSelectionne(null)}
                className="absolute right-4 top-4 text-white/70 hover:text-white"
              >
                <Icone d={I.croix} />
              </button>
              <h2 className="text-xl font-bold text-white">{lire.nom(typeSelectionne)}</h2>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-slate-700">
                {typeSelectionne.description || "Aucune précision ajoutée."}
              </p>
              <button
                onClick={() => setTypeSelectionne(null)}
                className="w-full rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-semibold text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}