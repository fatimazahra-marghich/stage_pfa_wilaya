import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function nomComplet(d) {
  if (!d) return "Inconnu";
  const u = d.utilisateur_details || d.utilisateur || {};
  if (typeof u === "object") {
    if (u.nom_complet) return u.nom_complet;
    if (u.first_name || u.last_name) return `${u.first_name || ""} ${u.last_name || ""}`.trim();
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur}`;
}

export default function PlanningPage() {
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [moisSelectionne, setMoisSelectionne] = useState(
    new Date().toISOString().slice(0, 7) // Format YYYY-MM
  );

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);
    try {
      const { data } = await api.get("/demandes/");
      const liste = data.results ?? data;
      setDemandes(Array.isArray(liste) ? liste : []);
    } catch (err) {
      console.error("Erreur de chargement du planning :", err);
    } finally {
      setChargement(false);
    }
  }

  // Demandes valides pour le planning (exclut les refusées et annulées)
  const demandesPlanning = useMemo(() => {
    return demandes.filter(
      (d) => d.statut !== "REFUSEE_RH" && d.statut !== "REFUSEE_CHEF" && d.statut !== "ANNULEE"
    );
  }, [demandes]);

  // Calcul du calendrier
  const [annee, mois] = moisSelectionne.split("-").map(Number);
  const nombreJoursDansMois = new Date(annee, mois, 0).getDate();
  const joursDuMois = Array.from({ length: nombreJoursDansMois }, (_, i) => i + 1);

  const estEnConge = (demande, jour) => {
    const dateJour = new Date(annee, mois - 1, jour);
    const debut = new Date(demande.date_debut);
    const fin = new Date(demande.date_fin);
    return dateJour >= debut && dateJour <= fin;
  };

  // --- ANALYTICS & STATISTIQUES ---
  const parType = useMemo(() => {
    const compte = {};
    demandes.forEach((d) => {
      const lib = d.type_conge_libelle || "Autre";
      compte[lib] = (compte[lib] ?? 0) + 1;
    });
    return Object.entries(compte).map(([nom, total]) => ({ nom, total }));
  }, [demandes]);

  const tauxApprobation = useMemo(() => {
    const traitees = demandes.filter((d) =>
      ["VALIDEE", "REFUSEE_RH", "REFUSEE_CHEF"].includes(d.statut)
    );
    if (traitees.length === 0) return 0;
    const validees = traitees.filter((d) => d.statut === "VALIDEE").length;
    return Math.round((validees / traitees.length) * 100);
  }, [demandes]);

  // Impression / Exporter PDF
  const imprimerRapport = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Ressources Humaines</span>
              <span>·</span>
              <span className="text-[#93003f]">Analyse & Organisation</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Planning des Absences & Rapports
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="month"
              value={moisSelectionne}
              onChange={(e) => setMoisSelectionne(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#3c0038] outline-none focus:border-[#0097ff]"
            />
            <button
              onClick={imprimerRapport}
              className="rounded-xl bg-[#3c0038] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#93003f]"
            >
              Imprimer / PDF
            </button>
          </div>
        </header>

        {/* CARTES INDICATEURS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Demandes</p>
            <p className="mt-2 text-3xl font-black text-[#3c0038]">{demandes.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Absences Planifiées (Ce Mois)</p>
            <p className="mt-2 text-3xl font-black text-[#0097ff]">{demandesPlanning.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-[#93003f] to-[#3c0038] p-5 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Taux d'Approbation</p>
            <p className="mt-2 text-3xl font-black">{tauxApprobation}%</p>
          </div>
        </div>

        {/* SECTION 1 : CALENDRIER INTERACTIF */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#3c0038]">
              Planning du mois : {MOIS_NOMS[mois - 1]} {annee}
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#93003f]"></span> Validé
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-400"></span> En attente
              </span>
            </div>
          </div>

          {chargement ? (
            <div className="py-12 text-center text-xs text-slate-400">Chargement du planning...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full border-collapse text-left text-xs min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 font-bold text-slate-700 min-w-[180px] sticky left-0 bg-slate-50 z-10">
                      Employé
                    </th>
                    <th className="p-3 font-bold text-slate-700 min-w-[110px]">Type</th>
                    {joursDuMois.map((j) => (
                      <th
                        key={j}
                        className="p-1.5 text-center border-l border-slate-200 w-7 font-bold text-slate-500"
                      >
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demandesPlanning.length === 0 ? (
                    <tr>
                      <td colSpan={joursDuMois.length + 2} className="p-8 text-center text-slate-400">
                        Aucun congé prévu sur cette période.
                      </td>
                    </tr>
                  ) : (
                    demandesPlanning.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-[#3c0038] sticky left-0 bg-white z-10 border-r border-slate-100">
                          {nomComplet(d)}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {d.type_conge_libelle || "Congé"}
                        </td>
                        {joursDuMois.map((j) => {
                          const enConge = estEnConge(d, j);
                          const estValide = d.statut === "VALIDEE";

                          return (
                            <td
                              key={j}
                              className={`p-1 text-center border-l border-slate-100 text-[10px] ${
                                enConge
                                  ? estValide
                                    ? "bg-[#93003f] text-white font-bold"
                                    : "bg-amber-300 text-amber-900 font-bold"
                                  : ""
                              }`}
                              title={enConge ? `${nomComplet(d)} (${d.statut})` : ""}
                            >
                              {enConge ? "•" : ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 2 : GRAPHIQUES ET STATISTIQUES */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Répartition par Type */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-[#3c0038] mb-4">Répartition des Demandes par Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3c0038" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Synthèse par statut */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-[#3c0038]">Résumé Statut des Demandes</h3>
            <div className="space-y-3 text-xs font-semibold">
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 text-emerald-800">
                <span>Congés Validés RH</span>
                <span className="font-bold">{demandes.filter(d => d.statut === "VALIDEE").length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50 text-amber-800">
                <span>En attente de validation</span>
                <span className="font-bold">{demandes.filter(d => d.statut.includes("ATTENTE")).length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 text-rose-800">
                <span>Demandes Refusées</span>
                <span className="font-bold">{demandes.filter(d => d.statut.includes("REFUSEE")).length}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}