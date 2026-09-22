import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const COULEURS_STATUT = {
  VALIDEE: "bg-emerald-500 hover:bg-emerald-600",
  VALIDE: "bg-emerald-500 hover:bg-emerald-600",
  EN_ATTENTE_CHEF: "bg-amber-500 hover:bg-amber-600",
  EN_ATTENTE_RH: "bg-indigo-500 hover:bg-indigo-600",
  EN_ATTENTE_SANTE: "bg-purple-500 hover:bg-purple-600",
  REFUSEE: "bg-rose-500 hover:bg-rose-600",
  REFUSE: "bg-rose-500 hover:bg-rose-600",
  DEFAULT: "bg-[#0097ff]",
};

export default function TeamCalendar() {
  const [demandes, setDemandes] = useState([]);
  const [typesConge, setTypesConge] = useState([]);
  const [joursFeriesBDD, setJoursFeriesBDD] = useState([]);
  const [curseur, setCurseur] = useState(new Date());
  
  // Filtres
  const [rechercheAgent, setRechercheAgent] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("TOUS");
  const [statutFiltre, setStatutFiltre] = useState("VALIDEE");

  useEffect(() => {
    Promise.all([
      api.get("/demandes/"),
      api.get("/types-conge/").catch(() => ({ data: [] })),
      api.get("/jours-feries/").catch(() => ({ data: [] })),
    ]).then(([{ data: dRes }, { data: tRes }, { data: fRes }]) => {
      setDemandes(dRes.results ?? dRes ?? []);
      setTypesConge(tRes.results ?? tRes ?? []);
      setJoursFeriesBDD(fRes.results ?? fRes ?? []);
    });
  }, []);

  const annee = curseur.getFullYear();
  const mois = curseur.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const jours = Array.from({ length: nbJours }, (_, i) => i + 1);

  // Vérifie si un jour donné est un jour férié défini par l'Admin
  const estJourFerie = (jour) => {
    const moisCourant = mois;
    const dateCourante = new Date(annee, moisCourant, jour, 12, 0, 0);
    
    return joursFeriesBDD.some((f) => {
      const [dYear, dMonth, dDay] = f.date_debut.split("-").map(Number);
      const [fYear, fMonth, fDay] = f.date_fin.split("-").map(Number);

      // 1. JOUR FÉRIÉ RÉCURRENT
      if (f.est_recurrent) {
        const fMoisDebut = dMonth - 1;
        const fMoisFin = fMonth - 1;

        if (fMoisDebut === fMoisFin) {
          return (
            moisCourant === fMoisDebut &&
            jour >= dDay &&
            jour <= fDay
          );
        }
        
        const dateCourtMoisJour = (moisCourant + 1) * 100 + jour;
        const debutMoisJour = dMonth * 100 + dDay;
        const finMoisJour = fMonth * 100 + fDay;

        return dateCourtMoisJour >= debutMoisJour && dateCourtMoisJour <= finMoisJour;
      }

      // 2. JOUR FÉRIÉ PONCTUEL
      const debut = new Date(dYear, dMonth - 1, dDay, 0, 0, 0);
      const fin = new Date(fYear, fMonth - 1, fDay, 23, 59, 59);

      return dateCourante >= debut && dateCourante <= fin;
    });
  };

  // Calcule le statut réel selon la logique métier Backend Django
  const calculerStatutReel = (d) => {
    const typeCode = (d.type_conge_details?.code || d.type_conge_code || "").toUpperCase();
    const estMaladie = typeCode === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie");

    // Les congés maladie de courte durée sont validés automatiquement
    if (estMaladie && Number(d.nombre_jours) <= 4) {
      return "VALIDEE";
    }

    return d.statut || "EN_ATTENTE_CHEF";
  };

  const agents = useMemo(() => {
    const parAgent = {};

    const demandesFiltrees = demandes.filter((d) => {
      // 1. Exclusion des demandes de 0 jour et des demandes ANNULÉES
      if (Number(d.nombre_jours) === 0) return false;
      if (d.statut === "ANNULEE" || d.statut === "ANNULE") return false;

      const statutReel = calculerStatutReel(d);

      // 2. Filtres par Statuts séparés
      if (statutFiltre === "VALIDEE") {
        if (statutReel !== "VALIDEE" && statutReel !== "VALIDE") return false;
      } 
      else if (statutFiltre === "EN_ATTENTE_CHEF") {
        if (statutReel !== "EN_ATTENTE_CHEF") return false;
      }
      else if (statutFiltre === "EN_ATTENTE_RH") {
        if (statutReel !== "EN_ATTENTE_RH") return false;
      }
      else if (statutFiltre === "EN_ATTENTE_TOUT") {
        const estEnAttente = ["EN_ATTENTE_CHEF", "EN_ATTENTE_RH", "EN_ATTENTE_SANTE", "EN_ATTENTE"].includes(statutReel);
        if (!estEnAttente) return false;
      }
      else if (statutFiltre === "VALIDEES_ET_ATTENTE") {
        const estRefusee = ["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel);
        if (estRefusee) return false;
      }
      else if (statutFiltre === "REFUSEE") {
        const estRefusee = ["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel);
        if (!estRefusee) return false;
      }

      // 3. Filtre par type de congé
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
      
      // Affectation de la couleur selon le statut spécifique
      let codeCouleur = "VALIDEE";
      if (statutReel === "EN_ATTENTE_CHEF") {
        codeCouleur = "EN_ATTENTE_CHEF";
      } else if (statutReel === "EN_ATTENTE_RH") {
        codeCouleur = "EN_ATTENTE_RH";
      } else if (statutReel === "EN_ATTENTE_SANTE") {
        codeCouleur = "EN_ATTENTE_SANTE";
      } else if (["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel)) {
        codeCouleur = "REFUSEE";
      }

      const [dYear, dMonth, dDay] = d.date_debut.split("-").map(Number);
      const [fYear, fMonth, fDay] = d.date_fin.split("-").map(Number);

      let libelleAffichageStatut = statutReel;
      if (statutReel === "EN_ATTENTE_CHEF") libelleAffichageStatut = "En attente du Chef";
      if (statutReel === "EN_ATTENTE_RH") libelleAffichageStatut = "Validé Chef - En attente RH";
      if (statutReel === "VALIDEE") libelleAffichageStatut = "Validé définitif";

      parAgent[key].periodes.push({
        id: d.id,
        debut: new Date(dYear, dMonth - 1, dDay, 0, 0, 0),
        fin: new Date(fYear, fMonth - 1, fDay, 23, 59, 59),
        typeLibelle: d.type_conge_libelle || d.type_conge_details?.libelle || "Congé",
        couleur: COULEURS_STATUT[codeCouleur] || COULEURS_STATUT.DEFAULT,
        statutAffichage:
          d.type_conge_code === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie")
            ? "Validé (Automatique - Maladie)"
            : libelleAffichageStatut,
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
    const dateCourante = new Date(annee, mois, jour, 12, 0, 0);
    return agent.periodes.filter((p) => dateCourante >= p.debut && dateCourante <= p.fin);
  }

  function estWeekEnd(jour) {
    const day = new Date(annee, mois, jour, 12, 0, 0).getDay();
    return day === 0 || day === 6;
  }

  function changerMois(delta) {
    setCurseur(new Date(annee, mois + delta, 1));
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Planning des congés de l&apos;équipe
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              {MOIS_FR[mois]} <span className="text-[#93003f]">{annee}</span>
            </h1>
          </div>

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
                title="Aujourd'hui"
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

        {/* Légende mise à jour avec distinction Chef et RH */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Légende :</span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-emerald-500" /> Validées / Auto
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-amber-500" /> En attente (Chef)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-indigo-500" /> En attente (RH)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-rose-500" /> Refusées
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-slate-200 border border-slate-300" /> Week-end
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-3 w-3 rounded bg-amber-200 border border-amber-300" /> Jour Férié
          </span>
        </div>

        {/* Barre de Filtres */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:grid-cols-3">
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

          {/* Options de Filtre du Statut mis à jour */}
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0097ff]"
          >
            <option value="VALIDEE">Absences validées uniquement</option>
            <option value="EN_ATTENTE_CHEF">En attente de MA validation (Chef)</option>
            <option value="EN_ATTENTE_RH">En attente de validation RH</option>
            <option value="EN_ATTENTE_TOUT">Toutes les demandes en attente</option>
            <option value="VALIDEES_ET_ATTENTE">Validées + En attente (Toutes)</option>
            <option value="REFUSEE">Demandes refusées</option>
            <option value="TOUS">Toutes les demandes (Tout afficher)</option>
          </select>
        </div>

        {/* Grille du Planning */}
        <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#00efff]/30 bg-[#e7ffff]/40">
                  <th className="sticky left-0 z-10 min-w-[180px] border-r border-[#00efff]/30 bg-[#e7ffff] px-4 py-3 font-bold text-[#3c0038]">
                    Agent ({agentsFiltres.length})
                  </th>
                  {jours.map((j) => {
                    const weekend = estWeekEnd(j);
                    const ferie = estJourFerie(j);
                    return (
                      <th
                        key={j}
                        className={`min-w-[32px] border-r border-[#00efff]/20 px-1 py-2 text-center font-bold ${
                          ferie
                            ? "bg-amber-100 text-amber-900"
                            : weekend
                            ? "bg-slate-200/70 text-slate-600"
                            : "text-slate-700"
                        }`}
                      >
                        {j}
                      </th>
                    );
                  })}
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
                      const ferie = estJourFerie(j);
                      return (
                        <td
                          key={j}
                          className={`border-r border-[#00efff]/10 p-0.5 text-center transition ${
                            ferie
                              ? "bg-amber-50/70"
                              : weekend
                              ? "bg-slate-100/80"
                              : ""
                          }`}
                        >
                          {absences.map((abs, index) => (
                            <div
                              key={index}
                              className={`h-5 w-full rounded ${abs.couleur} shadow-xs cursor-pointer transition-transform hover:scale-105`}
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