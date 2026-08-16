import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function GlobalBalances() {
  const [divisions, setDivisions] = useState([]);
  const [filtreDivision, setFiltreDivision] = useState(null);
  const [fonctionnaires, setFonctionnaires] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api.get("/divisions/").then(({ data }) => setDivisions(data.results ?? data));
  }, []);

  useEffect(() => {
    setChargement(true);
    const params = filtreDivision ? { division: filtreDivision } : {};
    api.get("/fonctionnaires/", { params }).then(({ data }) => {
      setFonctionnaires(data.results ?? data);
      setChargement(false);
    });
  }, [filtreDivision]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Vue globale des soldes</h1>
          <p className="text-neutral-500">Filtrable par Division, Service ou Bureau.</p>
        </div>
        <button className="rounded-xl border border-black px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50">
          Exporter
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFiltreDivision(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium border ${
            filtreDivision === null
              ? "bg-[#E91E8C] text-white border-[#E91E8C]"
              : "border-black text-black hover:bg-neutral-50"
          }`}
        >
          Toutes Divisions
        </button>
        {divisions.map((d) => (
          <button
            key={d.id}
            onClick={() => setFiltreDivision(d.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${
              filtreDivision === d.id
                ? "bg-[#E91E8C] text-white border-[#E91E8C]"
                : "border-black text-black hover:bg-neutral-50"
            }`}
          >
            {d.nom}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 uppercase">
            <tr>
              <th className="px-6 py-4">Employé</th>
              <th className="px-6 py-4">Service / Division</th>
              <th className="px-6 py-4">Solde actuel (jours)</th>
              <th className="px-6 py-4">Bureau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {chargement ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-400">
                  Chargement...
                </td>
              </tr>
            ) : (
              fonctionnaires.map((f) => (
                <tr key={f.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold">
                      {f.first_name} {f.last_name}
                    </p>
                    <p className="text-xs text-neutral-400">Matricule: {f.matricule}</p>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {f.service_nom} — {f.division_nom}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-lg px-3 py-1 font-semibold ${
                        f.solde_actuel < 5
                          ? "bg-red-50 text-red-600"
                          : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {f.solde_actuel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{f.bureau_nom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
