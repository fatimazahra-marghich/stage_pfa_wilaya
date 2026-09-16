import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import StatutBadge from "../../components/StatutBadge";
import { useAuth } from "../../context/AuthContext";

export default function DashboardEmploye() {
  const { user } = useAuth();
  const [solde, setSolde] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      try {
        const [{ data: soldes }, { data: demandesData }] = await Promise.all([
          api.get("/soldes/"),
          api.get("/demandes/"),
        ]);
        setSolde(soldes.results?.[0] ?? soldes[0] ?? null);
        const liste = demandesData.results ?? demandesData;
        setDemandes(liste.slice(0, 5));
      } catch (error) {
        console.error("Erreur de chargement du tableau de bord :", error);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  const restant = solde ? solde.solde_actuel : 0;
  const acquisTotal = solde ? (solde.droits_acquis + solde.jours_reportes) : 0;
  const pourcentage = acquisTotal > 0 ? Math.max(0, Math.min(100, (restant / acquisTotal) * 100)) : 0;

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-1">
        Bonjour, {user?.nomComplet ? user.nomComplet.split(" ")[0] : "Employé"}
      </h1>
      <p className="text-neutral-500 mb-8">Voici le résumé de vos congés et demandes récentes.</p>

      {chargement ? (
        <p className="text-neutral-400">Chargement de votre espace...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {/* Carte Jours Restants */}
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm flex flex-col items-center justify-center">
              <div
                className="relative w-36 h-36 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#E91E8C ${pourcentage * 3.6}deg, #EFEFEF 0deg)`,
                }}
              >
                <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-4xl font-black">{restant}</span>
                  <span className="text-[10px] text-neutral-500 tracking-wide">
                    JOURS RESTANTS
                  </span>
                </div>
              </div>
            </div>

            {/* Carte Droits Acquis */}
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <p className="text-sm text-neutral-500 mb-6">Droits Acquis</p>
              <p className="text-4xl font-black">
                {solde?.droits_acquis ?? 0}
                <span className="text-base font-normal text-neutral-400 ml-1">jours</span>
              </p>
            </div>

            {/* Carte Jours Consommés */}
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <p className="text-sm text-neutral-500 mb-6">Consommés</p>
              <p className="text-4xl font-black">
                {solde?.jours_consommes ?? 0}
                <span className="text-base font-normal text-neutral-400 ml-1">jours</span>
              </p>
            </div>
          </div>

          {/* Liste des Demandes */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Demandes récentes</h2>
            <Link to="/employe/historique" className="text-sm text-[#E91E8C] font-medium">
              Voir tout
            </Link>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white shadow-sm divide-y divide-black/5">
            {demandes.length === 0 && (
              <p className="p-6 text-neutral-400 text-sm">Aucune demande pour le moment.</p>
            )}
            {demandes.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold">{d.type_conge_libelle}</p>
                  <p className="text-sm text-neutral-500">
                    {d.date_debut} — {d.date_fin} ({d.nombre_jours} jours)
                  </p>
                </div>
                <StatutBadge statut={d.statut} />
              </div>
            ))}
          </div>

          {/* Bouton création */}
          <Link
            to="/employe/nouvelle-demande"
            className="fixed bottom-10 right-10 w-14 h-14 rounded-full bg-[#E91E8C] text-white text-2xl flex items-center justify-center shadow-lg hover:bg-[#c81879] transition-colors"
          >
            +
          </Link>
        </>
      )}
    </Layout>
  );
}