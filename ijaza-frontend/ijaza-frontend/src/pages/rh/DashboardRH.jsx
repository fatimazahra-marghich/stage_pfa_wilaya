import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

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
  return d.utilisateur_nom || `Agent #${d.utilisateur_id || d.utilisateur?.id || d.utilisateur || d.id || "?"}`;
}

// Fonction utilitaire pour extraire le nom et l'ID de la division de façon robuste (avec fallback croisé)
function extraireDivisionInfo(d, listeDivisions = []) {
  const u = d?.utilisateur_details || d?.utilisateur || {};
  const srv = u?.service_details || u?.service || d?.service_details || d?.service || {};
  const divObj = srv?.division_details || srv?.division || u?.division_details || u?.division || d?.division || {};

  // 1. Extraction de l'ID
  const divId =
    typeof divObj === "object" && divObj !== null
      ? divObj.id
      : srv?.division_id ||
        (typeof srv?.division === "number" || typeof srv?.division === "string" ? srv.division : null) ||
        (typeof u?.division === "number" || typeof u?.division === "string" ? u.division : null) ||
        (typeof d?.division === "number" || typeof d?.division === "string" ? d.division : null);

  // 2. Extraction directe du Nom
  let nom =
    typeof divObj === "object" && divObj !== null
      ? divObj.nom || divObj.libelle
      : srv?.division_nom || u?.division_nom || d?.division_nom;

  // 3. Fallback : Si on a l'ID mais pas le Nom, on recherche dans la liste globale des divisions
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

export default function DashboardRH() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Onglets & Filtres
  const [ongletActif, setOngletActif] = useState("a_valider");
  const [recherche, setRecherche] = useState("");
  const [divisionFiltre, setDivisionFiltre] = useState("TOUTES");
  const [serviceFiltre, setServiceFiltre] = useState("TOUS");
  const [typeCongeFiltre, setTypeCongeFiltre] = useState("TOUS");

  // Modal de refus / action
  const [demandeRefus, setDemandeRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const userStored = JSON.parse(
        localStorage.getItem("ijaza_user") ||
          localStorage.getItem("user") ||
          "{}"
      );

      const roleUpper = String(userStored?.role || "").toUpperCase();
      const codeService = String(
        userStored?.service_details?.code || userStored?.service_nom || ""
      ).toUpperCase();

      const estRH =
        roleUpper.includes("RH") ||
        roleUpper.includes("ADMIN") ||
        codeService === "RH" ||
        userStored?.est_rh_general === true ||
        userStored?.is_superuser === true;

      if (!userStored || (!userStored.email && !userStored.id) || !estRH) {
        alert("Accès restreint à la Direction des Ressources Humaines.");
        navigate("/dashboard");
        return;
      }

      setCurrentUser(userStored);

      // Correction des URLs avec le bon préfixe Django : /organisation/
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

      // Extraire les services depuis les divisions si la liste /services/ est incomplète
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
      console.error("Erreur globale Dashboard RH :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Services filtrés selon la division choisie
  const servicesFiltres = useMemo(() => {
    if (divisionFiltre === "TOUTES") return services;
    return services.filter((s) => {
      const divId = s?.division?.id ?? s?.division ?? s?.division_id;
      return String(divId) === String(divisionFiltre);
    });
  }, [services, divisionFiltre]);

  // Types de congés enregistrés
  const typesCongeDisponibles = useMemo(() => {
    const map = new Map();
    map.set("TOUS", "Tous les types de congé");

    demandes.forEach((d) => {
      let code = d?.type_conge_code || d?.type_conge?.code || d?.type_conge || d?.type_conge_id || "";
      let libelle = d?.type_conge_libelle || d?.type_conge?.libelle || code;
      if (code && !map.has(code)) {
        map.set(code, String(libelle));
      }
    });

    return Array.from(map.entries()).map(([code, libelle]) => ({ code, libelle }));
  }, [demandes]);

  // Filtre centralisé robuste (avec recherche cross-reference dans services)
  const filtrerDemande = (d) => {
    const u = d?.utilisateur_details || d?.utilisateur || {};

    // 1. Extraction de l'ID de service
    const srvId = String(
      u?.service?.id ??
      u?.service ??
      u?.service_details?.id ??
      d?.service?.id ??
      d?.service ??
      ""
    );

    // Recherche de l'objet service dans la liste globale
    const srvTrouve = services.find((s) => String(s.id) === String(srvId));

    // 2. Extraction de l'ID de division depuis toutes les sources possibles
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

    const codeConge = String(
      d?.type_conge_code || d?.type_conge?.code || d?.type_conge || d?.type_conge_id || ""
    );

    if (divisionFiltre !== "TOUTES" && divId !== String(divisionFiltre)) return false;
    if (serviceFiltre !== "TOUS" && srvId !== String(serviceFiltre)) return false;
    if (typeCongeFiltre !== "TOUS" && codeConge !== String(typeCongeFiltre)) return false;

    if (recherche.trim()) {
      const nom = nomComplet(d).toLowerCase();
      if (!nom.includes(recherche.toLowerCase())) return false;
    }

    return true;
  };

  // Demandes à valider
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
        if (st !== "EN_ATTENTE_RH") return false;
      }

      return filtrerDemande(d);
    });
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, recherche, services]);

  // Congés Maladie
  const demandesMaladie = useMemo(() => {
    return demandes.filter((d) => {
      const st = String(d?.statut || d?.statut_code || "").toUpperCase();

      if (
        st.includes("REFUS") ||
        st.includes("ANNUL") ||
        ["ANNULEE", "REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE"].includes(st)
      ) {
        return false;
      }

      if (!d?.nombre_jours || Number(d?.nombre_jours) <= 0) return false;

      const code = String(d?.type_conge?.code || d?.type_conge_code || d?.type_conge || d?.type_conge_id || "").toUpperCase();
      const libelle = String(d?.type_conge_libelle || d?.type_conge?.libelle || "").toLowerCase();

      const estMaladie =
        d?.est_maladie === true ||
        code.includes("MALADIE") ||
        code.includes("MAL") ||
        (libelle.includes("maladie") && !libelle.includes("exceptionnel"));

      return estMaladie && filtrerDemande(d);
    });
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, recherche, services]);

  // Mes demandes RH (Affiche les demandes en attente ET validées de l'utilisateur connecté)
// Mes demandes RH (Affiche toutes les demandes de l'utilisateur connecté)
// Mes demandes RH (Extraction stricte de l'ID avec comparaison tolérante)
// Mes demandes RH (Filtre intelligent par ID, Username ou Nom complet)
// Mes demandes RH (Ne conserve que les demandes actives : En attente ou Validées)
  const mesDemandes = useMemo(() => {
    if (!currentUser || !demandes || demandes.length === 0) return [];

    const myId = String(currentUser.id || currentUser.pk || "").trim();
    const myUsername = String(currentUser.username || currentUser.email || "").toLowerCase().trim();
    const myName = String(currentUser.nom_complet || currentUser.first_name || "").toLowerCase().trim();

    return demandes.filter((d) => {
      // Exclusion stricte des demandes annulées ou refusées
      const st = String(d?.statut || d?.statut_code || "").toUpperCase();
      if (st.includes("ANNUL") || st.includes("REFUS")) {
        return false;
      }

      const u = d?.utilisateur_details || d?.utilisateur || {};

      // Extraction de l'ID utilisateur
      const idUser = String(
        d?.utilisateur_id ||
        (typeof u === "object" ? u.id || u.pk : u) ||
        ""
      ).trim();

      // Extraction du username/nom
      const usernameUser = String(u.username || u.email || "").toLowerCase().trim();
      const nameUser = String(
        d?.utilisateur_nom || u.nom_complet || `${u.first_name || ""} ${u.last_name || ""}`
      ).toLowerCase().trim();

      // Correspondance par ID OU par Nom/Username
      const matchId = myId && idUser === myId;
      const matchUsername = myUsername && usernameUser === myUsername;
      const matchName = myName && nameUser && (nameUser.includes(myName) || myName.includes(nameUser));

      return matchId || matchUsername || matchName;
    });
  }, [demandes, currentUser]);

  // KPIs
  const statsGlobale = useMemo(() => {
    return {
      aTraiterGlobale: demandesAValider.length,
      totalMaladie: demandesMaladie.length,
      totalDivisions: divisions.length,
      totalServices: services.length,
    };
  }, [demandesAValider, demandesMaladie, divisions, services]);

  // Répartition dynamique selon les filtres (Division, Service, Type, Recherche)
  const repartitionMotifs = useMemo(() => {
    if (!Array.isArray(demandes)) return [];

    const demandesFiltrees = demandes.filter((d) => {
      const st = String(d?.statut || "").toUpperCase();
      if (st.includes("ANNUL")) return false;
      return filtrerDemande(d);
    });

    const total = demandesFiltrees.length;
    if (total === 0) return [];

    const comptes = {};
    demandesFiltrees.forEach((d) => {
      let motif = d?.type_conge_libelle || d?.type_conge_code || "Autre Motif";
      comptes[motif] = (comptes[motif] || 0) + 1;
    });

    return Object.entries(comptes).map(([motif, count]) => ({
      motif,
      count,
      pourcentage: Math.round((count / total) * 100),
    }));
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, recherche, services]);

  const traiterAction = async (id, action, commentaire = "") => {
    try {
      if (action === "VALIDE") {
        await api.post(`/demandes/${id}/valider/`, { commentaire });
      } else if (action === "REFUSE") {
        await api.post(`/demandes/${id}/refuser/`, { motif: commentaire, commentaire });
      } else if (action === "ANNULER") {
        await api.post(`/demandes/${id}/annuler/`);
      } else if (action === "CONTRE_VISITE") {
        await api.patch(`/demandes/${id}/`, {
          ordre_contre_visite: true,
          remarque_rh: commentaire || "Contre-visite médicale ordonnée."
        }).catch(async () => {
          await api.post(`/demandes/${id}/valider/`, { contre_visite: true });
        });
      }

      setDemandeRefus(null);
      setMotifRefus("");
      await chargerDonnees();
    } catch (err) {
      console.error("Erreur action RH :", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Une erreur est survenue lors du traitement de la demande.";
      alert(msg);
    }
  };

  const telechargerRapportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(60, 0, 56);
    doc.text("Rapport Statistique Global RH", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 239, 255);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Indicateurs Globaux de l'Organisation", 14, 45);

    doc.setFontSize(10);
    doc.text(`• Nombre Total de Divisions : ${statsGlobale.totalDivisions}`, 20, 53);
    doc.text(`• Nombre Total de Services : ${statsGlobale.totalServices}`, 20, 60);
    doc.text(`• Demandes Globales en Attente : ${statsGlobale.aTraiterGlobale}`, 20, 67);
    doc.text(`• Congés Maladie Enregistrés : ${statsGlobale.totalMaladie}`, 20, 74);

    doc.save(`Rapport_Global_RH_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        {/* En-tête */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Ressources Humaines</span>
              <span>·</span>
              <span className="text-[#93003f]">Gestion Centrale</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Tableau de Bord RH
            </h1>
          </div>

          <nav className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-slate-100/90 p-1.5 border border-slate-200/80 no-scrollbar">
            <button
              onClick={() => setOngletActif("a_valider")}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                ongletActif === "a_valider"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              À Valider ({demandesAValider.length})
            </button>
            <button
              onClick={() => setOngletActif("maladie")}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                ongletActif === "maladie"
                  ? "bg-white text-[#93003f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Maladie & Contre-visite ({demandesMaladie.length})
            </button>
            <button
              onClick={() => setOngletActif("mes_demandes")}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                ongletActif === "mes_demandes"
                  ? "bg-white text-[#0097ff] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mes Demandes RH ({mesDemandes.length})
            </button>
            <button
              onClick={() => setOngletActif("rapports")}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                ongletActif === "rapports"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Statistiques & Rapports
            </button>
          </nav>
        </header>

        {/* Cartes KPI */}
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

        {/* Contenu */}
        {chargement ? (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            <p className="mt-2 text-xs text-slate-400">Chargement des données...</p>
          </div>
        ) : (
          <>
            {/* À Valider */}
            {ongletActif === "a_valider" && (
              <div className="space-y-4">
                {demandesAValider.map((d) => {
                  const divInfo = extraireDivisionInfo(d, divisions);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm md:flex-row md:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#3c0038]">{nomComplet(d)}</span>
                          
                          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            🏢 {divInfo.nom}
                          </span>

                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                            Attente RH
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {d.type_conge_libelle || "Congé"} — Du {d.date_debut} au {d.date_fin} ({d.nombre_jours} jour(s))
                        </p>
                        {d.motif && (
                          <p className="mt-1 text-xs italic text-slate-400">
                            Motif : "{d.motif}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDemandeRefus(d)}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Refuser
                        </button>
                        <button
                          onClick={() => traiterAction(d.id, "VALIDE")}
                          className="rounded-xl bg-[#93003f] px-4 py-2 text-xs font-bold text-white hover:bg-[#3c0038]"
                        >
                          Validation RH
                        </button>
                      </div>
                    </div>
                  );
                })}

                {demandesAValider.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Aucune demande en attente de validation. 🎉
                  </div>
                )}
              </div>
            )}

            {/* Congés Maladie */}
            {ongletActif === "maladie" && (
              <div className="space-y-3">
                {demandesMaladie.map((d) => {
                  const estLongueDuree = d.necessite_contre_visite || Number(d?.nombre_jours) > 4;
                  const divInfo = extraireDivisionInfo(d, divisions);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[#3c0038]">{nomComplet(d)}</p>
                          <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            🏢 {divInfo.nom}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Période : {d.date_debut} au {d.date_fin} ({d.nombre_jours} jours)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatutBadge statut={d.statut} />

                        {estLongueDuree && (
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              ⚠️ Contre-visite requise (&gt; 4j)
                            </span>
                            <button
                              onClick={() => traiterAction(d.id, "CONTRE_VISITE")}
                              className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
                            >
                              Ordonner Contre-Visite
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {demandesMaladie.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Aucun congé maladie actif trouvé.
                  </div>
                )}
              </div>
            )}

            {/* Mes Demandes RH (Affiche EN_ATTENTE_RH et VALIDEE) */}
{/* Mes Demandes RH (Affiche toutes les demandes avec option d'annulation) */}
            {ongletActif === "mes_demandes" && (
              <div className="space-y-4">
                {mesDemandes.map((d) => {
                  const st = String(d?.statut || "").toUpperCase();
                  const estAnnuleeOuRefusee = 
                    st.includes("ANNUL") || 
                    st.includes("REFUS");

                  return (
                    <div
                      key={d.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm transition-all ${
                        st === "VALIDEE"
                          ? "border-emerald-200 bg-emerald-50/30"
                          : estAnnuleeOuRefusee
                          ? "border-rose-200 bg-rose-50/20 opacity-75"
                          : "border-amber-200 bg-amber-50/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#3c0038]">
                            {d.type_conge_libelle || d.type_conge_code || "Congé"}
                          </span>
                          <StatutBadge statut={d.statut} />
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          Du {d.date_debut} au {d.date_fin} ({d.nombre_jours} jour(s))
                        </p>
                        {d.motif && (
                          <p className="mt-0.5 text-xs italic text-slate-500">
                            Motif : "{d.motif}"
                          </p>
                        )}
                      </div>

                      {/* Bouton Annuler visible pour les demandes en attente ou validées */}
                      {!estAnnuleeOuRefusee && (
                        <button
                          onClick={() => {
                            if (window.confirm("Êtes-vous sûr de vouloir annuler cette demande de congé ?")) {
                              traiterAction(d.id, "ANNULER");
                            }
                          }}
                          className="self-start sm:self-center shrink-0 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 shadow-xs cursor-pointer"
                        >
                          Annuler la demande
                        </button>
                      )}
                    </div>
                  );
                })}

                {mesDemandes.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Vous n'avez aucune demande enregistrée.
                  </div>
                )}
              </div>
            )}

            {/* Rapports */}
            {ongletActif === "rapports" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-[#3c0038]">
                    Répartition des Demandes par Motif
                  </h3>
                  <div className="space-y-4">
                    {repartitionMotifs.map((item, idx) => (
                      <div key={idx}>
                        <div className="mb-1 flex justify-between text-xs font-semibold">
                          <span className="text-slate-700">{item.motif}</span>
                          <span className="text-[#93003f]">
                            {item.pourcentage}% ({item.count} demande{item.count > 1 ? "s" : ""})
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#93003f] transition-all duration-500"
                            style={{ width: `${item.pourcentage}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {repartitionMotifs.length === 0 && (
                      <p className="py-8 text-center text-xs text-slate-400">
                        Aucune demande ne correspond aux filtres sélectionnés.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
                  <div>
                    <h3 className="mb-2 font-bold text-[#3c0038]">
                      Synthèse Globale de l'Organisation
                    </h3>
                    <p className="mb-6 text-xs text-slate-500">
                      Rapport automatisé couvrant la totalité des services et divisions de l'établissement.
                    </p>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-slate-600">Total Divisions actives</span>
                        <span className="font-bold text-[#0097ff]">{statsGlobale.totalDivisions}</span>
                      </div>
                      <div className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-slate-600">Total Services actifs</span>
                        <span className="font-bold text-slate-800">{statsGlobale.totalServices}</span>
                      </div>
                      <div className="flex justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span className="text-slate-600">Demandes en attente d'arbitrage</span>
                        <span className="font-bold text-[#93003f]">{statsGlobale.aTraiterGlobale}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={telechargerRapportPDF}
                    className="mt-6 w-full rounded-xl border border-[#0097ff] py-2.5 text-xs font-bold text-[#0097ff] transition hover:bg-[#e7ffff]"
                  >
                    Télécharger le rapport global (PDF)
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal Refus */}
        {demandeRefus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[#3c0038]">
                Refuser la demande de {nomComplet(demandeRefus)}
              </h3>
              <textarea
                rows={3}
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                placeholder="Raison du refus (obligatoire)..."
                className="w-full rounded-xl border p-3 text-sm outline-none focus:border-[#0097ff]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDemandeRefus(null);
                    setMotifRefus("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => traiterAction(demandeRefus.id, "REFUSE", motifRefus)}
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