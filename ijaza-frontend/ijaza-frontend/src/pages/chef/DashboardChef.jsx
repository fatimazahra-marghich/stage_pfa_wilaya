import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
      return `${u.first_name || u.prenom || ""} ${u.last_name || u.nom || ""}`.trim();
    }
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur?.id || d.utilisateur || d.id || "?"}`;
}

export default function DashboardChefService() {
  const [demandes, setDemandes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [soldes, setSoldes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState("demandes");
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("TOUS");
  const [agentSelectionne, setAgentSelectionne] = useState("TOUS");

  // Modale de refus
  const [demandeRefus, setDemandeRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreurRefus, setErreurRefus] = useState("");

  async function chargerDonnees() {
    setChargement(true);
    try {
      const userConnecte = JSON.parse(localStorage.getItem("user") || "{}");
      const serviceChef = userConnecte?.service?.id || userConnecte?.service || null;

      const [resDemandes, resAgents, resSoldes] = await Promise.all([
        api.get("/demandes/").catch(() => ({ data: [] })),
        api.get("/users/").catch(() => ({ data: [] })),
        api.get("/soldes/").catch(() => ({ data: [] })),
      ]);

      let listeDemandes = resDemandes.data?.results ?? resDemandes.data ?? [];
      let listeAgents = resAgents.data?.results ?? resAgents.data ?? [];
      let listeSoldes = resSoldes.data?.results ?? resSoldes.data ?? [];

      if (!Array.isArray(listeDemandes)) listeDemandes = [];
      if (!Array.isArray(listeAgents)) listeAgents = [];
      if (!Array.isArray(listeSoldes)) listeSoldes = [];

      if (serviceChef) {
        listeAgents = listeAgents.filter((agent) => {
          const serviceAgent = agent?.service?.id || agent?.service;
          return String(serviceAgent) === String(serviceChef);
        });

        listeDemandes = listeDemandes.filter((demande) => {
          const u = demande?.utilisateur_details || {};
          const serviceDemande = u.service?.id || u.service || demande?.service;
          return String(serviceDemande) === String(serviceChef);
        });
      }

      setDemandes(listeDemandes);
      setAgents(listeAgents);
      setSoldes(listeSoldes);
    } catch (err) {
      console.error("Erreur de chargement du tableau de bord :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  const getSoldeAgent = (agentId) => {
    if (!agentId || !Array.isArray(soldes)) return "21j";
    const anneeCourante = new Date().getFullYear();
    const soldeObj =
      soldes.find(
        (s) =>
          String(s?.utilisateur?.id || s?.utilisateur) === String(agentId) &&
          Number(s?.annee) === Number(anneeCourante)
      ) ||
      soldes.find(
        (s) => String(s?.utilisateur?.id || s?.utilisateur) === String(agentId)
      );

    if (!soldeObj) return "21j";
    const soldeRestant = Math.round(soldeObj.solde_actuel ?? soldeObj.solde ?? 0);
    return `${soldeRestant}j`;
  };

  const getDernierCongeAgent = (agentId) => {
    if (!agentId || !Array.isArray(demandes)) return "Aucun congé";
    const demandesAgent = demandes.filter(
      (d) => String(d?.utilisateur?.id || d?.utilisateur) === String(agentId)
    );

    if (demandesAgent.length === 0) return "Aucun congé";

    demandesAgent.sort(
      (a, b) => new Date(b?.date_debut || b?.created_at) - new Date(a?.date_debut || a?.created_at)
    );

    const derniere = demandesAgent[0];
    const type = derniere?.type_conge_libelle || derniere?.type_conge?.libelle || "Congé";

    const dateFormatted = derniere?.date_debut
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
        }).format(new Date(derniere.date_debut))
      : "";

    return `${type} (${dateFormatted})`;
  };

  const tousLesMotifsDisponibles = useMemo(() => {
    const map = new Map();
    map.set("TOUS", "Tous les motifs");

    if (Array.isArray(demandes)) {
      demandes.forEach((d) => {
        const libelle = d?.type_conge_libelle || d?.type_conge?.libelle || "";
        const code = (d?.type_conge_code || d?.type_conge?.code || d?.type_conge || libelle || "").toString();

        if (code && !map.has(code)) {
          map.set(code, libelle || code);
        }
      });
    }

    return Array.from(map.entries()).map(([code, libelle]) => ({
      code,
      libelle,
    }));
  }, [demandes]);

  const demandesEnAttente = useMemo(() => {
    if (!Array.isArray(demandes)) return [];
    return demandes.filter(
      (d) =>
        (d?.statut === "EN_ATTENTE_CHEF" ||
          d?.statut === "EN_ATTENTE_NIVEAU1" ||
          d?.statut === "EN_ATTENTE") &&
        Number(d?.nombre_jours) > 0
    );
  }, [demandes]);

  const demandesFiltrees = useMemo(() => {
    return demandesEnAttente.filter((d) => {
      const nom = nomComplet(d).toLowerCase();
      const idUser = String(d?.utilisateur?.id || d?.utilisateur || "");
      const correspondNom =
        nom.includes(recherche.toLowerCase()) &&
        (agentSelectionne === "TOUS" || idUser === String(agentSelectionne));

      const codeConge = (d?.type_conge_code || d?.type_conge?.code || d?.type_conge || "").toString();
      const libelleConge = (d?.type_conge_libelle || d?.type_conge?.libelle || "").toLowerCase();

      const correspondType =
        filtreType === "TOUS" ||
        codeConge === filtreType ||
        libelleConge === filtreType.toLowerCase();

      return correspondNom && correspondType;
    });
  }, [demandesEnAttente, recherche, filtreType, agentSelectionne]);

  // Extraction unique pour tous les congés maladie
  const demandesMaladie = useMemo(() => {
    if (!Array.isArray(demandes)) return [];
    return demandes.filter((d) => {
      const code = String(d?.type_conge_code || d?.type_conge || "").toUpperCase();
      const libelle = String(d?.type_conge_libelle || "").toUpperCase();

      const estMaladie =
        code.includes("MALADIE") ||
        libelle.includes("MALADIE") ||
        code.includes("EXCEPTIONNELLE") ||
        libelle.includes("EXCEPTIONNELLE");

      const idUser = String(d?.utilisateur?.id || d?.utilisateur || "");
      const matchAgent = agentSelectionne === "TOUS" || idUser === String(agentSelectionne);
      const matchSearch = nomComplet(d).toLowerCase().includes(recherche.toLowerCase());

      return estMaladie && matchAgent && matchSearch;
    });
  }, [demandes, agentSelectionne, recherche]);

  const stats = useMemo(() => {
    const listDemandes = Array.isArray(demandes) ? demandes : [];
    const listAgents = Array.isArray(agents) ? agents : [];

    const totalJoursAttente = demandesEnAttente.reduce(
      (acc, curr) => acc + (Number(curr?.nombre_jours) || 0),
      0
    );
    const valides = listDemandes.filter(
      (d) => d?.statut === "VALIDE" || d?.statut === "VALIDEE"
    );

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const absentsAujourdhui = valides.filter((d) => {
      return d?.date_debut <= todayStr && d?.date_fin >= todayStr;
    }).length;

    const validesCeMois = valides.filter((d) => {
      const dateRef = new Date(d?.date_debut || d?.created_at);
      return (
        dateRef.getMonth() === currentMonth &&
        dateRef.getFullYear() === currentYear
      );
    }).length;

    const totalAgentsCount =
      listAgents.length || new Set(listDemandes.map((d) => d?.utilisateur)).size || 1;

    const tauxPresence = Math.max(
      0,
      Math.round(((totalAgentsCount - absentsAujourdhui) / totalAgentsCount) * 100)
    );

    return {
      aTraiter: demandesEnAttente.length,
      joursEnAttente: totalJoursAttente,
      absentsAujourdhui,
      totalAgents: totalAgentsCount,
      validesCeMois,
      tauxPresence,
      totalMaladie: demandesMaladie.length,
    };
  }, [demandes, demandesEnAttente, agents, demandesMaladie]);

  const repartitionMotifs = useMemo(() => {
    if (!Array.isArray(demandes)) return [];
    const comptes = {};
    demandes.forEach((d) => {
      const motif = d?.type_conge_libelle || d?.type_conge_code || "Autre Motif";
      comptes[motif] = (comptes[motif] || 0) + 1;
    });

    const total = demandes.length || 1;
    return Object.entries(comptes).map(([motif, count]) => ({
      motif,
      count,
      pourcentage: Math.round((count / total) * 100),
    }));
  }, [demandes]);

  const telechargerRapportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(60, 0, 56);
    doc.text("Rapport d'activité du Service", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 239, 255);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Indicateurs Clés de Présence", 14, 45);

    doc.setFontSize(10);
    doc.text(`• Effectif total du service : ${stats.totalAgents} agents`, 20, 53);
    doc.text(`• Taux de présence globale : ${stats.tauxPresence}%`, 20, 60);
    doc.text(`• Congés Maladie au total : ${stats.totalMaladie}`, 20, 67);
    doc.text(`• Demandes en attente d'arbitrage : ${stats.aTraiter}`, 20, 74);

    doc.setFontSize(12);
    doc.text("2. Répartition des demandes par motif", 14, 88);

    let yPosition = 96;
    repartitionMotifs.forEach((item) => {
      doc.setFontSize(10);
      doc.text(
        `• ${item.motif} : ${item.count} demande(s) (${item.pourcentage}%)`,
        20,
        yPosition
      );
      yPosition += 7;
    });

    doc.save(`Rapport_Activite_Service_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  async function traiterAction(id, action, commentaire = "") {
    try {
      let endpoint = `/demandes/${id}/valider/`;
      let payload = { commentaire };

      if (action === "REFUSE") {
        endpoint = `/demandes/${id}/refuser/`;
      } else if (action === "CONTRE_VISITE") {
        endpoint = `/demandes/${id}/demander-contre-visite/`;
        payload = {
          commentaire: commentaire || "Demande de contre-visite ordonnée par le Chef de service.",
        };
      }

      await api.post(endpoint, payload);
      setDemandeRefus(null);
      setMotifRefus("");
      chargerDonnees();
    } catch (err) {
      console.error(`Erreur lors de l'action ${action} :`, err);
      alert("Une erreur est survenue lors de l'enregistrement.");
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

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Espace Chef de Service</span>
              <span>·</span>
              <span className="text-[#93003f]">Vue d&apos;ensemble</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Tableau de Bord Chef de Service
            </h1>
          </div>

          <nav className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1.5 border border-slate-200/80">
            <button
              onClick={() => setOngletActif("demandes")}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "demandes"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Demandes ({stats.aTraiter})
            </button>

            <button
              onClick={() => setOngletActif("maladie")}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "maladie"
                  ? "bg-white text-[#93003f] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Congés Maladie ({stats.totalMaladie})
            </button>

            <button
              onClick={() => setOngletActif("agents")}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "agents"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Agents ({stats.totalAgents})
            </button>

            <button
              onClick={() => setOngletActif("rapports")}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "rapports"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Statistiques & Rapports
            </button>
          </nav>
        </header>

        {/* KPIs Cartes (3 cartes uniquement) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                En attente globale
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#3c0038]">
                {stats.aTraiter}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.horloge} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Congés Maladie
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#93003f]">
                {stats.totalMaladie}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#93003f]">
              <Icone d={I.calendrier} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Effectif du service
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#0097ff]">
                {stats.totalAgents}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.utilisateurs} className="h-5 w-5" />
            </span>
          </div>
        </div>

        {/* Barre de Recherche */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
            />
          </div>

          <select
            value={agentSelectionne}
            onChange={(e) => setAgentSelectionne(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-4 py-2.5 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40 font-medium text-slate-700"
          >
            <option value="TOUS">Tous les agents</option>
            {agents.map((agent) => (
              <option key={agent?.id || Math.random()} value={agent?.id}>
                {nomComplet(agent)}
              </option>
            ))}
          </select>

          {ongletActif === "demandes" && (
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-4 py-2.5 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40 font-medium text-slate-700"
            >
              {tousLesMotifsDisponibles.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.libelle}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* CONTENUS DES ONGLETS */}
        {chargement ? (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-slate-400">
              Chargement des données...
            </p>
          </div>
        ) : (
          <>
            {/* 1. TOUTES LES DEMANDES */}
            {ongletActif === "demandes" && (
              <div className="space-y-4">
                {demandesFiltrees.map((d) => {
                  const nom = nomComplet(d);
                  const estMaladieLongue =
                    (d?.type_conge_code === "MALADIE" ||
                      d?.type_conge_libelle?.toLowerCase().includes("maladie")) &&
                    Number(d?.nombre_jours) > 4;

                  return (
                    <div
                      key={d?.id}
                      className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition hover:border-[#0097ff]/40 hover:shadow-md"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <Link
                          to={`/chef/demandes/${d?.id}`}
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e7ffff] font-bold text-[#93003f]">
                            {nom[0] ? nom[0].toUpperCase() : "A"}
                          </div>
                          <div className="truncate">
                            <p className="truncate font-semibold text-[#3c0038] transition hover:text-[#93003f]">
                              {nom}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-semibold text-[#0097ff]">
                                {d?.type_conge_libelle || d?.type_conge_code || "Congé"}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                REF #{d?.id}
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
                              {d?.date_debut} <span className="text-slate-400">→</span>{" "}
                              {d?.date_fin}
                            </p>
                            <span className="mt-0.5 inline-block rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-bold text-[#93003f]">
                              {d?.nombre_jours} jour{d?.nombre_jours > 1 ? "s" : ""}
                            </span>
                          </div>

                          {!estMaladieLongue && (
                            <div className="flex gap-2">
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

                      {estMaladieLongue && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-amber-600">⚠️</span>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-amber-900">
                                Arrêt maladie supérieur à 4 jours ({d?.nombre_jours} jours)
                              </p>
                              <p className="mt-0.5 text-xs text-amber-700">
                                Souhaitez-vous valider cet arrêt directement ou solliciter une contre-visite médicale ?
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
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
                      Aucune demande correspondant à vos critères.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. ONGLET MALADIE */}
            {ongletActif === "maladie" && (
              <div className="space-y-3">
                {/* Note d'information explicative */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900 shadow-sm">
                  <span className="text-base leading-none">ℹ️</span>
                  <div>
                   <strong>Gestion des congés maladie :</strong> Cet espace regroupe les arrêts maladie du service. 
                   Les arrêts <strong>ordinaires (&le; 4 jours)</strong> sont traités de manière classique, tandis que les 
                   arrêts <strong>exceptionnels (&gt; 4 jours)</strong> nécessitent une <strong>validation médicale (RH)</strong>.
                  </div>
                </div>

                {/* Liste des cartes d'arrêts maladie */}
                {demandesMaladie.map((d) => {
                  const nom = nomComplet(d);

                  return (
                    <div
                      key={d?.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-[#00efff]/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* Gauche : Avatar + Nom + Badge juste "Maladie" */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 font-bold text-[#93003f] text-base">
                          {nom[0] ? nom[0].toUpperCase() : "A"}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-[#3c0038] text-base truncate">
                            {nom}
                          </p>

                          <div className="mt-1.5 flex items-center gap-2">
                            {/* Badge affichant uniquement "Maladie" */}
                            <span className="rounded-full bg-rose-100/70 px-3 py-0.5 text-xs font-semibold text-[#93003f]">
                              Maladie
                            </span>

                            <span className="font-mono text-xs font-medium text-slate-400">
                              #{d?.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Droite : Statut + Période & Durée */}
                      <div className="flex flex-col items-start sm:items-end justify-between border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 gap-2">
                        <div className="pointer-events-none select-none opacity-90 scale-95 origin-right">
                          <StatutBadge statut={d?.statut} />
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Période & Durée
                          </p>
                          <p className="text-sm font-semibold text-slate-700 mt-0.5">
                            {d?.date_debut}{" "}
                            <span className="text-slate-400 font-normal">→</span>{" "}
                            {d?.date_fin}
                          </p>
                          <p className="text-sm font-extrabold text-[#93003f] mt-0.5">
                            {d?.nombre_jours} jour{d?.nombre_jours > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {demandesMaladie.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Aucun arrêt maladie enregistré pour ce service.
                  </div>
                )}
              </div>
            )}

            {/* 3. AGENTS DU SERVICE */}
            {ongletActif === "agents" && (
              <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#e7ffff]/50 border-b border-[#00efff]/20 uppercase tracking-wider text-slate-500 font-semibold">
                    <tr>
                      <th className="p-4">Agent</th>
                      <th className="p-4">Matricule / ID</th>
                      <th className="p-4">Solde Annuel</th>
                      <th className="p-4">Dernier Congé</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agents
                      .filter((a) => {
                        const matchSearch = nomComplet(a).toLowerCase().includes(recherche.toLowerCase());
                        const matchAgentSelect = agentSelectionne === "TOUS" || String(a?.id) === String(agentSelectionne);
                        return matchSearch && matchAgentSelect;
                      })
                      .map((agent) => (
                        <tr key={agent?.id || Math.random()} className="hover:bg-slate-50 transition">
                          <td className="p-4 font-semibold text-[#3c0038] flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7ffff] text-[#93003f] font-bold">
                              {nomComplet(agent)[0]?.toUpperCase()}
                            </div>
                            {nomComplet(agent)}
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            #{agent?.id || agent?.matricule || "N/A"}
                          </td>
                          <td className="p-4 font-bold text-[#0097ff]">
                            {getSoldeAgent(agent?.id)}
                          </td>
                          <td className="p-4 text-slate-600 font-medium">
                            {getDernierCongeAgent(agent?.id)}
                          </td>
                          <td className="p-4 text-right">
                            <Link
                              to={`/chef/agents/${agent?.id}/historique`}
                              className="text-xs font-bold text-[#93003f] hover:underline"
                            >
                              Voir l&apos;historique
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. STATISTIQUES ET RAPPORTS */}
            {ongletActif === "rapports" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-[#3c0038] mb-4">
                    Répartition par Motif de Congé
                  </h3>
                  <div className="space-y-4">
                    {repartitionMotifs.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-700">{item.motif}</span>
                          <span className="text-[#93003f]">
                            {item.pourcentage}% ({item.count} demande{item.count > 1 ? "s" : ""})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#93003f] h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.pourcentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#3c0038] mb-2">
                      Synthèse d&apos;activité
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">
                      Rapport automatisé des présences et de la gestion des congés du service.
                    </p>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-600">Taux de présence globale</span>
                        <span className="font-bold text-[#0097ff]">{stats.tauxPresence}%</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-600">Demandes validées ce mois</span>
                        <span className="font-bold text-slate-800">{stats.validesCeMois}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={telechargerRapportPDF}
                    className="mt-6 w-full py-2.5 rounded-xl border border-[#0097ff] text-[#0097ff] font-bold text-xs hover:bg-[#e7ffff] transition"
                  >
                    Télécharger le rapport complet (PDF)
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal de refus */}
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