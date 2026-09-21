import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

/* ------------------------------------------------------------------ */
/* Liste complète et exhaustive de tous les motifs RH                 */
/* ------------------------------------------------------------------ */
const LISTE_MOTIFS_RH = [
  { code: "ANNUEL", libelle: "Congé Annuel" },
  { code: "MALADIE", libelle: "Congé Maladie" },
  { code: "EXCEPTIONNELLE", libelle: "Autorisation Exceptionnelle" },
  { code: "MATERNITE", libelle: "Congé Maternité / Paternité" },
  { code: "PELERINAGE", libelle: "Congé Pèlerinage" },
  { code: "SANS_SOLDE", libelle: "Congé Sans Solde" },
  { code: "RECUPERATION", libelle: "Repos / Récupération" },
  { code: "AUTRE", libelle: "Autre Motif" },
];

function nomComplet(d) {
  const u = d.utilisateur_details || d;
  if (u && (u.nom_complet || u.first_name || u.last_name)) {
    return (
      u.nom_complet ||
      `${u.first_name || u.prenom || ""} ${u.last_name || u.nom || ""}`.trim()
    );
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur || d.id}`;
}

export default function DashboardChefService() {
  const [demandes, setDemandes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState("demandes"); // "demandes" | "agents" | "rapports"
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("TOUS");

  // Modale de refus
  const [demandeRefus, setDemandeRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreurRefus, setErreurRefus] = useState("");

  async function chargerDonnees() {
    setChargement(true);
    try {
      const userConnecte = JSON.parse(localStorage.getItem("user") || "{}");
      const serviceChef =
        userConnecte?.service?.id || userConnecte?.service || null;

      const resDemandes = await api.get("/demandes/").catch(() => ({ data: [] }));
      const resAgents = await api.get("/users/").catch(() => ({ data: [] }));

      let listeDemandes = resDemandes.data?.results ?? resDemandes.data ?? [];
      let listeAgents = resAgents.data?.results ?? resAgents.data ?? [];

      if (serviceChef) {
        listeAgents = listeAgents.filter((agent) => {
          const serviceAgent = agent.service?.id || agent.service;
          return String(serviceAgent) === String(serviceChef);
        });

        listeDemandes = listeDemandes.filter((demande) => {
          const u = demande.utilisateur_details || {};
          const serviceDemande = u.service?.id || u.service || demande.service;
          return String(serviceDemande) === String(serviceChef);
        });
      }

      setDemandes(listeDemandes);
      setAgents(listeAgents);
    } catch (err) {
      console.error("Erreur de chargement du tableau de bord :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Combiner les motifs par défaut et ceux qui existent dans la BDD
  const tousLesMotifsDisponibles = useMemo(() => {
    const map = new Map();
    LISTE_MOTIFS_RH.forEach((m) => map.set(m.code, m.libelle));

    demandes.forEach((d) => {
      const code = d.type_conge_code || d.type_conge;
      const libelle = d.type_conge_libelle || code;
      if (code && !map.has(code)) {
        map.set(code, libelle);
      }
    });

    return Array.from(map.entries()).map(([code, libelle]) => ({
      code,
      libelle,
    }));
  }, [demandes]);

  // Demandes en attente
  const demandesEnAttente = useMemo(() => {
    return demandes.filter(
      (d) =>
        d.statut === "EN_ATTENTE_CHEF" ||
        d.statut === "EN_ATTENTE_NIVEAU1" ||
        d.statut === "EN_ATTENTE"
    );
  }, [demandes]);

  // Filtrage des demandes
  const demandesFiltrees = useMemo(() => {
    return demandesEnAttente.filter((d) => {
      const correspondNom = nomComplet(d)
        .toLowerCase()
        .includes(recherche.toLowerCase());

      const codeConge = d.type_conge_code || d.type_conge;
      const libelleConge = (d.type_conge_libelle || "").toLowerCase();

      const correspondType =
        filtreType === "TOUS" ||
        codeConge === filtreType ||
        libelleConge.includes(filtreType.toLowerCase());

      return correspondNom && correspondType;
    });
  }, [demandesEnAttente, recherche, filtreType]);

  // Calcul des statistiques réelles
  const stats = useMemo(() => {
    const totalJoursAttente = demandesEnAttente.reduce(
      (acc, curr) => acc + (Number(curr.nombre_jours) || 0),
      0
    );
    const valides = demandes.filter(
      (d) => d.statut === "VALIDE" || d.statut === "VALIDEE"
    );

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const absentsAujourdhui = valides.filter((d) => {
      return d.date_debut <= todayStr && d.date_fin >= todayStr;
    }).length;

    const validesCeMois = valides.filter((d) => {
      const dateRef = new Date(d.date_debut || d.created_at);
      return (
        dateRef.getMonth() === currentMonth &&
        dateRef.getFullYear() === currentYear
      );
    }).length;

    const totalAgentsCount =
      agents.length || new Set(demandes.map((d) => d.utilisateur)).size || 1;

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
    };
  }, [demandes, demandesEnAttente, agents]);

  // Répartition réelle par motif
  const repartitionMotifs = useMemo(() => {
    const comptes = {};
    demandes.forEach((d) => {
      const motif = d.type_conge_libelle || d.type_conge_code || "Autre Motif";
      comptes[motif] = (comptes[motif] || 0) + 1;
    });

    const total = demandes.length || 1;
    return Object.entries(comptes).map(([motif, count]) => ({
      motif,
      count,
      pourcentage: Math.round((count / total) * 100),
    }));
  }, [demandes]);

  // Génération du PDF avec jsPDF
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
    doc.text(`• Agents absents aujourd'hui : ${stats.absentsAujourdhui}`, 20, 67);
    doc.text(`• Demandes validées ce mois : ${stats.validesCeMois}`, 20, 74);
    doc.text(`• Demandes en attente d'arbitrage : ${stats.aTraiter}`, 20, 81);

    doc.setFontSize(12);
    doc.text("2. Répartition des demandes par motif", 14, 95);

    let yPosition = 103;
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
          commentaire:
            commentaire ||
            "Demande de contre-visite ordonnée par le Chef de service.",
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
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Espace Chef de Service</span>
              <span>·</span>
              <span className="text-[#93003f]">Vue d&apos;ensemble</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Tableau de Bord Chef de Service
            </h1>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setOngletActif("demandes")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                ongletActif === "demandes"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Demandes ({stats.aTraiter})
            </button>
            <button
              onClick={() => setOngletActif("agents")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                ongletActif === "agents"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Agents du service ({stats.totalAgents})
            </button>
            <button
              onClick={() => setOngletActif("rapports")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                ongletActif === "rapports"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Statistiques & Rapports
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                En attente
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
                Volume sollicité
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#93003f]">
                {stats.joursEnAttente} j
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7ffff] text-[#93003f]">
              <Icone d={I.calendrier} className="h-5 w-5" />
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Absents aujourd&apos;hui
              </p>
              <p className="mt-1 text-2xl font-extrabold text-amber-600">
                {stats.absentsAujourdhui}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Icone d={I.utilisateurs} className="h-5 w-5" />
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

        {/* Barre de Recherche + Menu Déroulant Exhaustif */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un agent du service par son nom..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
            />
          </div>

          {/* MENU DÉROULANT CONTENANT TOUS LES MOTIFS RH */}
          <select
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-4 py-2.5 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40 font-medium text-slate-700"
          >
            <option value="TOUS">Tous les motifs</option>
            {tousLesMotifsDisponibles.map((item) => (
              <option key={item.code} value={item.code}>
                {item.libelle}
              </option>
            ))}
          </select>
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
            {ongletActif === "demandes" && (
              <div className="space-y-4">
                {demandesFiltrees.map((d) => {
                  const nom = nomComplet(d);
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
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-semibold text-[#0097ff]">
                                {d.type_conge_libelle || d.type_conge_code || "Congé"}
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
                              {d.date_debut} <span className="text-slate-400">→</span>{" "}
                              {d.date_fin}
                            </p>
                            <span className="mt-0.5 inline-block rounded-md bg-[#e7ffff] px-2 py-0.5 text-[11px] font-bold text-[#93003f]">
                              {d.nombre_jours} jour{d.nombre_jours > 1 ? "s" : ""}
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
                                Arrêt maladie supérieur à 4 jours ({d.nombre_jours} jours)
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
                      Aucune demande en attente correspondant à vos critères.
                    </p>
                  </div>
                )}
              </div>
            )}

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
                      .filter((a) =>
                        nomComplet(a)
                          .toLowerCase()
                          .includes(recherche.toLowerCase())
                      )
                      .map((agent, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-4 font-semibold text-[#3c0038] flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7ffff] text-[#93003f] font-bold">
                              {nomComplet(agent)[0]?.toUpperCase()}
                            </div>
                            {nomComplet(agent)}
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            #{agent.id || agent.matricule || "N/A"}
                          </td>
                          <td className="p-4 font-bold text-[#0097ff]">
                            {agent.solde_conge ?? 22} jours
                          </td>
                          <td className="p-4 text-slate-600">
                            {agent.dernier_conge || "Aucun récemment"}
                          </td>
                          <td className="p-4 text-right">
                            <Link
                              to={`/chef/regularisation?agent=${agent.id}`}
                              className="text-xs font-bold text-[#93003f] hover:underline"
                            >
                              Demander régularisation
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

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