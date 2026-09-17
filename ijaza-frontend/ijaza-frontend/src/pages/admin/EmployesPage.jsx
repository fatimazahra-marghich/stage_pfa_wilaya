import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

/* ------------------------------------------------------------------ */
/* Icônes                                                             */
/* ------------------------------------------------------------------ */

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
    {Array.isArray(d) ? (
      d.map((p, i) => <path key={i} d={p} />)
    ) : (
      <path d={d} />
    )}
  </svg>
);

const I = {
  plus: "M12 5v14M5 12h14",

  crayon:
    "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",

  corbeille:
    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",

  loupe:
    "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",

  personnes:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",

  personne:
    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",

  bouclier:
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",

  batiment:
    "M3 21h18M6 21V7l6-4 6 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01",

  calendrier:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",

  croix: "M18 6L6 18M6 6l12 12",
};

/* ------------------------------------------------------------------ */
/* Rôles                                                              */
/* ------------------------------------------------------------------ */

const ROLES = {
  ADMIN: {
    label: "Administrateur",
    chip: "bg-[#3c0038]/10 text-[#3c0038]",
  },

  RH: {
    label: "Ressources Humaines",
    chip: "bg-[#93003f]/10 text-[#93003f]",
  },

  MANAGER: {
    label: "Manager",
    chip: "bg-[#0097ff]/10 text-[#0097ff]",
  },

  EMPLOYE: {
    label: "Employé",
    chip: "bg-neutral-100 text-neutral-600",
  },
};

export default function EmployesPage() {
  /* ---------------------------------------------------------------- */
  /* États                                                             */
  /* ---------------------------------------------------------------- */

  const [employes, setEmployes] = useState([]);
  const [departements, setDepartements] = useState([]);

  const [chargement, setChargement] = useState(true);

  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [filtreDept, setFiltreDept] = useState("TOUS");

  const [formOuvert, setFormOuvert] = useState(false);
  const [empEnEdition, setEmpEnEdition] = useState(null);

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "EMPLOYE",
    departement_id: "",
    solde_conge: 30,
    is_active: true,
  });

  /* ---------------------------------------------------------------- */
  /* Chargement des données                                           */
  /* ---------------------------------------------------------------- */

  async function chargerDonnees() {
    setChargement(true);

    try {
      const [resEmp, resDep] = await Promise.all([
        api.get("/utilisateurs/"),
        api.get("/departements/"),
      ]);

      setEmployes(resEmp.data.results ?? resEmp.data);
      setDepartements(resDep.data.results ?? resDep.data);
    } catch (err) {
      console.error("Erreur de chargement des données :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  /* ---------------------------------------------------------------- */
  /* Fermer le formulaire avec Escape                                 */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFormOuvert(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Ouvrir formulaire                                                 */
  /* ---------------------------------------------------------------- */

  const ouvrirFormulaire = (emp = null) => {
    if (emp) {
      setEmpEnEdition(emp);

      setForm({
        email: emp.email || "",
        first_name: emp.first_name || emp.prenom || "",
        last_name: emp.last_name || emp.nom || "",
        password: "",
        role: emp.role || "EMPLOYE",
        departement_id:
          emp.departement?.id || emp.departement || "",
        solde_conge: emp.solde_conge ?? 30,
        is_active: emp.is_active ?? true,
      });
    } else {
      setEmpEnEdition(null);

      setForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        role: "EMPLOYE",
        departement_id: "",
        solde_conge: 30,
        is_active: true,
      });
    }

    setFormOuvert(true);
  };

  /* ---------------------------------------------------------------- */
  /* Modifier formulaire                                               */
  /* ---------------------------------------------------------------- */

  const modifierChamp = (champ, valeur) => {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  };

  /* ---------------------------------------------------------------- */
  /* Enregistrer employé                                               */
  /* ---------------------------------------------------------------- */

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      departement: form.departement_id
        ? parseInt(form.departement_id, 10)
        : null,
      solde_conge: parseFloat(form.solde_conge),
      is_active: form.is_active,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (empEnEdition) {
        await api.patch(
          `/utilisateurs/${empEnEdition.id}/`,
          payload
        );
      } else {
        await api.post("/utilisateurs/", payload);
      }

      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error(
        "Erreur d'enregistrement :",
        err.response?.data || err
      );

      alert("Erreur lors de l'enregistrement de l'employé.");
    }
  }

  /* ---------------------------------------------------------------- */
  /* Supprimer employé                                                */
  /* ---------------------------------------------------------------- */

  async function handleSupprimer(id, nomComplet) {
    if (
      !window.confirm(
        `Voulez-vous supprimer l'utilisateur "${nomComplet}" ?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/utilisateurs/${id}/`);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);

      alert("Impossible de supprimer cet utilisateur.");
    }
  }

  /* ---------------------------------------------------------------- */
  /* Filtrage                                                          */
  /* ---------------------------------------------------------------- */

  const employesFiltres = useMemo(() => {
    const q = recherche.toLowerCase();

    return employes.filter((e) => {
      const nomComplet = `
        ${e.first_name || e.prenom || ""}
        ${e.last_name || e.nom || ""}
      `.toLowerCase();

      const email = (e.email || "").toLowerCase();

      const matchTexte =
        nomComplet.includes(q) || email.includes(q);

      const matchRole =
        filtreRole === "TOUS" || e.role === filtreRole;

      const empDeptId =
        e.departement?.id || e.departement;

      const matchDept =
        filtreDept === "TOUS" ||
        String(empDeptId) === String(filtreDept);

      return matchTexte && matchRole && matchDept;
    });
  }, [
    employes,
    recherche,
    filtreRole,
    filtreDept,
  ]);

  /* ---------------------------------------------------------------- */
  /* Statistiques                                                      */
  /* ---------------------------------------------------------------- */

  const stats = useMemo(() => {
    const total = employes.length;

    const actifs = employes.filter(
      (e) => e.is_active
    ).length;

    const congesTotal = employes.reduce(
      (acc, e) =>
        acc + (Number(e.solde_conge) || 0),
      0
    );

    return {
      total,
      actifs,
      congesTotal,
    };
  }, [employes]);

  /* ---------------------------------------------------------------- */
  /* Classes                                                           */
  /* ---------------------------------------------------------------- */

  const champ =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#0097ff] focus:ring-4 focus:ring-[#0097ff]/10";

  const labelCls =
    "mb-1.5 block text-xs font-semibold text-[#3c0038]";

  /* ---------------------------------------------------------------- */
  /* Rendu                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <MainLayout>
      <div className="min-h-full bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff]">
        <div className="mx-auto max-w-7xl">

          {/* ======================================================== */}
          {/* EN-TÊTE                                                   */}
          {/* ======================================================== */}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3c0038] text-white shadow-sm">
                  <Icone
                    d={I.personnes}
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
                    Employés
                  </h1>

                  <p className="text-sm text-neutral-500">
                    Gestion des utilisateurs de l'entreprise
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => ouvrirFormulaire()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3c0038] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#93003f] focus:outline-none focus:ring-4 focus:ring-[#3c0038]/10"
            >
              <Icone d={I.plus} />
              Ajouter un employé
            </button>
          </div>

          {/* ======================================================== */}
          {/* STATISTIQUES                                               */}
          {/* ======================================================== */}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Total */}
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    Total employés
                  </p>

                  <p className="mt-1 text-3xl font-bold text-[#3c0038]">
                    {stats.total}
                  </p>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#3c0038]/10 text-[#3c0038]">
                  <Icone
                    d={I.personnes}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>

            {/* Actifs */}
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    Employés actifs
                  </p>

                  <p className="mt-1 text-3xl font-bold text-[#0097ff]">
                    {stats.actifs}
                  </p>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0097ff]/10 text-[#0097ff]">
                  <Icone
                    d={I.personne}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>

            {/* Congés */}
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    Solde congés total
                  </p>

                  <p className="mt-1 text-3xl font-bold text-[#93003f]">
                    {stats.congesTotal}
                  </p>

                  <p className="text-xs text-neutral-400">
                    jours disponibles
                  </p>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#93003f]/10 text-[#93003f]">
                  <Icone
                    d={I.calendrier}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* FILTRES                                                    */}
          {/* ======================================================== */}

          <div className="mb-6 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="grid gap-4 md:grid-cols-3">

              {/* Recherche */}
              <div>
                <label className={labelCls}>
                  Rechercher
                </label>

                <div className="relative">
                  <Icone
                    d={I.loupe}
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    type="text"
                    value={recherche}
                    onChange={(e) =>
                      setRecherche(e.target.value)
                    }
                    placeholder="Nom ou email..."
                    className={`${champ} pl-10`}
                  />
                </div>
              </div>

              {/* Rôle */}
              <div>
                <label className={labelCls}>
                  Rôle
                </label>

                <select
                  value={filtreRole}
                  onChange={(e) =>
                    setFiltreRole(e.target.value)
                  }
                  className={champ}
                >
                  <option value="TOUS">
                    Tous les rôles
                  </option>

                  {Object.entries(ROLES).map(
                    ([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Département */}
              <div>
                <label className={labelCls}>
                  Département
                </label>

                <select
                  value={filtreDept}
                  onChange={(e) =>
                    setFiltreDept(e.target.value)
                  }
                  className={champ}
                >
                  <option value="TOUS">
                    Tous les départements
                  </option>

                  {departements.map((dept) => (
                    <option
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.nom ||
                        dept.name ||
                        dept.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TABLEAU                                                    */}
          {/* ======================================================== */}

          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm">

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">

                <thead className="border-b border-neutral-100 bg-neutral-50/80">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Employé
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Rôle
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Département
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Solde congé
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Statut
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">

                  {chargement ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-12 text-center"
                      >
                        <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0097ff]/20 border-t-[#0097ff]" />
                          Chargement des employés...
                        </div>
                      </td>
                    </tr>
                  ) : employesFiltres.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-12 text-center"
                      >
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                          <Icone
                            d={I.personnes}
                            className="h-6 w-6"
                          />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-neutral-700">
                          Aucun employé trouvé
                        </p>

                        <p className="mt-1 text-xs text-neutral-400">
                          Modifiez vos critères de recherche.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    employesFiltres.map((emp) => {
                      const prenom =
                        emp.first_name ||
                        emp.prenom ||
                        "";

                      const nom =
                        emp.last_name ||
                        emp.nom ||
                        "";

                      const nomComplet =
                        `${prenom} ${nom}`.trim();

                      const role =
                        ROLES[emp.role] ||
                        ROLES.EMPLOYE;

                      const departement =
                        emp.departement?.nom ||
                        emp.departement?.name ||
                        emp.departement?.libelle ||
                        "—";

                      return (
                        <tr
                          key={emp.id}
                          className="transition hover:bg-[#e7ffff]/40"
                        >

                          {/* Employé */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">

                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3c0038] to-[#93003f] text-sm font-bold text-white">
                                {(
                                  prenom?.[0] ||
                                  nom?.[0] ||
                                  "?"
                                ).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#3c0038]">
                                  {nomComplet ||
                                    "Sans nom"}
                                </p>

                                <p className="truncate text-xs text-neutral-500">
                                  {emp.email ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Rôle */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${role.chip}`}
                            >
                              {role.label}
                            </span>
                          </td>

                          {/* Département */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-neutral-700">
                              <Icone
                                d={I.batiment}
                                className="h-4 w-4 text-neutral-400"
                              />

                              {departement}
                            </div>
                          </td>

                          {/* Solde */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Icone
                                d={I.calendrier}
                                className="h-4 w-4 text-[#0097ff]"
                              />

                              <span className="text-sm font-semibold text-neutral-700">
                                {Number(
                                  emp.solde_conge || 0
                                )}
                              </span>

                              <span className="text-xs text-neutral-400">
                                jours
                              </span>
                            </div>
                          </td>

                          {/* Statut */}
                          <td className="px-5 py-4">
                            {emp.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                                Inactif
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  ouvrirFormulaire(emp)
                                }
                                className="grid h-9 w-9 place-items-center rounded-lg border border-[#0097ff]/20 text-[#0097ff] transition hover:bg-[#0097ff]/10"
                                title="Modifier"
                              >
                                <Icone
                                  d={I.crayon}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSupprimer(
                                    emp.id,
                                    nomComplet
                                  )
                                }
                                className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Icone
                                  d={I.corbeille}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                </tbody>
              </table>
            </div>

            {/* Résultat */}
            {!chargement &&
              employesFiltres.length > 0 && (
                <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
                  <p className="text-xs text-neutral-500">
                    {employesFiltres.length} employé
                    {employesFiltres.length > 1
                      ? "s"
                      : ""}{" "}
                    affiché
                    {employesFiltres.length > 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL AJOUT / MODIFICATION                                    */}
      {/* ============================================================ */}

      {formOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-[#3c0038]/40 backdrop-blur-sm"
            onClick={() => setFormOuvert(false)}
          />

          {/* Modal */}
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* Header modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-[#3c0038]">
                  {empEnEdition
                    ? "Modifier l'employé"
                    : "Ajouter un employé"}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {empEnEdition
                    ? "Modifiez les informations de cet utilisateur."
                    : "Renseignez les informations du nouvel utilisateur."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-[#3c0038]"
                aria-label="Fermer"
              >
                <Icone d={I.croix} />
              </button>
            </div>

            {/* Formulaire */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >

              {/* Nom / prénom */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className={labelCls}>
                    Prénom
                  </label>

                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) =>
                      modifierChamp(
                        "first_name",
                        e.target.value
                      )
                    }
                    className={champ}
                    placeholder="Prénom"
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Nom
                  </label>

                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) =>
                      modifierChamp(
                        "last_name",
                        e.target.value
                      )
                    }
                    className={champ}
                    placeholder="Nom"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>
                  Adresse email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    modifierChamp(
                      "email",
                      e.target.value
                    )
                  }
                  className={champ}
                  placeholder="exemple@entreprise.com"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className={labelCls}>
                  Mot de passe
                  {empEnEdition && (
                    <span className="ml-1 font-normal text-neutral-400">
                      (laisser vide pour conserver)
                    </span>
                  )}
                </label>

                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    modifierChamp(
                      "password",
                      e.target.value
                    )
                  }
                  className={champ}
                  placeholder={
                    empEnEdition
                      ? "Nouveau mot de passe"
                      : "Mot de passe"
                  }
                  required={!empEnEdition}
                />
              </div>

              {/* Rôle / département */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className={labelCls}>
                    Rôle
                  </label>

                  <select
                    value={form.role}
                    onChange={(e) =>
                      modifierChamp(
                        "role",
                        e.target.value
                      )
                    }
                    className={champ}
                  >
                    {Object.entries(ROLES).map(
                      ([key, value]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {value.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Département
                  </label>

                  <select
                    value={form.departement_id}
                    onChange={(e) =>
                      modifierChamp(
                        "departement_id",
                        e.target.value
                      )
                    }
                    className={champ}
                  >
                    <option value="">
                      Aucun département
                    </option>

                    {departements.map((dept) => (
                      <option
                        key={dept.id}
                        value={dept.id}
                      >
                        {dept.nom ||
                          dept.name ||
                          dept.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Solde congé */}
              <div>
                <label className={labelCls}>
                  Solde de congé
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.solde_conge}
                    onChange={(e) =>
                      modifierChamp(
                        "solde_conge",
                        e.target.value
                      )
                    }
                    className={`${champ} pr-16`}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                    jours
                  </span>
                </div>
              </div>

              {/* Actif */}
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-4">

                  <div>
                    <p className="text-sm font-semibold text-[#3c0038]">
                      Compte actif
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      L'utilisateur pourra se connecter à
                      l'application.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      modifierChamp(
                        "is_active",
                        e.target.checked
                      )
                    }
                    className="h-5 w-5 rounded border-neutral-300 text-[#3c0038] focus:ring-[#0097ff]"
                  />
                </label>
              </div>

              {/* Boutons */}
              <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    setFormOuvert(false)
                  }
                  className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#3c0038] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#93003f]"
                >
                  {empEnEdition
                    ? "Enregistrer les modifications"
                    : "Ajouter l'employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}