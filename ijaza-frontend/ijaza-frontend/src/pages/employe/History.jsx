import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import StatutBadge from "../../components/StatutBadge";

export default function History() {
  const [demandes, setDemandes] = useState([]);

  useEffect(() => {
    api.get("/conges/demandes/").then(({ data }) => setDemandes(data.results ?? data));
  }, []);

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-1">Historique des demandes</h1>
      <p className="text-neutral-500 mb-8">Relevé détaillé de vos congés et absences.</p>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th className="px-6 py-4">Type de demande</th>
              <th className="px-6 py-4">Période</th>
              <th className="px-6 py-4">Jours décomptés</th>
              <th className="px-6 py-4">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {demandes.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-4">
                  <p className="font-semibold">{d.type_conge_libelle}</p>
                  <p className="text-xs text-neutral-400">REF: #{d.id}</p>
                </td>
                <td className="px-6 py-4 text-neutral-600">
                  {d.date_debut} — {d.date_fin}
                </td>
                {/* Champ backend : nombre_jours */}
                <td className="px-6 py-4 text-neutral-600">{d.nombre_jours} jours</td>
                <td className="px-6 py-4">
                  <StatutBadge statut={d.statut} />
                </td>
              </tr>
            ))}
            {demandes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-400">
                  Aucune demande enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}