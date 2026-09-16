import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function Reports() {
  const [demandes, setDemandes] = useState([]);

  useEffect(() => {
    api.get("/demandes/").then(({ data }) => setDemandes(data.results ?? data));
  }, []);

  const parType = useMemo(() => {
    const compte = {};
    demandes.forEach((d) => {
      compte[d.type_conge_libelle] = (compte[d.type_conge_libelle] ?? 0) + 1;
    });
    return Object.entries(compte).map(([nom, total]) => ({ nom, total }));
  }, [demandes]);

  const parMois = useMemo(() => {
    const compte = Array(12).fill(0);
    demandes.forEach((d) => {
      const mois = new Date(d.date_creation).getMonth();
      compte[mois] += 1;
    });
    return MOIS_COURTS.map((nom, i) => ({ nom, total: compte[i] }));
  }, [demandes]);

  const tauxApprobation = useMemo(() => {
    const traitees = demandes.filter((d) => ["VALIDEE", "REFUSEE"].includes(d.statut));
    if (traitees.length === 0) return 0;
    const validees = traitees.filter((d) => d.statut === "VALIDEE").length;
    return Math.round((validees / traitees.length) * 100);
  }, [demandes]);

  return (
    <Layout>
      <h1 className="text-4xl font-black mb-1">Rapports & statistiques</h1>
      <p className="text-neutral-500 mb-8">Vue analytique des congés et absences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 rounded-2xl border border-black/10 bg-white shadow-sm p-6">
          <h2 className="font-bold mb-4">Congés par type</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={parType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#111111" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
            <p className="text-xs text-neutral-400 uppercase mb-2">Total demandes</p>
            <p className="text-4xl font-black">{demandes.length}</p>
          </div>
          <div className="rounded-2xl bg-[#E91E8C] text-white shadow-sm p-6">
            <p className="text-xs text-white/70 uppercase mb-2">Taux d'approbation</p>
            <p className="text-4xl font-black">{tauxApprobation}%</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Évolution des demandes</h2>
          <button className="rounded-xl bg-[#E91E8C] text-white text-sm font-semibold px-4 py-2 hover:bg-[#c81879]">
            Exporter en PDF
          </button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={parMois}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#E91E8C" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  );
}
