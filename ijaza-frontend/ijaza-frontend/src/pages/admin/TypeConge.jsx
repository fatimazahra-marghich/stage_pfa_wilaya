import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function TypeCongePage() {
  const [types, setTypes] = useState([]);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState({ libelle: "", nb_jours_max: "", justificatif_requis: false });

  async function charger() {
    const { data } = await api.get("/types-conge/");
    setTypes(data.results ?? data);
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post("/types-conge/", {
      ...form,
      nb_jours_max: form.nb_jours_max ? parseInt(form.nb_jours_max, 10) : null,
    });
    setForm({ libelle: "", nb_jours_max: "", justificatif_requis: false });
    setFormOuvert(false);
    charger();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black">Types de congés</h1>
          <p className="text-neutral-500 mt-1">{types.length} types actifs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((t) => (
          <div key={t.id} className="rounded-2xl bg-black text-white p-6">
            <h3 className="text-2xl font-black mb-4 pb-3 border-b border-white/20">
              {t.libelle}
            </h3>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/60">Plafond annuel</span>
              <span className="font-bold">{t.nb_jours_max ? `${t.nb_jours_max} jours` : "Variable"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Justificatif requis</span>
              <span className={t.justificatif_requis ? "text-[#E91E8C]" : "text-white/40"}>
                {t.justificatif_requis ? "✓" : "✕"}
              </span>
            </div>
          </div>
        ))}

        <button
          onClick={() => setFormOuvert(true)}
          className="rounded-2xl border-2 border-dashed border-neutral-300 flex items-center justify-center min-h-[160px] text-neutral-400 hover:border-[#E91E8C] hover:text-[#E91E8C] transition-colors"
        >
          + Ajouter un type
        </button>
      </div>

      {formOuvert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <h2 className="text-xl font-bold">Nouveau type de congé</h2>
            <input
              type="text"
              placeholder="Libellé (ex: Congé Maternité)"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              required
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
            />
            <input
              type="number"
              placeholder="Plafond annuel (jours, vide = variable)"
              value={form.nb_jours_max}
              onChange={(e) => setForm({ ...form, nb_jours_max: e.target.value })}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.justificatif_requis}
                onChange={(e) => setForm({ ...form, justificatif_requis: e.target.checked })}
              />
              Justificatif requis
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="flex-1 rounded-xl border border-black py-2.5 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#E91E8C] text-white py-2.5 text-sm font-semibold"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
