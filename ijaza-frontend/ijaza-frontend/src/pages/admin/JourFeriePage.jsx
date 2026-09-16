import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function JourFeriePage() {
  const [tousLesJoursFeries, setTousLesJoursFeries] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formOuvert, setFormOuvert] = useState(false);
  const [elementEnEdition, setElementEnEdition] = useState(null);

  // Année sélectionnée dans le filtre
  const [anneeFiltre, setAnneeFiltre] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    nom: "",
    date_debut: "",
    date_fin: "",
    est_recurrent: false,
  });

  async function chargerJoursFeries() {
    setChargement(true);
    try {
      // Récupération de tous les jours fériés
      const { data } = await api.get("/jours-feries/");
      setTousLesJoursFeries(data.results ?? data);
    } catch (err) {
      console.error("Erreur lors du chargement des jours fériés:", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerJoursFeries();
  }, []);

  // FILTRAGE STRICT CÔTÉ CLIENT
  const joursFeriesAffiches = tousLesJoursFeries
    .filter((item) => {
      // 1. Si récurrent (Coché "Chaque année") : Toujours afficher
      if (item.est_recurrent) return true;

      // 2. Si NON récurrent : Vérifier que l'année du jour férié est EXACTEMENT égale à l'année du filtre
      const d = item.date_debut || item.date;
      if (!d) return false;

      // Extrait l'année depuis la chaîne YYYY-MM-DD
      const anneeElement = Number(d.split("-")[0]);

      return anneeElement === Number(anneeFiltre);
    })
    .map((item) => {
      // Pour les éléments récurrents, adapte l'année affichée à l'année consultée
      if (item.est_recurrent) {
        const dDebut = item.date_debut || item.date;
        const dFin = item.date_fin || dDebut;
        return {
          ...item,
          date_debut_affiche: dDebut ? `${anneeFiltre}-${dDebut.slice(5)}` : "",
          date_fin_affiche: dFin ? `${anneeFiltre}-${dFin.slice(5)}` : "",
        };
      }
      return {
        ...item,
        date_debut_affiche: item.date_debut || item.date,
        date_fin_affiche: item.date_fin || item.date_debut || item.date,
      };
    });

  const ouvrirFormulaire = (item = null) => {
    if (item) {
      setElementEnEdition(item);
      setForm({
        nom: item.nom || item.libelle || "",
        date_debut: item.date_debut || item.date || "",
        date_fin: item.date_fin || item.date_debut || item.date || "",
        est_recurrent: Boolean(item.est_recurrent),
      });
    } else {
      setElementEnEdition(null);
      const dateDefaut = `${anneeFiltre}-01-01`;
      setForm({
        nom: "",
        date_debut: dateDefaut,
        date_fin: dateDefaut,
        est_recurrent: false,
      });
    }
    setFormOuvert(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const anneeCalculee = form.date_debut
      ? Number(form.date_debut.split("-")[0])
      : Number(anneeFiltre);

    const payload = {
      nom: form.nom,
      libelle: form.nom,
      date_debut: form.date_debut,
      date_fin: form.date_fin || form.date_debut,
      date: form.date_debut,
      annee: anneeCalculee,
      est_recurrent: form.est_recurrent,
    };

    try {
      if (elementEnEdition) {
        await api.patch(`/jours-feries/${elementEnEdition.id}/`, payload);
      } else {
        await api.post("/jours-feries/", payload);
      }
      setFormOuvert(false);
      chargerJoursFeries();
    } catch (err) {
      console.error("Détails erreur:", err.response?.data || err);
      const errData = err.response?.data;
      const messageDetail = errData
        ? typeof errData === "object"
          ? JSON.stringify(errData)
          : errData
        : "Erreur serveur";

      alert(`Erreur lors de la sauvegarde : ${messageDetail}`);
    }
  }

  async function handleSupprimer(id) {
    if (!window.confirm("Supprimer ce jour férié ?")) return;
    try {
      await api.delete(`/jours-feries/${id}/`);
      chargerJoursFeries();
    } catch (err) {
      console.error("Erreur de suppression:", err);
    }
  }

  const anneeActuelle = new Date().getFullYear();
  const listeAnnees = Array.from({ length: 11 }, (_, i) => anneeActuelle - 5 + i);

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">Jours Fériés & Fêtes</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gestion du calendrier officiel (déduits automatiquement des congés)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-200 shadow-sm">
            <span className="text-xs font-bold text-neutral-500">Année :</span>
            <select
              value={anneeFiltre}
              onChange={(e) => setAnneeFiltre(Number(e.target.value))}
              className="bg-transparent font-extrabold text-sm text-neutral-900 outline-none cursor-pointer"
            >
              {listeAnnees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => ouvrirFormulaire()}
            className="flex items-center gap-2 rounded-xl bg-[#E91E8C] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#c81879] transition-all shadow-md active:scale-95"
          >
            + Ajouter un jour férié
          </button>
        </div>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-neutral-400 font-medium">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
              <tr>
                <th className="p-4">Événement / Fête</th>
                <th className="p-4">Date Début</th>
                <th className="p-4">Date Fin</th>
                <th className="p-4 text-center">Récurrent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {joursFeriesAffiches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-neutral-400 font-medium">
                    Aucun jour férié enregistré pour l'année {anneeFiltre}.
                  </td>
                </tr>
              ) : (
                joursFeriesAffiches.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50">
                    <td className="p-4 font-bold text-neutral-900">{item.nom || item.libelle}</td>
                    <td className="p-4 text-neutral-600">{item.date_debut_affiche}</td>
                    <td className="p-4 text-neutral-600">{item.date_fin_affiche}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          item.est_recurrent
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {item.est_recurrent ? "Oui" : "Non"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => ouvrirFormulaire(item)}
                        className="text-neutral-600 hover:text-black font-semibold"
                      >
                        ✏️ Éditer
                      </button>
                      <button
                        onClick={() => handleSupprimer(item.id)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Formulaire */}
      {formOuvert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-neutral-900">
              {elementEnEdition ? "Modifier le jour férié" : "Nouveau jour férié"}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nom / Intitulé
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
                placeholder="Ex: Fête du Trône, Aïd Al Fitr..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Date début
                </label>
                <input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Date fin
                </label>
                <input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C]"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.est_recurrent}
                onChange={(e) => setForm({ ...form, est_recurrent: e.target.checked })}
                className="accent-[#E91E8C] h-4 w-4"
              />
              <span className="text-xs font-bold text-neutral-800">
                Chaque année à la même date
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#E91E8C] text-white py-2.5 text-sm font-semibold hover:bg-[#c81879]"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}