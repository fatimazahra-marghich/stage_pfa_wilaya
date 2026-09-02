import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function CorrectSolde() {
  const [soldes, setSoldes] = useState([]);
  const [soldeId, setSoldeId] = useState("");
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/conges/soldes/").then(({ data }) => setSoldes(data.results ?? data));
  }, []);

  const soldeSelectionne = soldes.find((s) => String(s.id) === String(soldeId));

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    if (!soldeId || nouveauSolde === "" || !motif.trim()) {
      setErreur("Tous les champs sont obligatoires.");
      return;
    }
    setEnvoi(true);
    try {
      await api.post("/conges/corrections-solde/", {
        solde_conge: soldeId,
        nouveau_solde: parseFloat(nouveauSolde),
        motif,
      });
      navigate(-1);
    } catch (err) {
      console.error(err);
      setErreur("La correction a échoué. Vérifiez les informations.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold mb-1">Corriger le solde d'un agent</h1>
        <p className="text-neutral-500 mb-8">
          Régularisation administrative spéciale — cette action est journalisée.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Agent</label>
            <select
              value={soldeId}
              onChange={(e) => setSoldeId(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            >
              <option value="">Sélectionnez un agent</option>
              {soldes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.utilisateur_nom ?? `Agent #${s.utilisateur}`} — {s.annee}
                </option>
              ))}
            </select>
          </div>

          {soldeSelectionne && (
            <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
              <span className="text-neutral-400">Solde actuel : </span>
              <span className="font-semibold line-through decoration-neutral-400">
                {soldeSelectionne.solde_actuel} jours
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Nouveau solde (jours)</label>
            <input
              type="number"
              step="0.5"
              value={nouveauSolde}
              onChange={(e) => setNouveauSolde(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Motif de la régularisation</label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-xl bg-[#E91E8C] text-white font-semibold py-3 hover:bg-[#c81879] disabled:opacity-50 transition-colors"
          >
            {envoi ? "Enregistrement..." : "Enregistrer la correction"}
          </button>
        </form>
      </div>
    </Layout>
  );
}