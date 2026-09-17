import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
/* ------------------------------------------------------------------ */
/* Palette du projet                                                  */
/*   #3c0038 prune · #93003f bordeaux · #0097ff bleu                   */
/*   #00efff cyan  · #a2caca cyan pâle                                */
/* ------------------------------------------------------------------ */

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
  croix: "M18 6L6 18M6 6l12 12",
  batiment: "M3 21h18M6 21V7l6-4 6 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01",
  personne: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  hierarchie: "M12 3v6M12 15v6M5 21v-3a2 2 0 012-2h10a2 2 0 012 2v3M4 9h16",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  lien: "M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8",
};

export default function StructureAdminPage() {
  const [departements, setDepartements] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const [formOuvert, setFormOuvert] = useState(false);
  const [elementEnEdition, setElementEnEdition] = useState(null);
  const [detail, setDetail] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);
  const [notification, setNotification] = useState(null);

  const champNom = useRef(null);

  const [form, setForm] = useState({
    nom: "",
    code: "",
    responsable_id: "",
    parent_id: "",
    description: "",
  });

  async function chargerDonnees() {
    setChargement(true);
    setErreurChargement(null);
    try {
      const [resDep, resUser] = await Promise.all([
        api.get("/departements/"),
        api.get("/utilisateurs/"),
      ]);
      setDepartements(resDep.data.results ?? resDep.data ?? []);
      setUtilisateurs(resUser.data.results ?? resUser.data ?? []);
    } catch (err) {
      console.error("Erreur de chargement :", err);
      setErreurChargement("Impossible de charger la structure administrative.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  function notifier(type, message) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }

  const idParent = (d) => d?.parent?.id ?? d?.parent ?? null;
  const idResp = (d) => d?.responsable?.id ?? d?.responsable ?? null;
  const nomDep = (d) => d?.nom || d?.libelle || "—";

  const trouverParent = (dep) =>
    departements.find((d) => d.id === idParent(dep)) || null;
  const trouverResp = (dep) =>
    utilisateurs.find((u) => u.id === idResp(dep)) || null;

  const nomUser = (u) =>
    u ? `${u.first_name || u.prenom || ""} ${u.last_name || u.nom || ""}`.trim() : "";

  function idsInterdits(currentId) {
    if (!currentId) return new Set();
    const interdits = new Set([currentId]);
    let ajout = true;
    while (ajout) {
      ajout = false;
      for (const d of departements) {
        const p = idParent(d);
        if (p && interdits.has(p) && !interdits.has(d.id)) {
          interdits.add(d.id);
          ajout = true;
        }
      }
    }
    return interdits;
  }

  const stats = useMemo(() => {
    const total = departements.length;
    const sansResp = departements.filter((d) => !idResp(d)).length;
    const racines = departements.filter((d) => !idParent(d)).length;
    return { total, sansResp, racines };
  }, [departements, utilisateurs]);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return departements.filter((d) => {
      if (q) {
        const cible = `${nomDep(d)} ${d.code || ""}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      if (filtre === "racine") return !idParent(d);
      if (filtre === "assigne") return !!idResp(d);
      if (filtre === "sans") return !idResp(d);
      return true;
    });
  }, [departements, utilisateurs, recherche, filtre]);

  const ouvrirFormulaire = (dep = null) => {
    setErreurForm(null);
    if (dep) {
      setElementEnEdition(dep);
      setForm({
        nom: nomDep(dep) === "—" ? "" : nomDep(dep),
        code: dep.code || "",
        responsable_id: idResp(dep) || "",
        parent_id: idParent(dep) || "",
        description: dep.description || "",
      });
    } else {
      setElementEnEdition(null);
      setForm({ nom: "", code: "", responsable_id: "", parent_id: "", description: "" });
    }
    setFormOuvert(true);
    setTimeout(() => champNom.current?.focus(), 50);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurForm(null);
    if (!form.nom.trim()) {
      setErreurForm("Le nom du département est obligatoire.");
      return;
    }
    const payload = {
      nom: form.nom.trim(),
      code: form.code ? form.code.trim() : null,
      responsable: form.responsable_id ? parseInt(form.responsable_id, 10) : null,
      parent: form.parent_id ? parseInt(form.parent_id, 10) : null,
      description: form.description || "",
    };
    setEnregistrement(true);
    try {
      if (elementEnEdition) {
        await api.patch(`/departements/${elementEnEdition.id}/`, payload);
        notifier("succes", "Département mis à jour.");
      } else {
        await api.post("/departements/", payload);
        notifier("succes", "Département créé.");
      }
      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error("Détails erreur API :", err.response?.data);
      const data = err.response?.data;
      const msg =
        typeof data === "object" && data
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ")
          : data || "Impossible de contacter le serveur.";
      setErreurForm(msg);
    } finally {
      setEnregistrement(false);
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    try {
      await api.delete(`/departements/${aSupprimer.id}/`);
      notifier("succes", "Département supprimé.");
      setASupprimer(null);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      notifier("erreur", "Impossible de supprimer cet élément.");
      setASupprimer(null);
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setFormOuvert(false);
      setDetail(null);
      setASupprimer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const labelCls = "mb-1.5 block text-sm font-semibold text-[#3c0038]";
  const champ =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#0097ff] focus:ring-4 focus:ring-[#0097ff]/10";

  const onglets = [
    { id: "tous", label: "Tous" },
    { id: "racine", label: "Indépendants" },
    { id: "assigne", label: "Avec responsable" },
    { id: "sans", label: "Sans responsable" },
  ];

  return (
    <MainLayout>
      {/* Conteneur principal avec fond dégradé doux et padding adaptatif */}
{/* LIGNE 173 CORRIGÉE (marges supprimées) */}
<div className="min-h-full bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff]">      
    <div className="mx-auto max-w-7xl">
          {/* En-tête */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#93003f] to-[#3c0038] text-white shadow-md">
                  <Icone d={I.batiment} className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#3c0038] sm:text-3xl">
                    Structure administrative
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-neutral-500">
                    Départements, services et hiérarchie interne. Chaque entité peut être rattachée
                    à un parent et pilotée par un responsable.
                  </p>
                </div>
              </div>
              <button
                onClick={() => ouvrirFormulaire()}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg active:scale-[0.98]"
              >
                <Icone d={I.plus} className="h-4 w-4" />
                Nouvelle entité
              </button>
            </div>

            {/* Barre de synthèse */}
            <div className="grid grid-cols-1 divide-y divide-neutral-100 border-t border-neutral-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { valeur: stats.total, label: "entités enregistrées", couleur: "#93003f", icone: I.batiment },
                { valeur: stats.racines, label: "structures indépendantes", couleur: "#0097ff", icone: I.hierarchie },
                { valeur: stats.sansResp, label: "sans responsable", couleur: "#3c0038", icone: I.personne },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-50 text-neutral-500" style={{ color: s.couleur }}>
                    <Icone d={s.icone} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold leading-none" style={{ color: s.couleur }}>
                      {s.valeur}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-200 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Icone d={I.loupe} className="h-4 w-4" />
              </span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un nom ou un code…"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/60 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0097ff] focus:bg-white focus:ring-4 focus:ring-[#0097ff]/10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1">
              {onglets.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setFiltre(o.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                    filtre === o.id
                      ? "bg-gradient-to-r from-[#93003f] to-[#3c0038] text-white shadow"
                      : "text-neutral-600 hover:text-[#3c0038]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu principal */}
          {chargement ? (
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-neutral-100 p-4 last:border-0">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : erreurChargement ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-neutral-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Icone d={I.alerte} className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-neutral-600">{erreurChargement}</p>
              <button
                onClick={chargerDonnees}
                className="rounded-xl bg-[#3c0038] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#93003f]"
              >
                Recharger
              </button>
            </div>
          ) : liste.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white p-14 text-center shadow-sm ring-1 ring-neutral-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7ffff] text-[#0097ff]">
                <Icone d={I.batiment} className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-neutral-600">
                {recherche || filtre !== "tous"
                  ? "Aucune entité ne correspond à votre recherche."
                  : "Aucun département enregistré pour le moment."}
              </p>
              {!recherche && filtre === "tous" && (
                <button
                  onClick={() => ouvrirFormulaire()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  <Icone d={I.plus} className="h-4 w-4" />
                  Créer la première entité
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
              <div className="hidden grid-cols-12 gap-4 border-b border-neutral-100 bg-neutral-50/70 px-5 py-3 text-xs font-bold uppercase tracking-wide text-neutral-400 md:grid">
                <div className="col-span-4">Département / Service</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-3">Rattaché à</div>
                <div className="col-span-2">Responsable</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <ul className="divide-y divide-neutral-100">
                {liste.map((dep) => {
                  const parent = trouverParent(dep);
                  const resp = trouverResp(dep);
                  const racine = !idParent(dep);
                  return (
                    <li
                      key={dep.id}
                      className="group grid grid-cols-1 items-center gap-3 px-5 py-4 transition hover:bg-neutral-50/70 md:grid-cols-12 md:gap-4"
                    >
                      {/* Nom + icône */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                          style={{
                            background: racine
                              ? "linear-gradient(135deg,#93003f,#3c0038)"
                              : "linear-gradient(135deg,#0097ff,#00efff)",
                          }}
                        >
                          <Icone d={racine ? I.batiment : I.hierarchie} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setDetail(dep)}
                            className="block truncate text-left text-sm font-bold text-[#3c0038] hover:underline"
                          >
                            {nomDep(dep)}
                          </button>
                          {dep.description && (
                            <p className="truncate text-xs text-neutral-400">{dep.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Code */}
                      <div className="col-span-2">
                        {dep.code ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold text-neutral-600">
                            <Icone d={I.hash} className="h-3.5 w-3.5" />
                            {dep.code}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-300">—</span>
                        )}
                      </div>

                      {/* Parent */}
                      <div className="col-span-3">
                        {parent ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
                            <Icone d={I.lien} className="h-4 w-4 text-neutral-400" />
                            {nomDep(parent)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7ffff] px-2.5 py-1 text-xs font-semibold text-[#0097ff]">
                            Indépendant
                          </span>
                        )}
                      </div>

                      {/* Responsable */}
                      <div className="col-span-2">
                        {resp ? (
                          <span className="inline-flex items-center gap-2 text-sm text-neutral-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3c0038] text-[10px] font-bold text-white">
                              {(nomUser(resp)[0] || "?").toUpperCase()}
                            </span>
                            <span className="truncate">{nomUser(resp) || "—"}</span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-neutral-400">Non assigné</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-start gap-1 md:justify-end">
                        <button
                          onClick={() => setDetail(dep)}
                          title="Détails"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-[#e7ffff] hover:text-[#0097ff]"
                        >
                          <Icone d={I.oeil} />
                        </button>
                        <button
                          onClick={() => ouvrirFormulaire(dep)}
                          title="Modifier"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-[#e7ffff] hover:text-[#3c0038]"
                        >
                          <Icone d={I.crayon} />
                        </button>
                        <button
                          onClick={() => setASupprimer(dep)}
                          title="Supprimer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Icone d={I.corbeille} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in fade-in slide-in-from-bottom-4">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              notification.type === "succes" ? "bg-[#3c0038]" : "bg-red-600"
            }`}
          >
            <Icone d={notification.type === "succes" ? I.info : I.alerte} className="h-5 w-5" />
            {notification.message}
          </div>
        </div>
      )}

      {/* Modale formulaire */}
      {formOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setFormOuvert(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-[#93003f] to-[#3c0038] px-6 py-5 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Icone d={elementEnEdition ? I.crayon : I.plus} className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {elementEnEdition ? "Modifier l'entité" : "Nouvelle entité"}
                </h2>
                <p className="text-xs text-white/70">
                  {elementEnEdition
                    ? "Mettez à jour les informations du département."
                    : "Renseignez les informations du nouveau département."}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {erreurForm && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                  <Icone d={I.alerte} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="whitespace-pre-wrap">{erreurForm}</span>
                </div>
              )}

              <div>
                <label className={labelCls}>Nom du département / service *</label>
                <input
                  ref={champNom}
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className={champ}
                  placeholder="ex : Direction technique"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ex : DT, RH…"
                    className={champ}
                  />
                </div>
                <div>
                  <label className={labelCls}>Rattaché à</label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                    className={champ}
                  >
                    <option value="">— Indépendant —</option>
                    {departements
                      .filter((d) => !idsInterdits(elementEnEdition?.id).has(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {nomDep(d)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Responsable (Manager)</label>
                <select
                  value={form.responsable_id}
                  onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                  className={champ}
                >
                  <option value="">— Aucun responsable —</option>
                  {utilisateurs.map((u) => (
                    <option key={u.id} value={u.id}>
                      {nomUser(u) || `Utilisateur ${u.id}`} ({u.role || "EMPLOYE"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="2"
                  placeholder="Rôle de ce département…"
                  className={champ}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={enregistrement}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale détails */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div
              className="relative px-6 py-6 text-white"
              style={{
                background: idParent(detail)
                  ? "linear-gradient(135deg,#0097ff,#00efff)"
                  : "linear-gradient(135deg,#93003f,#3c0038)",
              }}
            >
              <button
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
              >
                <Icone d={I.croix} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Icone d={idParent(detail) ? I.hierarchie : I.batiment} className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{nomDep(detail)}</h2>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
                    {idParent(detail) ? "Sous-entité" : "Structure indépendante"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-6">
              {detail.description && (
                <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  {detail.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                    <Icone d={I.hash} className="h-4 w-4" /> Code
                  </div>
                  <div className="font-mono text-sm font-bold text-[#3c0038]">
                    {detail.code || "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                    <Icone d={I.lien} className="h-4 w-4" /> Rattaché à
                  </div>
                  <div className="text-sm font-bold text-[#3c0038]">
                    {trouverParent(detail) ? nomDep(trouverParent(detail)) : "Indépendant"}
                  </div>
                </div>
                <div className="col-span-2 rounded-xl bg-neutral-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                    <Icone d={I.personne} className="h-4 w-4" /> Responsable
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#3c0038]">
                    {trouverResp(detail) ? (
                      <>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3c0038] text-[10px] font-bold text-white">
                          {(nomUser(trouverResp(detail))[0] || "?").toUpperCase()}
                        </span>
                        {nomUser(trouverResp(detail))}
                      </>
                    ) : (
                      <span className="italic text-neutral-400">Non assigné</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                onClick={() => {
                  const d = detail;
                  setDetail(null);
                  ouvrirFormulaire(d);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
              >
                <Icone d={I.crayon} className="h-4 w-4" />
                Modifier
              </button>
              <button
                onClick={() => setDetail(null)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setASupprimer(null)}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Icone d={I.corbeille} className="h-6 w-6" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-bold text-[#3c0038]">Supprimer cette entité ?</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Vous allez supprimer <strong className="text-neutral-800">{nomDep(aSupprimer)}</strong>. Cette action est irréversible.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setASupprimer(null)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
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