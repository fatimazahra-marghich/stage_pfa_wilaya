import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function TeamCalendar() {
  const [demandes, setDemandes] = useState([]);
  const [curseur, setCurseur] = useState(new Date());

  useEffect(() => {
    // ✅ Corrected endpoint without /conges/
    api.get("/demandes/").then(({ data }) => setDemandes(data.results ?? data));
  }, []);

  const annee = curseur.getFullYear();
  const mois = curseur.getMonth();
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const jours = Array.from({ length: nbJours }, (_, i) => i + 1);

  const agents = useMemo(() => {
    const parAgent = {};
    demandes
      .filter((d) => d.statut === "VALIDEE" || d.statut === "VALIDE")
      .forEach((d) => {
        const key = d.utilisateur;
        if (!parAgent[key]) {
          parAgent[key] = {
            nom: d.utilisateur_nom || `Agent #${d.utilisateur}`,
            periodes: [],
          };
        }
        parAgent[key].periodes.push({
          debut: new Date(d.date_debut),
          fin: new Date(d.date_fin),
        });
      });
    return Object.values(parAgent);
  }, [demandes]);

  function estAbsent(agent, jour) {
    const date = new Date(annee, mois, jour);
    return agent.periodes.some((p) => date >= p.debut && date <= p.fin);
  }

  function changerMois(delta) {
    setCurseur(new Date(annee, mois + delta, 1));
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black">{MOIS_FR[mois]}</h1>
          <p className="text-2xl font-bold text-[#E91E8C]">{annee}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => changerMois(-1)}
            className="w-10 h-10 rounded-xl border border-black flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => changerMois(1)}
            className="w-10 h-10 rounded-xl border border-black flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-x-auto">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-neutral-50 text-left px-4 py-3 font-semibold border-b border-black/10 min-w-[160px]">
                Agent
              </th>
              {jours.map((j) => (
                <th
                  key={j}
                  className="px-2 py-3 text-center font-normal text-neutral-400 border-b border-black/10 min-w-[32px]"
                >
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, idx) => (
              <tr key={idx} className="border-b border-black/5">
                <td className="sticky left-0 bg-white px-4 py-3 font-medium">{agent.nom}</td>
                {jours.map((j) => (
                  <td key={j} className="p-1 text-center">
                    {estAbsent(agent, j) && (
                      <div className="h-6 rounded bg-[#E91E8C]" title="Absent" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={nbJours + 1} className="px-4 py-8 text-center text-neutral-400">
                  Aucune absence validée ce mois-ci.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Link
        to="/chef/corriger-solde"
        className="inline-block mt-6 text-sm text-neutral-500 hover:text-[#E91E8C] underline underline-offset-4"
      >
        Corriger le solde d'un agent
      </Link>
    </Layout>
  );
}