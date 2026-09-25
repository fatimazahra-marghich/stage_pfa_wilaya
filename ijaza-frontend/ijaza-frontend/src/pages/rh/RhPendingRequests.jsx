import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

// Utilitaire pour extraire le nom complet de l'agent
function nomComplet(d) {
  if (!d) return "Inconnu";
  const u = d.utilisateur_details || d.utilisateur || d;
  if (typeof u === "object" && u !== null) {
    if (u.nom_complet) return u.nom_complet;
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    if (u.username) return u.username;
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur?.id || d.utilisateur || d.id || "?"}`;
}

// Extraction robuste des informations de division
function extraireDivisionInfo(d, listeDivisions = []) {
  const u = d?.utilisateur_details || d?.utilisateur || {};
  const srv = u?.service_details || u?.service || d?.service_details || d?.service || {};
  const divObj = srv?.division_details || srv?.division || u?.division_details || u?.division || d?.division || {};

  const divId =
    typeof divObj === "object" && divObj !== null
      ? divObj.id
      : srv?.division_id ||
        (typeof srv?.division === "number" || typeof srv?.division === "string" ? srv.division : null) ||
        (typeof u?.division === "number" || typeof u?.division === "string" ? u.division : null) ||
        (typeof d?.division === "number" || typeof d?.division === "string" ? d.division : null);

  let nom =
    typeof divObj === "object" && divObj !== null
      ? divObj.nom || divObj.libelle
      : srv?.division_nom || u?.division_nom || d?.division_nom;

  if (!nom && divId && Array.isArray(listeDivisions)) {
    const divTrouvee = listeDivisions.find((item) => String(item.id) === String(divId));
    if (divTrouvee) {
      nom = divTrouvee.nom || divTrouvee.libelle || divTrouvee.code;
    }
  }

  if (nom) return { id: divId, nom };
  if (divId) return { id: divId, nom: `Division #${divId}` };
  return { id: null, nom: "Division non assignée" };
}

export default function RhPendingRequests() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Gestion du refus dynamique (masqué par défaut)
  const [idEnRefus, setIdEnRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [actionEnCours, setActionEnCours] = useState(null);

  // Filtres
  const [recherche, setRecherche] = useState("");
  const [divisionFiltre, setDivisionFiltre] = useState("TOUTES");
  const [serviceFiltre, setServiceFiltre] = useState("TOUS");
  const [typeCongeFiltre, setTypeCongeFiltre] = useState("TOUS");

  useEffect(() => {
    chargerDonneesRH();
  }, []);

  const chargerDonneesRH = async () => {
    setChargement(true);
    try {
      const [resDemandes, resDivisions, resServices] = await Promise.all([
        api.get("/demandes/").catch(() => ({ data: [] })),
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
      ]);

      const extraireDonnees = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.results)) return res.data.results;
        if (Array.isArray(res.data.data)) return res.data.data;
        return [];
      };

      const rawDivisions = extraireDonnees(resDivisions);
      let rawServices = extraireDonnees(resServices);

      if (rawDivisions.length > 0) {
        const servicesMap = new Map();
        rawServices.forEach((s) => {
          if (s && s.id) servicesMap.set(String(s.id), s);
        });

        rawDivisions.forEach((div) => {
          if (Array.isArray(div.services)) {
            div.services.forEach((s) => {
              if (s && s.id && !servicesMap.has(String(s.id))) {
                servicesMap.set(String(s.id), {
                  ...s,
                  division: s.division || div.id || div,
                });
              }
            });
          }
        });
        rawServices = Array.from(servicesMap.values());
      }

      setDemandes(extraireDonnees(resDemandes));
      setDivisions(rawDivisions);
      setServices(rawServices);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setChargement(false);
    }
  };

  // Types de congés enregistrés
  const typesCongeDisponibles = useMemo(() => {
    const map = new Map();
    map.set("TOUS", "Tous les types de congé");

    demandes.forEach((d) => {
      let code = d?.type_conge_code || d?.type_conge?.code || d?.type_conge || "";
      let libelle = d?.type_conge_libelle || d?.type_conge?.libelle || code;
      if (code && !map.has(code)) {
        map.set(code, String(libelle));
      }
    });

    return Array.from(map.entries()).map(([code, libelle]) => ({ code, libelle }));
  }, [demandes]);

  // Services filtrés par division
  const servicesFiltres = useMemo(() => {
    if (divisionFiltre === "TOUTES") return services;
    return services.filter((s) => {
      const divId = s?.division?.id ?? s?.division ?? s?.division_id;
      return String(divId) === String(divisionFiltre);
    });
  }, [services, divisionFiltre]);

  // Filtre générique
  const filtrerDemande = (d) => {
    const u = d?.utilisateur_details || d?.utilisateur || {};
    const srvId = String(
      u?.service?.id ?? u?.service ?? u?.service_details?.id ?? d?.service?.id ?? d?.service ?? ""
    );
    const srvTrouve = services.find((s) => String(s.id) === String(srvId));
    const divId = String(
      u?.service?.division?.id ??
      u?.service?.division ??
      u?.service_details?.division?.id ??
      u?.service_details?.division ??
      u?.division?.id ??
      u?.division ??
      d?.division?.id ??
      d?.division ??
      srvTrouve?.division?.id ??
      srvTrouve?.division ??
      srvTrouve?.division_id ??
      ""
    );
    const codeConge = String(d?.type_conge_code || d?.type_conge?.code || d?.type_conge || "");

    if (divisionFiltre !== "TOUTES" && divId !== String(divisionFiltre)) return false;
    if (serviceFiltre !== "TOUS" && srvId !== String(serviceFiltre)) return false;
    if (typeCongeFiltre !== "TOUS" && codeConge !== String(typeCongeFiltre)) return false;

    if (recherche.trim()) {
      const nom = nomComplet(d).toLowerCase();
      if (!nom.includes(recherche.toLowerCase())) return false;
    }

    return true;
  };

  // Attente RH
  const demandesAValider = useMemo(() => {
    return demandes.filter((d) => {
      if (!d?.nombre_jours || Number(d?.nombre_jours) <= 0) return false;

      const st = String(d?.statut || d?.statut_code || "").toUpperCase();
      if (["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUS", "ANNULEE", "VALIDEE"].includes(st)) return false;

      const u = d?.utilisateur_details || d?.utilisateur || {};
      const serviceUserCode = String(
        u?.service?.code || u?.service_details?.code || ""
      ).toUpperCase();
      const estInServiceRH = serviceUserCode.includes("RH") || serviceUserCode === "SRV-REC";

      if (estInServiceRH) {
        if (!["EN_ATTENTE_RH", "EN_ATTENTE_CHEF", "EN_ATTENTE"].includes(st)) return false;
      } else {
        if (st !== "EN_ATTENTE_RH" && st !== "EN_ATTENTE_NIVEAU2") return false;
      }

      return filtrerDemande(d);
    });
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, recherche, services]);

  // Congés Maladie
  const demandesMaladie = useMemo(() => {
    return demandes.filter((d) => {
      const st = String(d?.statut || d?.statut_code || "").toUpperCase();
      if (st.includes("REFUS") || st.includes("ANNUL")) return false;
      if (!d?.nombre_jours || Number(d?.nombre_jours) <= 0) return false;

      const code = String(d?.type_conge?.code || d?.type_conge_code || d?.type_conge || "").toUpperCase();
      const libelle = String(d?.type_conge_libelle || d?.type_conge?.libelle || "").toLowerCase();

      return (
        (d?.est_maladie === true || code.includes("MALADIE") || code.includes("MAL") || (libelle.includes("maladie") && !libelle.includes("exceptionnel"))) &&
        filtrerDemande(d)
      );
    });
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, recherche, services]);

  // Calculs KPI
  const statsGlobale = useMemo(() => {
    return {
      aTraiterGlobale: demandesAValider.length,
      totalMaladie: demandesMaladie.length,
      totalDivisions: divisions.length,
      totalServices: services.length,
    };
  }, [demandesAValider, demandesMaladie, divisions, services]);

  // Validation définitive directe
  const validerDemande = async (id) => {
    setActionEnCours(id);
    try {
      await api.post(`/demandes/${id}/valider/`);
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      alert("Demande validée avec succès.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation.");
    } finally {
      setActionEnCours(null);
    }
  };

  // Confirmer le refus avec la remarque
  const confirmerRefus = async (id) => {
    if (!motifRefus.trim()) {
      alert("Le motif du refus est obligatoire.");
      return;
    }

    setActionEnCours(id);
    try {
      await api.post(`/demandes/${id}/refuser/`, { motif: motifRefus, commentaire: motifRefus });
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      setIdEnRefus(null);
      setMotifRefus("");
      alert("Demande refusée avec succès.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors du refus de la demande.");
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        {/* Header */}
        <header className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Ressources Humaines</span>
            <span>·</span>
            <span className="text-[#93003f]">Validation Définitive</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
            Demandes de Congé en Attente RH ({demandesAValider.length})
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Examinez et apportez la décision finale sur les demandes transmises.
          </p>
        </header>

        {/* CARTES KPI (Comme sur le Dashboard RH) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                En attente globale
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#3c0038]">
                {statsGlobale.aTraiterGlobale}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.horloge} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Congés Maladie Validés
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#93003f]">
                {statsGlobale.totalMaladie}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#93003f]">
              <Icone d={I.calendrier} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Nombre de Divisions
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#0097ff]">
                {statsGlobale.totalDivisions}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.utilisateurs} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Nombre de Services
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#3c0038]">
                {statsGlobale.totalServices}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.utilisateurs} className="h-5 w-5" />
            </span>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un agent..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-[#0097ff]"
            />
          </div>

          <select
            value={divisionFiltre}
            onChange={(e) => {
              setDivisionFiltre(e.target.value);
              setServiceFiltre("TOUS");
            }}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
          >
            <option value="TOUTES">Toutes les Divisions ({divisions.length})</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.nom || div.libelle || div.code || `Division ${div.id}`}
              </option>
            ))}
          </select>

          <select
            value={serviceFiltre}
            onChange={(e) => setServiceFiltre(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
          >
            <option value="TOUS">Tous les Services ({servicesFiltres.length})</option>
            {servicesFiltres.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom || s.libelle || s.code || `Service ${s.id}`}
              </option>
            ))}
          </select>

          <select
            value={typeCongeFiltre}
            onChange={(e) => setTypeCongeFiltre(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
          >
            {typesCongeDisponibles.map((item) => (
              <option key={item.code} value={item.code}>
                {item.libelle}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des Demandes */}
        {chargement ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            Chargement des demandes RH...
          </div>
        ) : demandesAValider.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icone d={I.check} className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-[#3c0038]">Toutes les demandes ont été traitées !</p>
            <p className="mt-1 text-xs text-slate-400">Aucune attente de validation RH pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {demandesAValider.map((d) => {
              const agentNom = nomComplet(d);
              const divInfo = extraireDivisionInfo(d, divisions);

              return (
                <div
                  key={d.id}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          onClick={() => navigate(`/rh/demandes/${d.id}`)}
                          className="cursor-pointer text-base font-bold text-[#3c0038] hover:underline"
                        >
                          {agentNom}
                        </h2>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                          🏢 {divInfo.nom}
                        </span>
                        <StatutBadge statut={d.statut} />
                      </div>

                      <p className="mt-1 text-xs font-semibold text-[#93003f]">
                        {d.type_conge_libelle || "Congé"} — <span className="font-bold">{d.nombre_jours} jour(s)</span>
                      </p>

                      {d.motif && (
                        <p className="mt-1 text-xs italic text-slate-500">Motif : "{d.motif}"</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Période</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-700">
                        Du {d.date_debut} au {d.date_fin}
                      </p>
                    </div>
                  </div>

                  {/* ZONE DE SAISIE DU MOTIF : Affichée uniquement si "Refuser" est cliqué */}
                  {idEnRefus === d.id && (
                    <div className="space-y-2 rounded-xl bg-rose-50/50 p-3.5 border border-rose-200 animate-fadeIn">
                      <p className="text-xs font-bold text-rose-800">
                        Veuillez préciser le motif du refus :
                      </p>
                      <textarea
                        rows={2}
                        value={motifRefus}
                        onChange={(e) => setMotifRefus(e.target.value)}
                        placeholder="Raison du refus (obligatoire)..."
                        className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs outline-none focus:border-rose-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setIdEnRefus(null);
                            setMotifRefus("");
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                        >
                          Annuler
                        </button>
                        <button
                          disabled={actionEnCours === d.id}
                          onClick={() => confirmerRefus(d.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {actionEnCours === d.id ? "Traitement..." : "Confirmer le Refus"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => navigate(`/rh/demandes/${d.id}`)}
                      className="text-xs font-bold text-[#0097ff] hover:underline"
                    >
                      Détails complets →
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionEnCours === d.id}
                        onClick={() => {
                          if (idEnRefus === d.id) {
                            setIdEnRefus(null);
                          } else {
                            setIdEnRefus(d.id);
                            setMotifRefus("");
                          }
                        }}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        Refuser
                      </button>

                      <button
                        disabled={actionEnCours === d.id}
                        onClick={() => validerDemande(d.id)}
                        className="rounded-xl bg-[#3c0038] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#93003f] disabled:opacity-50"
                      >
                        {actionEnCours === d.id ? "Traitement..." : "Validation RH"}
                      </button>
                    </div>
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