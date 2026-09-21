import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

/* ------------------------------------------------------------------ */
/* Icônes                                                             */
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
  chevronBas: "M19 9l-7 7-7-7",
  chevronDroite: "M9 5l7 7-7 7",
};

// Extraction universelle des ID
const extraireId = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val.id ?? val.pk ?? null;
  return Number(val) || val;
};

// Extraction universelle du nom complet
const nomUser = (u) => {
  if (!u) return "";
  if (typeof u === "string") return u;
  const prenom = u.first_name || u.prenom || u.firstName || "";
  const nom = u.last_name || u.nom || u.lastName || "";
  const complet = `${prenom} ${nom}`.trim();
  return complet || u.username || u.email || `Employé #${u.id}`;
};

export default function StructureAdminPage() {
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [noeudsDeplies, setNoeudsDeplies] = useState(new Set());

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
    type: "division",
    responsable_id: "",
    parent_id: "",
    description: "",
  });

  const chargerDonnees = async () => {
    setChargement(true);
    setErreurChargement(null);
    try {
      const [resDivisions, resServices, resUsers] = await Promise.all([
        api.get("/organisation/divisions/"),
        api.get("/organisation/services/"),
        api.get("/users/")
      ]);

      const divisionsData = Array.isArray(resDivisions.data) 
        ? resDivisions.data 
        : (resDivisions.data.results || []);

      const servicesData = Array.isArray(resServices.data) 
        ? resServices.data 
        : (resServices.data.results || []);

      const usersData = Array.isArray(resUsers.data) 
        ? resUsers.data 
        : (resUsers.data.results || []);

      setDivisions(divisionsData.map(d => ({ ...d, _type: 'division' })));
      setServices(servicesData.map(s => ({ ...s, _type: 'service' })));
      setUtilisateurs(usersData);

      const ouverts = new Set();
      divisionsData.forEach(d => ouverts.add(`div_${d.id}`));
      servicesData.forEach(s => ouverts.add(`srv_${s.id}`));
      setNoeudsDeplies(ouverts);

    } catch (error) {
      console.error("Erreur de chargement :", error);
      setErreurChargement("Impossible de charger la structure organisationnelle.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  function notifier(type, message) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }

  const basculerNoeud = (cle, e) => {
    e?.stopPropagation();
    setNoeudsDeplies((prev) => {
      const suite = new Set(prev);
      if (suite.has(cle)) suite.delete(cle);
      else suite.add(cle);
      return suite;
    });
  };

  const idParent = (d) => extraireId(d?.parent) ?? extraireId(d?.division);
  const idResp = (d) => extraireId(d?.responsable) ?? extraireId(d?.chef);
  const nomDep = (d) => d?.nom || d?.libelle || "—";

  const trouverParent = (dep) =>
    [...divisions, ...services].find((d) => Number(d.id) === Number(idParent(dep))) || null;

  const nomResponsableAffichage = (dep) => {
    const u = utilisateurs.find((user) => Number(user.id) === Number(idResp(dep)));
    if (u) return nomUser(u);
    return dep?.responsable_nom || dep?.chef_nom || "Non assigné";
  };

  const stats = useMemo(() => {
    const toutes = [...divisions, ...services];
    return {
      total: toutes.length,
      sansResp: toutes.filter((d) => !idResp(d)).length,
      racines: divisions.length,
    };
  }, [divisions, services]);

  const arbreOrganisation = useMemo(() => {
    const q = recherche.trim().toLowerCase();

    return divisions.map((div) => {
      const divId = Number(div.id);

      const servicesRattaches = services.filter((srv) => Number(idParent(srv)) === divId);

      const employesDiv = utilisateurs.filter((u) => {
        const uDivId = extraireId(u.division) ?? extraireId(u.division_id) ?? extraireId(u.departement);
        const uSrvId = extraireId(u.service) ?? extraireId(u.service_id);
        return Number(uDivId) === divId && !uSrvId;
      });

      const servicesEnrichis = servicesRattaches.map((srv) => {
        const srvId = Number(srv.id);
        const employesSrv = utilisateurs.filter((u) => {
          const uSrvId = extraireId(u.service) ?? extraireId(u.service_id);
          return Number(uSrvId) === srvId;
        });

        return { ...srv, employes: employesSrv };
      });

      return {
        ...div,
        services: servicesEnrichis,
        employesDirects: employesDiv,
      };
    }).filter((div) => {
      if (filtre === "racine" && div.services.length > 0) return true;
      if (filtre === "assigne" && !idResp(div)) return false;
      if (filtre === "sans" && idResp(div)) return false;

      if (!q) return true;
      const matchDiv = nomDep(div).toLowerCase().includes(q) || (div.code && div.code.toLowerCase().includes(q));
      const matchSrv = div.services.some(s => nomDep(s).toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)));
      const matchEmp = div.employesDirects.some(e => nomUser(e).toLowerCase().includes(q)) ||
                       div.services.some(s => s.employes.some(e => nomUser(e).toLowerCase().includes(q)));

      return matchDiv || matchSrv || matchEmp;
    });
  }, [divisions, services, utilisateurs, recherche, filtre]);

  const ouvrirFormulaire = (dep = null, parentForce = null) => {
    setErreurForm(null);
    if (dep) {
      setElementEnEdition(dep);
      setForm({
        nom: nomDep(dep) === "—" ? "" : nomDep(dep),
        code: dep.code || "",
        type: dep._type || "division",
        responsable_id: idResp(dep) || "",
        parent_id: idParent(dep) || "",
        description: dep.description || "",
      });
    } else {
      setElementEnEdition(null);
      setForm({
        nom: "",
        code: "",
        type: parentForce ? "service" : "division",
        responsable_id: "",
        parent_id: parentForce ? parentForce.id : "",
        description: "",
      });
    }
    setFormOuvert(true);
    setTimeout(() => champNom.current?.focus(), 50);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurForm(null);

    if (!form.nom.trim()) {
      setErreurForm("Le nom de la structure est obligatoire.");
      return;
    }

    const isService = form.type === "service";
    const endpoint = isService ? "/organisation/services/" : "/organisation/divisions/";

    const payload = {
      nom: form.nom.trim(),
      code: form.code ? form.code.trim() : "",
      description: form.description || "",
    };

    if (isService) {
      payload.chef = form.responsable_id ? parseInt(form.responsable_id, 10) : null;
      payload.division = form.parent_id ? parseInt(form.parent_id, 10) : null;
    } else {
      payload.responsable = form.responsable_id ? parseInt(form.responsable_id, 10) : null;
      payload.parent = form.parent_id ? parseInt(form.parent_id, 10) : null;
    }

    setEnregistrement(true);

    try {
      if (elementEnEdition) {
        const editEndpoint = elementEnEdition._type === "service" ? "/organisation/services/" : "/organisation/divisions/";
        await api.patch(`${editEndpoint}${elementEnEdition.id}/`, payload);
        notifier("succes", "Mise à jour effectuée avec succès.");
      } else {
        await api.post(endpoint, payload);
        notifier("succes", "Création effectuée avec succès.");
      }

      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur API :", err.response?.data);
      const data = err.response?.data;
      const msg =
        typeof data === "object" && data
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join(" · ")
          : data || "Impossible de contacter le serveur.";
      setErreurForm(msg);
    } finally {
      setEnregistrement(false);
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    try {
      const endpoint = aSupprimer._type === "service" ? "/organisation/services/" : "/organisation/divisions/";
      await api.delete(`${endpoint}${aSupprimer.id}/`);
      notifier("succes", "Élément supprimé.");
      setASupprimer(null);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      notifier("erreur", "Impossible de supprimer cet élément.");
      setASupprimer(null);
    }
  }

  const labelCls = "mb-1.5 block text-sm font-semibold text-[#3c0038]";
  const champ =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#0097ff] focus:ring-4 focus:ring-[#0097ff]/10";

  const onglets = [
    { id: "tous", label: "Tous" },
    { id: "assigne", label: "Avec responsable" },
    { id: "sans", label: "Sans responsable" },
  ];

  return (
    <MainLayout>
      <div className="min-h-full bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff] p-4 sm:p-6 lg:p-8"> 
        <div className="mx-auto max-w-7xl">
          
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
                    Arbre hiérarchique : Divisions → Services → Employés rattachés.
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

            <div className="grid grid-cols-1 divide-y divide-neutral-100 border-t border-neutral-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { valeur: stats.total, label: "entités enregistrées", couleur: "#93003f", icone: I.batiment },
                { valeur: stats.racines, label: "divisions principales", couleur: "#0097ff", icone: I.hierarchie },
                { valeur: stats.sansResp, label: "sans responsable", couleur: "#3c0038", icone: I.personne },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-50" style={{ color: s.couleur }}>
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

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-200 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-sm">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Icone d={I.loupe} className="h-4 w-4" />
              </span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une division, service, employé..."
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

          {chargement ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center text-neutral-500 shadow-sm ring-1 ring-neutral-200">
              Chargement de l'arbre...
            </div>
          ) : erreurChargement ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-neutral-200">
              {erreurChargement}
            </div>
          ) : arbreOrganisation.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-12 text-center text-neutral-500 shadow-sm ring-1 ring-neutral-200">
              Aucune structure organisationnelle trouvée.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {arbreOrganisation.map((division) => {
                const cleDiv = `div_${division.id}`;
                const estDeplieDiv = noeudsDeplies.has(cleDiv);

                return (
                  <div
                    key={cleDiv}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200"
                  >
                    <div className="flex items-center justify-between border-l-4 border-l-[#93003f] bg-neutral-50/70 p-4 hover:bg-neutral-100/60 transition">
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => basculerNoeud(cleDiv, e)} className="text-neutral-500 hover:text-[#3c0038]">
                          <Icone d={estDeplieDiv ? I.chevronBas : I.chevronDroite} className="h-5 w-5" />
                        </button>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#93003f] to-[#3c0038] text-white shadow-xs">
                          <Icone d={I.batiment} className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#3c0038]">{nomDep(division)}</span>
                            {division.code && (
                              <span className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-xs font-bold text-neutral-600">
                                #{division.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            Responsable : <span className="font-semibold text-neutral-700">{nomResponsableAffichage(division)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden text-xs font-semibold text-neutral-400 sm:inline-block">
                          {division.services.length} service(s) • {division.employesDirects.length} emp. direct(s)
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => ouvrirFormulaire(null, division)}
                            title="Ajouter un service"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-[#e7ffff] hover:text-[#0097ff]"
                          >
                            <Icone d={I.plus} />
                          </button>
                          <button
                            onClick={() => setDetail(division)}
                            title="Détails"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-[#e7ffff] hover:text-[#0097ff]"
                          >
                            <Icone d={I.oeil} />
                          </button>
                          <button
                            onClick={() => ouvrirFormulaire(division)}
                            title="Modifier"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-[#e7ffff] hover:text-[#3c0038]"
                          >
                            <Icone d={I.crayon} />
                          </button>
                          <button
                            onClick={() => setASupprimer(division)}
                            title="Supprimer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Icone d={I.corbeille} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {estDeplieDiv && (
                      <div className="border-t border-neutral-100 p-4 pl-6 sm:pl-10 space-y-3">
                        {division.employesDirects.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                              Employés directs de la division ({division.employesDirects.length})
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {division.employesDirects.map((emp) => (
                                <CarteEmploye key={emp.id} employe={emp} />
                              ))}
                            </div>
                          </div>
                        )}

                        {division.services.length === 0 && division.employesDirects.length === 0 ? (
                          <p className="py-2 text-xs italic text-neutral-400">Aucun service ou employé rattaché.</p>
                        ) : (
                          division.services.map((service) => {
                            const cleSrv = `srv_${service.id}`;
                            const estDeplieSrv = noeudsDeplies.has(cleSrv);

                            return (
                              <div
                                key={cleSrv}
                                className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs"
                              >
                                <div className="flex items-center justify-between bg-neutral-50/80 p-3 hover:bg-neutral-100/50 transition">
                                  <div className="flex items-center gap-3">
                                    <button onClick={(e) => basculerNoeud(cleSrv, e)} className="text-neutral-400 hover:text-[#0097ff]">
                                      <Icone d={estDeplieSrv ? I.chevronBas : I.chevronDroite} className="h-4 w-4" />
                                    </button>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0097ff] to-[#00efff] text-white">
                                      <Icone d={I.hierarchie} className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-neutral-800">{nomDep(service)}</span>
                                        {service.code && (
                                          <span className="rounded bg-neutral-200/60 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">
                                            #{service.code}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-neutral-500">
                                        Chef : <span className="font-semibold text-neutral-700">{nomResponsableAffichage(service)}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-neutral-400">
                                      {service.employes.length} employé(s)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setDetail(service)}
                                        title="Détails"
                                        className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-[#e7ffff] hover:text-[#0097ff]"
                                      >
                                        <Icone d={I.oeil} />
                                      </button>
                                      <button
                                        onClick={() => ouvrirFormulaire(service)}
                                        title="Modifier"
                                        className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                                      >
                                        <Icone d={I.crayon} />
                                      </button>
                                      <button
                                        onClick={() => setASupprimer(service)}
                                        title="Supprimer"
                                        className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Icone d={I.corbeille} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {estDeplieSrv && (
                                  <div className="border-t border-neutral-100 p-3 bg-neutral-50/20">
                                    {service.employes.length === 0 ? (
                                      <p className="py-1 text-xs italic text-neutral-400">Aucun employé dans ce service.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {service.employes.map((emp) => (
                                          <CarteEmploye key={emp.id} employe={emp} />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            notification.type === "succes" ? "bg-[#3c0038]" : "bg-red-600"
          }`}>
            <Icone d={notification.type === "succes" ? I.info : I.alerte} className="h-5 w-5" />
            {notification.message}
          </div>
        </div>
      )}

      {formOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setFormOuvert(false)}
        >
          <form onSubmit={handleSubmit} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 bg-gradient-to-r from-[#93003f] to-[#3c0038] px-6 py-5 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Icone d={elementEnEdition ? I.crayon : I.plus} className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {elementEnEdition ? "Modifier l'entité" : "Nouvelle entité"}
                </h2>
                <p className="text-xs text-white/70">
                  Définissez le nom et les rattachements de l'entité.
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type d'entité</label>
                  <select
                    disabled={!!elementEnEdition}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={champ}
                  >
                    <option value="division">Division / Département</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ex : RH, DT…"
                    className={champ}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Nom *</label>
                <input
                  ref={champNom}
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className={champ}
                  placeholder="ex : Direction Technique"
                />
              </div>

              {form.type === "service" && (
                <div>
                  <label className={labelCls}>Division de rattachement *</label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                    className={champ}
                  >
                    <option value="">— Sélectionner la division —</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {nomDep(d)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>{form.type === "service" ? "Chef de service" : "Responsable"}</label>
                <select
                  value={form.responsable_id}
                  onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                  className={champ}
                >
                  <option value="">— Aucun —</option>
                  {(utilisateurs || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {nomUser(u)} ({u.role || u.poste || "EMPLOYE"})
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
                  placeholder="Rôle ou mission..."
                  className={champ}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={enregistrement}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div
              className="relative px-6 py-6 text-white"
              style={{
                background: detail._type === 'division'
                  ? "linear-gradient(135deg,#93003f,#3c0038)"
                  : "linear-gradient(135deg,#0097ff,#00efff)",
              }}
            >
              <button
                onClick={() => setDetail(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
              >
                <Icone d={I.croix} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Icone d={detail._type === 'division' ? I.batiment : I.hierarchie} className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{nomDep(detail)}</h2>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
                    {detail._type === 'service' ? 'Service' : 'Division principale'}
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
                    {trouverParent(detail) ? nomDep(trouverParent(detail)) : "Division racine"}
                  </div>
                </div>
                <div className="col-span-2 rounded-xl bg-neutral-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                    <Icone d={I.personne} className="h-4 w-4" /> Responsable / Chef
                  </div>
                  <div className="text-sm font-bold text-[#3c0038]">
                    {nomResponsableAffichage(detail)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aSupprimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c0038]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setASupprimer(null)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Icone d={I.corbeille} className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-neutral-800">Supprimer l'entité ?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Voulez-vous supprimer <strong className="text-neutral-700">{nomDep(aSupprimer)}</strong> ?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setASupprimer(null)}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppression}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700"
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

function CarteEmploye({ employe }) {
  const nom = nomUser(employe);
  const initiale = (nom[0] || "U").toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/70 bg-white p-2.5 shadow-2xs">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3c0038] text-[10px] font-bold text-white">
        {initiale}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-neutral-800">{nom}</p>
        <p className="truncate text-[10px] text-neutral-400">
          {employe.poste || employe.fonction || employe.role || "Employé"}
        </p>
      </div>
    </div>
  );
}