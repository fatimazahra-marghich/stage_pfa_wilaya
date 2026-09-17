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

export default function DashboardAdminPage() {
  const [kpis, setKpis] = useState({
    totalEmployes: 0,
    demandesEnAttente: 0,
    totalDepartements: 0,
    tauxAbsence: "0%",
  });

  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);

  /* ============================================================
     DONNÉES DES GRAPHIQUES
     Pour le moment, ce sont des données de démonstration.
     Tu pourras ensuite les remplacer par les données de ton API.
  ============================================================ */

  const dataEvolution = [
    { mois: "Jan", demandes: 12, validees: 10 },
    { mois: "Fév", demandes: 19, validees: 15 },
    { mois: "Mar", demandes: 15, validees: 12 },
    { mois: "Avr", demandes: 22, validees: 18 },
    { mois: "Mai", demandes: 30, validees: 25 },
    { mois: "Juin", demandes: 45, validees: 40 },
  ];

  const dataStatuts = [
    {
      statut: "Validés",
      nombre: 40,
      couleur: "#10b981",
    },
    {
      statut: "En attente",
      nombre: 15,
      couleur: "#f59e0b",
    },
    {
      statut: "Refusés",
      nombre: 5,
      couleur: "#f43f5e",
    },
  ];

  /* ============================================================
     CHARGEMENT DU DASHBOARD
  ============================================================ */

  async function chargerDashboard() {
    setChargement(true);

    try {
      const [resEmp, resDep, resDem] = await Promise.all([
        api.get("/utilisateurs/"),
        api.get("/departements/"),
        api.get("/demandes-conges/"),
      ]);

      const listEmp = resEmp.data.results ?? resEmp.data ?? [];
      const listDep = resDep.data.results ?? resDep.data ?? [];
      const listDem = resDem.data.results ?? resDem.data ?? [];

      const enAttente = listDem.filter(
        (d) => d.statut === "EN_ATTENTE"
      );

      setKpis({
        totalEmployes: listEmp.length,
        demandesEnAttente: enAttente.length,
        totalDepartements: listDep.length,
        tauxAbsence: "3.2%",
      });

      setDemandes(enAttente.slice(0, 5));
    } catch (err) {
      console.error("Erreur chargement dashboard :", err);
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
    try {
      await api.patch(`/demandes-conges/${id}/`, { statut });

      chargerDashboard();
    } catch (err) {
      console.error("Erreur traitement demande :", err);
      alert("Erreur lors de la mise à jour de la demande.");
    }
  }

  /* ============================================================
     AFFICHAGE
  ============================================================ */

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ======================================================
            EN-TÊTE
        ====================================================== */}

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#3c0038]">
            Tableau de bord Admin
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Vue d'ensemble de l'organisation et validation des congés
          </p>
        </div>

        {/* ======================================================
            CHARGEMENT
        ====================================================== */}

        {chargement ? (
          <div className="py-12 text-center font-medium text-neutral-400">
            Chargement des indicateurs...
          </div>
        ) : (
          <div className="space-y-6">

            {/* ==================================================
                CARTES KPI
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {/* KPI 1 */}
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Effectif Total
                </span>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-[#3c0038]">
                    {kpis.totalEmployes}
                  </span>

                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    +4.5%
                  </span>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Demandes en attente
                </span>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-[#E91E8C]">
                    {kpis.demandesEnAttente}
                  </span>

                  <span className="rounded-md bg-pink-50 px-2 py-0.5 text-xs font-semibold text-[#E91E8C]">
                    Action requise
                  </span>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Départements
                </span>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-[#3c0038]">
                    {kpis.totalDepartements}
                  </span>

                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                    Actifs
                  </span>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Taux d'absence
                </span>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-[#3c0038]">
                    {kpis.tauxAbsence}
                  </span>

                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    Normal
                  </span>
                </div>
              </div>

            </div>

            {/* ==================================================
                GRAPHIQUES
            ================================================== */}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* ==================================================
                  GRAPHIQUE 1 : ÉVOLUTION DES DEMANDES
              ================================================== */}

              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm lg:col-span-2">

                <div className="mb-6">
                  <h2 className="text-base font-bold text-[#3c0038]">
                    Évolution des demandes de congés
                  </h2>

                  <p className="text-xs text-slate-500">
                    Comparaison du volume total et des demandes validées
                  </p>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dataEvolution}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <defs>

                        <linearGradient
                          id="colorDemandes"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#93003f"
                            stopOpacity={0.3}
                          />

                          <stop
                            offset="95%"
                            stopColor="#93003f"
                            stopOpacity={0}
                          />
                        </linearGradient>

                        <linearGradient
                          id="colorValidees"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#0097ff"
                            stopOpacity={0.3}
                          />

                          <stop
                            offset="95%"
                            stopColor="#0097ff"
                            stopOpacity={0}
                          />
                        </linearGradient>

                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />

                      <XAxis
                        dataKey="mois"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow:
                            "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="demandes"
                        stroke="#93003f"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorDemandes)"
                        name="Total Demandes"
                      />

                      <Area
                        type="monotone"
                        dataKey="validees"
                        stroke="#0097ff"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorValidees)"
                        name="Validées"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ==================================================
                  GRAPHIQUE 2 : RÉPARTITION DES STATUTS
              ================================================== */}

              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">

                <div className="mb-6">
                  <h2 className="text-base font-bold text-[#3c0038]">
                    Répartition des statuts
                  </h2>

                  <p className="text-xs text-slate-500">
                    Répartition globale des demandes
                  </p>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dataStatuts}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />

                      <XAxis
                        dataKey="statut"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                        }}
                      />

                      <Bar
                        dataKey="nombre"
                        radius={[8, 8, 0, 0]}
                      >
                        {dataStatuts.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.couleur}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* ==================================================
                TABLEAU DES DEMANDES À VALIDER
            ================================================== */}

            <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">

              <h2 className="mb-4 text-lg font-bold text-[#3c0038]">
                Dernières demandes à valider
              </h2>

              {demandes.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">
                  Aucune demande en attente pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">

                    <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-500">
                      <tr>
                        <th className="p-3">
                          Employé
                        </th>

                        <th className="p-3">
                          Type
                        </th>

                        <th className="p-3">
                          Période
                        </th>

                        <th className="p-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">

                      {demandes.map((d) => (
                        <tr
                          key={d.id}
                          className="hover:bg-neutral-50/50"
                        >

                          <td className="p-3 font-semibold text-neutral-900">
                            {d.employe_nom ||
                              d.employe?.first_name ||
                              "Employé"}
                          </td>

                          <td className="p-3 text-neutral-600">
                            {d.type_conge || "Congé Payé"}
                          </td>

                          <td className="p-3 text-xs text-neutral-500">
                            {d.date_debut} au {d.date_fin}
                          </td>

                          <td className="space-x-2 p-3 text-right">

                            <button
                              onClick={() =>
                                traiterDemande(
                                  d.id,
                                  "ACCORDE"
                                )
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              Valider
                            </button>

                            <button
                              onClick={() =>
                                traiterDemande(
                                  d.id,
                                  "REFUSE"
                                )
                              }
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                            >
                              Refuser
                            </button>

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
    </MainLayout>
  );
}

