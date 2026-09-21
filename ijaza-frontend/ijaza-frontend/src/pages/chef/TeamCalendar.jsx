import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// 🎨 Couleurs attribuées selon l'état réel de la demande
const COULEURS_STATUT = {
  VALIDEE: "bg-emerald-500",   // 🟢 Vert : Validé ou Maladie (Auto)
  VALIDE: "bg-emerald-500",
  EN_ATTENTE: "bg-amber-500",  // 🟠 Orange : En attente (> 4j / cas spécial)
  REFUSEE: "bg-rose-500",      // 🔴 Rouge : Demande refusée
  REFUSE: "bg-rose-500",
  DEFAULT: "bg-[#0097ff]",     // 🔵 Bleu
};

export default function TeamCalendar() {
  const [demandes, setDemandes] = useState([]);
  const [typesConge, setTypesConge] = useState([]);
  const [curseur, setCurseur] = useState(new Date());
  
  // Filtres
  const [rechercheAgent, setRechercheAgent] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("TOUS");
  const [statutFiltre, setStatutFiltre] = useState("VALIDEE");

  useEffect(() => {
    Promise.all([
      api.get("/demandes/"),
      api.get("/types-conge/").catch(() => ({ data: [] })),
    ]).then(([{ data: dRes }, { data: tRes }]) => {
      setDemandes(dRes.results ?? dRes ?? []);
      setTypesConge(tRes.results ?? tRes ?? []);
    });
  }, []);

  const annee = curseur.getFullYear();
  const mois = curseur.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const jours = Array.from({ length: nbJours }, (_, i) => i + 1);

  // Fonction utilitaire pour calculer le statut réel selon les règles métier
  const calculerStatutReel = (d) => {
    const typeCode = (d.type_conge_details?.code || d.type_conge_code || "").toUpperCase();
    const estMaladie = typeCode === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie");

    // Règle 1 : La maladie est automatiquement VALIDÉE
    if (estMaladie) return "VALIDEE";

    // Règle 2 : Cas spécial / exceptionnel > 4 jours non encore traité -> EN_ATTENTE
    const debut = new Date(d.date_debut);
    const fin = new Date(d.date_fin);
    const dureeJours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;

    if ((typeCode === "EXCEPTIONNEL" || typeCode === "CAS_SPECIAL") && dureeJours > 4) {
      if (d.statut !== "VALIDEE" && d.statut !== "VALIDE" && d.statut !== "REFUSEE" && d.statut !== "REFUSE") {
        return "EN_ATTENTE";
      }
    }

    return d.statut || "EN_ATTENTE";
  };

  // Regroupement par agent
  const agents = useMemo(() => {
    const parAgent = {};

    const demandesFiltrees = demandes.filter((d) => {
      const statutReel = calculerStatutReel(d);

      // 1. Filtrage selon le menu déroulant Statut
      if (statutFiltre === "VALIDEE") {
        if (statutReel !== "VALIDEE" && statutReel !== "VALIDE") return false;
      } 
      else if (statutFiltre === "EN_ATTENTE") {
        if (!statutReel?.startsWith("EN_ATTENTE")) return false;
      }
      else if (statutFiltre === "VALIDEES_ET_ATTENTE") {
        if (statutReel === "REFUSEE" || statutReel === "REFUSE") return false;
      }
      else if (statutFiltre === "REFUSEE") {
        if (statutReel !== "REFUSEE" && statutReel !== "REFUSE") return false;
      }
      // "TOUS" : Tout afficher

      // 2. Filtre par type de congé
      if (typeFiltre !== "TOUS") {
        const typeId = d.type_conge?.id || d.type_conge;
        if (String(typeId) !== String(typeFiltre)) return false;
      }

      return true;
    });

    demandesFiltrees.forEach((d) => {
      const key = d.utilisateur;
      const nomAgent =
        d.utilisateur_details?.nom_complet ||
        d.utilisateur_nom ||
        `Agent #${d.utilisateur}`;

      if (!parAgent[key]) {
        parAgent[key] = {
          id: key,
          nom: nomAgent,
          periodes: [],
        };
      }

      const statutReel = calculerStatutReel(d);
      const codeCouleur = statutReel?.startsWith("EN_ATTENTE")
        ? "EN_ATTENTE"
        : statutReel?.startsWith("REFUS")
        ? "REFUSEE"
        : "VALIDEE";

      parAgent[key].periodes.push({
        id: d.id,
        debut: new Date(d.date_debut),
        fin: new Date(d.date_fin),
        typeLibelle: d.type_conge_libelle || d.type_conge_details?.libelle || "Congé",
        couleur: COULEURS_STATUT[codeCouleur] || COULEURS_STATUT.DEFAULT,
        statutAffichage:
          d.type_conge_code === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie")
            ? "Validé (Automatique - Maladie)"
            : statutReel,
      });
    });

    return Object.values(parAgent);
  }, [demandes, typeFiltre, statutFiltre]);

  const agentsFiltres = useMemo(
    () =>
      agents.filter((a) =>
        a.nom.toLowerCase().includes(rechercheAgent.toLowerCase())
      ),
    [agents, rechercheAgent]
  );

  function getAbsencesJour(agent, jour) {
    const date = new Date(annee, mois, jour);
    return agent.periodes.filter((p) => date >= p.debut && date <= p.fin);
  }

  function estWeekEnd(jour) {
    const day = new Date(annee, mois, jour).getDay();
    return day === 0 || day === 6;
  }

  function changerMois(delta) {
    setCurseur(new Date(annee, mois + delta, 1));
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* En-tête avec Navigation Mois à droite */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Planning des congés de l&apos;équipe
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              {MOIS_FR[mois]} <span className="text-[#93003f]">{annee}</span>
            </h1>
          </div>

          {/* Bloc de droite : Navigation Mois + Bouton Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
              <button
                onClick={() => changerMois(-1)}
                title="Mois précédent"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#3c0038] shadow-xs transition hover:bg-[#93003f] hover:text-white border border-slate-200 cursor-pointer"
              >
                <span className="text-xs font-bold">◀</span>
              </button>

              <button
                onClick={() => setCurseur(new Date())}
                title="Revenir à aujourd'hui"
                className="rounded-lg px-3 py-1 text-xs font-bold text-[#3c0038] transition hover:bg-[#e7ffff] cursor-pointer"
              >
                Aujourd&apos;hui
              </button>

              <button
                onClick={() => changerMois(1)}
                title="Mois suivant"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#3c0038] shadow-xs transition hover:bg-[#93003f] hover:text-white border border-slate-200 cursor-pointer"
              >
                <span className="text-xs font-bold">▶</span>
              </button>
            </div>

            <Link
              to="/chef/corriger-solde"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#93003f] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#3c0038]"
            >
              <Icone d={I.reglage} className="h-4 w-4" />
              Régulariser un solde
            </Link>
          </div>
        </header>

        {/* Légende complète */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Légende :</span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-emerald-500" /> Validées / Auto (Maladie)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-amber-500" /> En attente (&gt; 4j / Cas spé.)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-rose-500" /> Demandes refusées
          </span>
        </div>

        {/* Barre de Filtres */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:grid-cols-3">
          {/* Recherche par agent */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={rechercheAgent}
              onChange={(e) => setRechercheAgent(e.target.value)}
              placeholder="Rechercher un agent..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-[#0097ff]"
            />
          </div>

          {/* Filtre par Type de Congé */}
          <select
            value={typeFiltre}
            onChange={(e) => setTypeFiltre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0097ff]"
          >
            <option value="TOUS">Tous les types de congés</option>
            {typesConge.map((t) => (
              <option key={t.id} value={t.id}>
                {t.libelle}
              </option>
            ))}
          </select>

          {/* Filtre par Statut */}
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0097ff]"
          >
            <option value="VALIDEE">Absences validées uniquement</option>
            <option value="EN_ATTENTE">Demandes en attente</option>
            <option value="VALIDEES_ET_ATTENTE">Validées + En attente</option>
            <option value="REFUSEE">Demandes refusées</option>
            <option value="TOUS">Toutes les demandes (Tout afficher)</option>
          </select>
        </div>

        {/* Planning Matrix */}
        <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#00efff]/30 bg-[#e7ffff]/40">
                  <th className="sticky left-0 z-10 min-w-[180px] border-r border-[#00efff]/30 bg-[#e7ffff] px-4 py-3 font-bold text-[#3c0038]">
                    Agent ({agentsFiltres.length})
                  </th>
                  {jours.map((j) => (
                    <th
                      key={j}
                      className={`min-w-[32px] border-r border-[#00efff]/20 px-1 py-2 text-center font-medium ${
                        estWeekEnd(j) ? "bg-slate-100 text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {j}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00efff]/20">
                {agentsFiltres.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 truncate border-r border-[#00efff]/30 bg-white px-4 py-3 font-semibold text-[#3c0038]">
                      {agent.nom}
                    </td>
                    {jours.map((j) => {
                      const absences = getAbsencesJour(agent, j);
                      const weekend = estWeekEnd(j);
                      return (
                        <td
                          key={j}
                          className={`border-r border-[#00efff]/10 p-0.5 text-center ${
                            weekend ? "bg-slate-50" : ""
                          }`}
                        >
                          {absences.map((abs, index) => (
                            <div
                              key={index}
                              className={`h-5 w-full rounded ${abs.couleur} shadow-xs cursor-pointer`}
                              title={`${agent.nom} - ${abs.typeLibelle} (${abs.statutAffichage})`}
                            />
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {agentsFiltres.length === 0 && (
                  <tr>
                    <td colSpan={nbJours + 1} className="py-10 text-center text-slate-400">
                      Aucune donnée à afficher pour ce mois selon les filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}