import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function NewRequest() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    type_conge: "",
    date_debut: "",
    date_fin: "",
    motif: "",
  });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/types-conge/").then(({ data }) => setTypes(data.results ?? data));
  }, []);

  function update(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setEnvoi(true);
    try {
      await api.post("/demandes/", form);
      navigate("/employe");
    } catch {
      setErreur("Impossible d'envoyer la demande. Vérifie les champs et réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold mb-1">Nouvelle demande</h1>
        <p className="text-neutral-500 mb-8">Ça prend 30 secondes.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">1. Type de congé</label>
            <select
              value={form.type_conge}
              onChange={(e) => update("type_conge", e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            >
              <option value="">Sélectionnez un type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">2. Date de début</label>
              <input
                type="date"
                value={form.date_debut}
                onChange={(e) => update("date_debut", e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Date de fin</label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => update("date_fin", e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">3. Motif</label>
            <textarea
              value={form.motif}
              onChange={(e) => update("motif", e.target.value)}
              rows={3}
              placeholder="Description brève de la demande..."
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-xl bg-[#E91E8C] text-white font-semibold py-3 hover:bg-[#c81879] transition-colors disabled:opacity-50"
          >
            {envoi ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
