import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function StructureAdminPage() {
  const [departements, setDepartements] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Modales
  const [formOuvert, setFormOuvert] = useState(false);
  const [elementEnEdition, setElementEnEdition] = useState(null);

  // Formulaire local
  const [form, setForm] = useState({
    nom: "",
    code: "",
    responsable_id: "",
    parent_id: "",
    description: "",
  });

  // Charger les structures et utilisateurs
  async function chargerDonnees() {
    setChargement(true);
    try {
      const [resDep, resUser] = await Promise.all([
        api.get("/departements/"),
        api.get("/utilisateurs/"), // ou /employes/
      ]);

      setDepartements(resDep.data.results ?? resDep.data);
      setUtilisateurs(resUser.data.results ?? resUser.data);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Ouvrir modal (Création ou Édition)
  const ouvrirFormulaire = (dep = null) => {
    if (dep) {
      setElementEnEdition(dep);
      setForm({
        nom: dep.nom || dep.libelle || "",
        code: dep.code || "",
        responsable_id: dep.responsable?.id || dep.responsable || "",
        parent_id: dep.parent?.id || dep.parent || "",
        description: dep.description || "",
      });
    } else {
      setElementEnEdition(null);
      setForm({
        nom: "",
        code: "",
        responsable_id: "",
        parent_id: "",
        description: "",
      });
    }
    setFormOuvert(true);
  };

  // Soumission (Soumettre POST / PATCH nettoyé)
  async function handleSubmit(e) {
    e.preventDefault();

    // NETTOYAGE DU PAYLOAD (Transformation des chaînes vides en NULL)
    const payload = {
      nom: form.nom,
      code: form.code ? form.code.trim() : null,
      responsable: form.responsable_id ? parseInt(form.responsable_id, 10) : null,
      parent: form.parent_id ? parseInt(form.parent_id, 10) : null,
      description: form.description || "",
    };

    try {
      if (elementEnEdition) {
        await api.patch(`/departements/${elementEnEdition.id}/`, payload);
      } else {
        await api.post("/departements/", payload);
      }
      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error("Détails erreur API :", err.response?.data);

      // Récupération précise de la raison du rejet Django
      if (err.response?.data) {
        const detErreur = typeof err.response.data === "object"
          ? JSON.stringify(err.response.data, null, 2)
          : err.response.data;
        alert(`Erreur Backend (Django):\n${detErreur}`);
      } else {
        alert("Impossible de contacter le serveur backend.");
      }
    }
  }

  // Supprimer une structure
  async function handleSupprimer(id, nom) {
    if (!window.confirm(`Voulez-vous supprimer le département "${nom}" ?`)) return;

    try {
      await api.delete(`/departements/${id}/`);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      alert("Impossible de supprimer cet élément.");
    }
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">
            Structure Administrative
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gestion des départements, services et hiérarchie interne
          </p>
        </div>

        <button
          onClick={() => ouvrirFormulaire()}
          className="rounded-xl bg-[#E91E8C] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#c81879] transition-all shadow-md active:scale-95"
        >
          + Ajouter une entité
        </button>
      </div>

      {chargement ? (
        <div className="py-12 text-center text-neutral-400 font-medium">
          Chargement de l'organisation...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
              <tr>
                <th className="p-4">Département / Service</th>
                <th className="p-4">Code</th>
                <th className="p-4">Rattaché à (Parent)</th>
                <th className="p-4">Responsable (Manager)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {departements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-neutral-400">
                    Aucun département trouvé.
                  </td>
                </tr>
              ) : (
                departements.map((dep) => {
                  const parentDep = departements.find((d) => d.id === (dep.parent?.id || dep.parent));
                  const respUser = utilisateurs.find((u) => u.id === (dep.responsable?.id || dep.responsable));

                  return (
                    <tr key={dep.id} className="hover:bg-neutral-50/50">
                      <td className="p-4 font-bold text-neutral-900">
                        {dep.nom || dep.libelle}
                      </td>
                      <td className="p-4 font-mono text-xs text-neutral-600">
                        {dep.code || "-"}
                      </td>
                      <td className="p-4 text-neutral-600">
                        {parentDep ? parentDep.nom || parentDep.libelle : <span className="text-neutral-400 font-normal">-- Indépendant --</span>}
                      </td>
                      <td className="p-4 text-neutral-800">
                        {respUser ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            👤 {respUser.first_name || respUser.prenom} {respUser.last_name || respUser.nom}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">Non assigné</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-3 text-xs font-semibold">
                        <button
                          onClick={() => ouvrirFormulaire(dep)}
                          className="text-neutral-600 hover:text-black"
                        >
                          ✏️ Éditer
                        </button>
                        <button
                          onClick={() => handleSupprimer(dep.id, dep.nom || dep.libelle)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })
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
            className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-neutral-900">
              {elementEnEdition ? "Modifier le département" : "Ajouter une entité"}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Nom du département / service *
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ex: DT, RH..."
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Rattaché à
                </label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C] bg-white text-sm"
                >
                  <option value="">-- Indépendant --</option>
                  {departements
                    .filter((d) => d.id !== elementEnEdition?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom || d.libelle}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Responsable (Manager)
              </label>
              <select
                value={form.responsable_id}
                onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#E91E8C] bg-white text-sm"
              >
                <option value="">-- Aucun responsable --</option>
                {utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name || u.prenom} {u.last_name || u.nom} ({u.role || "EMPLOYE"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="2"
                placeholder="Rôle de ce département..."
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

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