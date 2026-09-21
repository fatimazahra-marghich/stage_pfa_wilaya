import { useEffect, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Icônes SVG légères                                                  */
/* ------------------------------------------------------------------ */
const Icone = ({ d, className = "h-5 w-5" }) => (
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
  personnes: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 010 7.75",
  horloge: "M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  batiment: "M3 21h18M6 21V7l6-4 6 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01",
  calendrier: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  valide: "M20 6L9 17l-5-5",
  croix: "M18 6L6 18M6 6l12 12",
  fleche: "M5 12h14M13 6l6 6-6 6",
  avertissement: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
};

export default function DashboardAdminPage() {
  const [kpis, setKpis] = useState({
    totalEmployes: 0,
    demandesEnAttente: 0,
    totalDivisions: 0,
    totalServices: 0,
    tauxAbsence: "0%",
  });

  const [demandes, setDemandes] = useState([]);
  const [dataEvolution, setDataEvolution] = useState([]);
  const [dataStatuts, setDataStatuts] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [traitementId, setTraitementId] = useState(null);

  /* ============================================================
     CHARGEMENT DU DASHBOARD & CALCULS DYNAMIQUES
  ============================================================ */

  async function chargerDashboard() {
    setChargement(true);

    try {
      const [resEmp, resDiv, resSrv, resDem] = await Promise.all([
        api.get("/users/").catch(() => api.get("/utilisateurs/")),
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
        api.get("/demandes-conges/").catch(() => ({ data: [] })),
      ]);

      const listEmp = Array.isArray(resEmp.data) ? resEmp.data : resEmp.data?.results ?? [];
      const listDiv = Array.isArray(resDiv.data) ? resDiv.data : resDiv.data?.results ?? [];
      const listSrv = Array.isArray(resSrv.data) ? resSrv.data : resSrv.data?.results ?? [];
      const listDem = Array.isArray(resDem.data) ? resDem.data : resDem.data?.results ?? [];

      // Filtres des demandes par statut
      const enAttente = listDem.filter(
        (d) => d.statut === "EN_ATTENTE" || d.statut === "PENDING"
      );
      const validees = listDem.filter(
        (d) => d.statut === "ACCORDE" || d.statut === "ACCEPTED" || d.statut === "VALIDEE"
      );
      const refusees = listDem.filter(
        (d) => d.statut === "REFUSE" || d.statut === "REJECTED"
      );

      // Calcul des KPIs
      setKpis({
        totalEmployes: listEmp.length,
        demandesEnAttente: enAttente.length,
        totalDivisions: listDiv.length,
        totalServices: listSrv.length,
        tauxAbsence: listEmp.length > 0 ? `${((validees.length / listEmp.length) * 100).toFixed(1)}%` : "0%",
      });

      // Construction dynamique de la répartition par statut
      setDataStatuts([
        { statut: "Validées", nombre: validees.length, couleur: "#10b981" },
        { statut: "En attente", nombre: enAttente.length, couleur: "#f59e0b" },
        { statut: "Refusées", nombre: refusees.length, couleur: "#f43f5e" },
      ]);

      // Dynamic aggregation par mois (sur les 6 derniers mois)
      const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
      const statsMois = {};

      const auj = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(auj.getFullYear(), auj.getMonth() - i, 1);
        const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        statsMois[cle] = { mois: moisNoms[d.getMonth()], demandes: 0, validees: 0 };
      }

      listDem.forEach((d) => {
        const dateRef = d.date_debut || d.created_at;
        if (!dateRef) return;
        const cle = dateRef.slice(0, 7);
        if (statsMois[cle]) {
          statsMois[cle].demandes += 1;
          if (["ACCORDE", "ACCEPTED", "VALIDEE"].includes(d.statut)) {
            statsMois[cle].validees += 1;
          }
        }
      });

      setDataEvolution(Object.values(statsMois));
      setDemandes(enAttente.slice(0, 5));
    } catch (err) {
      console.error("Erreur de chargement du dashboard :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDashboard();
  }, []);

  /* ============================================================
     TRAITER UNE DEMANDE
  ============================================================ */

  async function traiterDemande(id, statut) {
    setTraitementId(id);
    try {
      await api.patch(`/demandes-conges/${id}/`, { statut });
      await chargerDashboard();
    } catch (err) {
      console.error("Erreur lors du traitement de la demande :", err);
      alert("Impossible de mettre à jour le statut de la demande.");
    } finally {
      setTraitementId(null);
    }
  }

  /* ============================================================
     AFFICHAGE
  ============================================================ */

  return (
    <MainLayout>
      <div className="min-h-full bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* En-tête */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#3c0038] sm:text-3xl">
                Tableau de bord Administrateur
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Vue globale sur les effectifs, la structure organisationnelle et le suivi des congés
              </p>
            </div>
            <button
              onClick={chargerDashboard}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold text-[#3c0038] shadow-sm backdrop-blur transition hover:bg-white"
            >
              Actualiser les données
            </button>
          </div>

          {chargement ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3c0038] border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-[#3c0038]">Chargement des indicateurs...</p>
            </div>
          ) : (
            <div className="space-y-8">

              {/* Cartes KPI */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* KPI 1 : Effectif */}
                <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Effectif Total
                    </span>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3c0038]/10 text-[#3c0038]">
                      <Icone d={I.personnes} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-[#3c0038]">
                      {kpis.totalEmployes}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                      Actifs
                    </span>
                  </div>
                </div>

                {/* KPI 2 : Demandes en attente */}
                <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Demandes en attente
                    </span>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#93003f]/10 text-[#93003f]">
                      <Icone d={I.horloge} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-[#93003f]">
                      {kpis.demandesEnAttente}
                    </span>
                    {kpis.demandesEnAttente > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                        Action requise
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                        À jour
                      </span>
                    )}
                  </div>
                </div>

                {/* KPI 3 : Divisions & Services */}
                <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Divisions / Services
                    </span>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0097ff]/10 text-[#0097ff]">
                      <Icone d={I.batiment} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-[#3c0038]">
                      {kpis.totalDivisions} <span className="text-lg font-normal text-neutral-400">/ {kpis.totalServices}</span>
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0097ff]">
                      Structure
                    </span>
                  </div>
                </div>

                {/* KPI 4 : Taux d'absence */}
                <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Taux d'absence
                    </span>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700">
                      <Icone d={I.calendrier} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-[#3c0038]">
                      {kpis.tauxAbsence}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                      Estimation
                    </span>
                  </div>
                </div>

              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Graphique Évolution */}
                <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur lg:col-span-2">
                  <div className="mb-6">
                    <h2 className="text-base font-bold text-[#3c0038]">
                      Évolution des demandes de congés
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Comparaison sur les 6 derniers mois du volume total et des demandes validées
                    </p>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDemandes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#93003f" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#93003f" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorValidees" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0097ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0097ff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                          }}
                        />
                        <Area type="monotone" dataKey="demandes" stroke="#93003f" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDemandes)" name="Total Demandes" />
                        <Area type="monotone" dataKey="validees" stroke="#0097ff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValidees)" name="Validées" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique Statuts */}
                <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <div className="mb-6">
                    <h2 className="text-base font-bold text-[#3c0038]">
                      Répartition des statuts
                    </h2>
                    <p className="text-xs text-neutral-500">
                      État global de l'ensemble des demandes
                    </p>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataStatuts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="statut" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                        <Bar dataKey="nombre" radius={[8, 8, 0, 0]}>
                          {dataStatuts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.couleur} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Tableau des demandes à valider */}
              <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm backdrop-blur">
                <div className="border-b border-neutral-100 p-6">
                  <h2 className="text-lg font-bold text-[#3c0038]">
                    Dernières demandes en attente de validation
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Traitez directement les demandes nécessitant l'accord de la direction
                  </p>
                </div>

                {demandes.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-neutral-400">
                      Aucune demande en attente pour le moment.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-neutral-100 bg-neutral-50/50 font-semibold text-neutral-500">
                        <tr>
                          <th className="p-4 pl-6">Employé</th>
                          <th className="p-4">Type de congé</th>
                          <th className="p-4">Période</th>
                          <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {demandes.map((d) => (
                          <tr key={d.id} className="transition hover:bg-[#e7ffff]/30">
                            <td className="p-4 pl-6 font-semibold text-[#3c0038]">
                              {d.employe_nom ||
                                d.employe?.first_name ? `${d.employe.first_name} ${d.employe.last_name || ""}` :
                                "Employé"}
                            </td>
                            <td className="p-4 text-neutral-600">
                              <span className="inline-flex rounded-full bg-[#0097ff]/10 px-2.5 py-1 text-xs font-semibold text-[#0097ff]">
                                {d.type_conge || "Congé Payé"}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-medium text-neutral-500">
                              {d.date_debut} au {d.date_fin}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  disabled={traitementId === d.id}
                                  onClick={() => traiterDemande(d.id, "ACCORDE")}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Icone d={I.valide} className="h-3.5 w-3.5" />
                                  Valider
                                </button>
                                <button
                                  disabled={traitementId === d.id}
                                  onClick={() => traiterDemande(d.id, "REFUSE")}
                                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                  <Icone d={I.croix} className="h-3.5 w-3.5" />
                                  Refuser
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}