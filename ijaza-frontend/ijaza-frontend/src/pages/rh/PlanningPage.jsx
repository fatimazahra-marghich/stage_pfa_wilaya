import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

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

export default function PlanningPage() {
  const [demandes, setDemandes] = useState([]);
  const [typesConge, setTypesConge] = useState([]);
  const [joursFeriesBDD, setJoursFeriesBDD] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Filtres
  const [moisSelectionne, setMoisSelectionne] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [rechercheAgent, setRechercheAgent] = useState("");
  const [typeFiltre, setTypeFiltre] = useState("TOUS");
  const [statutFiltre, setStatutFiltre] = useState("VALIDEE");

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);
    try {
      const [{ data: dRes }, { data: tRes }, { data: fRes }] = await Promise.all([
        api.get("/demandes/"),
        api.get("/types-conge/").catch(() => ({ data: [] })),
        api.get("/jours-feries/").catch(() => ({ data: [] })),
      ]);

      setDemandes(dRes.results ?? dRes ?? []);
      setTypesConge(tRes.results ?? tRes ?? []);
      setJoursFeriesBDD(fRes.results ?? fRes ?? []);
    } catch (err) {
      console.error("Erreur de chargement des données du planning :", err);
    } finally {
      setChargement(false);
    }
  }

  // Année, mois et jours du calendrier
  const [annee, mois] = moisSelectionne.split("-").map(Number);
  const nombreJoursDansMois = new Date(annee, mois, 0).getDate();
  const joursDuMois = Array.from({ length: nombreJoursDansMois }, (_, i) => i + 1);

  // Vérification Week-end
  const estWeekEnd = (jour) => {
    const day = new Date(annee, mois - 1, jour, 12, 0, 0).getDay();
    return day === 0 || day === 6;
  };

  // Vérification Jour Férié en BDD (Ponctuel + Récurrent)
  const estJourFerie = (jour) => {
    const moisCourant = mois - 1;
    const dateCourante = new Date(annee, moisCourant, jour, 12, 0, 0);

    return joursFeriesBDD.some((f) => {
      const [dYear, dMonth, dDay] = f.date_debut.split("-").map(Number);
      const [fYear, fMonth, fDay] = f.date_fin.split("-").map(Number);

      // 1. Récurrent
      if (f.est_recurrent) {
        const fMoisDebut = dMonth - 1;
        const fMoisFin = fMonth - 1;

        if (fMoisDebut === fMoisFin) {
          return moisCourant === fMoisDebut && jour >= dDay && jour <= fDay;
        }

        const dateCourtMoisJour = (moisCourant + 1) * 100 + jour;
        const debutMoisJour = dMonth * 100 + dDay;
        const finMoisJour = fMonth * 100 + fDay;

        return dateCourtMoisJour >= debutMoisJour && dateCourtMoisJour <= finMoisJour;
      }

      // 2. Ponctuel
      const debut = new Date(dYear, dMonth - 1, dDay, 0, 0, 0);
      const fin = new Date(fYear, fMonth - 1, fDay, 23, 59, 59);

      return dateCourante >= debut && dateCourante <= fin;
    });
  };

  // Calcul du statut réel Django
  const calculerStatutReel = (d) => {
    const typeCode = (d.type_conge_details?.code || d.type_conge_code || "").toUpperCase();
    const estMaladie = typeCode === "MALADIE" || d.type_conge_libelle?.toLowerCase().includes("maladie");

    if (estMaladie && Number(d.nombre_jours) <= 4) {
      return "VALIDEE";
    }
    return d.statut || "EN_ATTENTE_CHEF";
  };

  // Traitement et groupement des agents
  const agents = useMemo(() => {
    const parAgent = {};

    const demandesFiltrees = demandes.filter((d) => {
      if (Number(d.nombre_jours) === 0) return false;
      if (d.statut === "ANNULEE" || d.statut === "ANNULE") return false;

      const statutReel = calculerStatutReel(d);

      if (statutFiltre === "VALIDEE") {
        if (statutReel !== "VALIDEE" && statutReel !== "VALIDE") return false;
      } else if (statutFiltre === "EN_ATTENTE_CHEF") {
        if (statutReel !== "EN_ATTENTE_CHEF") return false;
      } else if (statutFiltre === "EN_ATTENTE_RH") {
        if (statutReel !== "EN_ATTENTE_RH") return false;
      } else if (statutFiltre === "EN_ATTENTE_TOUT") {
        if (!["EN_ATTENTE_CHEF", "EN_ATTENTE_RH", "EN_ATTENTE_SANTE", "EN_ATTENTE"].includes(statutReel)) return false;
      } else if (statutFiltre === "VALIDEES_ET_ATTENTE") {
        if (["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel)) return false;
      } else if (statutFiltre === "REFUSEE") {
        if (!["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel)) return false;
      }

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
      let codeCouleur = "VALIDEE";
      if (statutReel === "EN_ATTENTE_CHEF") codeCouleur = "EN_ATTENTE_CHEF";
      else if (statutReel === "EN_ATTENTE_RH") codeCouleur = "EN_ATTENTE_RH";
      else if (statutReel === "EN_ATTENTE_SANTE") codeCouleur = "EN_ATTENTE_SANTE";
      else if (["REFUSEE_CHEF", "REFUSEE_RH", "REFUSEE", "REFUSE"].includes(statutReel)) codeCouleur = "REFUSEE";

      const [dYear, dMonth, dDay] = d.date_debut.split("-").map(Number);
      const [fYear, fMonth, fDay] = d.date_fin.split("-").map(Number);

      parAgent[key].periodes.push({
        id: d.id,
        debut: new Date(dYear, dMonth - 1, dDay, 0, 0, 0),
        fin: new Date(fYear, fMonth - 1, fDay, 23, 59, 59),
        typeLibelle: d.type_conge_libelle || d.type_conge_details?.libelle || "Congé",
        couleur: COULEURS_STATUT[codeCouleur] || COULEURS_STATUT.DEFAULT,
        statutAffichage: statutReel,
      });
    });

    return Object.values(parAgent);
  }, [demandes, typeFiltre, statutFiltre]);

  const agentsFiltres = useMemo(() => {
    return agents.filter((a) =>
      a.nom.toLowerCase().includes(rechercheAgent.toLowerCase())
    );
  }, [agents, rechercheAgent]);

  function getAbsencesJour(agent, jour) {
    const dateCourante = new Date(annee, mois - 1, jour, 12, 0, 0);
    return agent.periodes.filter((p) => dateCourante >= p.debut && dateCourante <= p.fin);
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        
        {/* Header Épuré sans "Ressources Humaines" et sans "& Rapports" */}
        <header className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#3c0038]">
              Planning des Absences
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={moisSelectionne}
              onChange={(e) => setMoisSelectionne(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#3c0038] outline-none focus:border-cyan-400 shadow-sm"
            />
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-[#3c0038] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#800038]"
            >
              Imprimer / PDF
            </button>
          </div>
        </header>

        {/* Légende Visuelle */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">LÉGENDE :</span>
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
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm sm:grid-cols-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={rechercheAgent}
              onChange={(e) => setRechercheAgent(e.target.value)}
              placeholder="Rechercher un agent..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={typeFiltre}
            onChange={(e) => setTypeFiltre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-cyan-400"
          >
            <option value="TOUS">Tous les types de congés</option>
            {typesConge.map((t) => (
              <option key={t.id} value={t.id}>
                {t.libelle}
              </option>
            ))}
          </select>

          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-cyan-400"
          >
            <option value="VALIDEE">Absences validées uniquement</option>
            <option value="EN_ATTENTE_CHEF">En attente (Chef)</option>
            <option value="EN_ATTENTE_RH">En attente (RH)</option>
            <option value="EN_ATTENTE_TOUT">Toutes les demandes en attente</option>
            <option value="VALIDEES_ET_ATTENTE">Validées + En attente</option>
            <option value="REFUSEE">Demandes refusées</option>
            <option value="TOUS">Toutes les demandes</option>
          </select>
        </div>

        {/* Grille du Planning */}
        <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-cyan-100 bg-cyan-50/50">
                  <th className="sticky left-0 z-10 min-w-[180px] border-r border-cyan-200 bg-cyan-100/60 px-4 py-3 font-bold text-[#3c0038]">
                    Agent ({agentsFiltres.length})
                  </th>
                  {joursDuMois.map((j) => {
                    const weekend = estWeekEnd(j);
                    const ferie = estJourFerie(j);
                    return (
                      <th
                        key={j}
                        className={`min-w-[34px] border-r border-cyan-100 px-1 py-2 text-center font-bold ${
                          ferie
                            ? "bg-amber-200/80 text-amber-900"
                            : weekend
                            ? "bg-slate-200/60 text-slate-600"
                            : "text-slate-700"
                        }`}
                      >
                        {j}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-50">
                {chargement ? (
                  <tr>
                    <td colSpan={nombreJoursDansMois + 1} className="py-12 text-center text-slate-400 font-medium">
                      Chargement du planning...
                    </td>
                  </tr>
                ) : agentsFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={nombreJoursDansMois + 1} className="py-12 text-center text-slate-400 font-medium">
                      Aucune donnée à afficher pour ce mois selon les filtres.
                    </td>
                  </tr>
                ) : (
                  agentsFiltres.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition">
                      <td className="sticky left-0 z-10 truncate border-r border-cyan-200 bg-white px-4 py-3.5 font-bold text-[#3c0038]">
                        {agent.nom}
                      </td>
                      {joursDuMois.map((j) => {
                        const absences = getAbsencesJour(agent, j);
                        const weekend = estWeekEnd(j);
                        const ferie = estJourFerie(j);
                        return (
                          <td
                            key={j}
                            className={`border-r border-cyan-50 p-0.5 text-center transition ${
                              ferie
                                ? "bg-amber-100/40"
                                : weekend
                                ? "bg-slate-100/70"
                                : ""
                            }`}
                          >
                            {absences.map((abs, index) => (
                              <div
                                key={index}
                                className={`h-5 w-full rounded-md ${abs.couleur} shadow-xs transition-transform hover:scale-105 cursor-pointer`}
                                title={`${agent.nom} - ${abs.typeLibelle} (${abs.statutAffichage})`}
                              />
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}