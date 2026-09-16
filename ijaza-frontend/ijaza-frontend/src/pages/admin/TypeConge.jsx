import { useEffect, useState } from "react";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function TypeCongePage() {
  const [types, setTypes] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Modals
  const [formOuvert, setFormOuvert] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState(null);
  const [typeSelectionne, setTypeSelectionne] = useState(null);

  // Formulaire local
  const [form, setForm] = useState({
    libelle: "",
    duree_max: "",
    description: "",
    justificatif_requis: false,
  });

  // Charger la liste des types depuis Django REST
  async function charger() {
    setChargement(true);
    try {
      const { data } = await api.get("/types-conge/");
      const liste = data.results ?? data;
      setTypes(liste);
      return liste;
    } catch (err) {
      console.error("Erreur de chargement des types :", err);
      return [];
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  // Ouvrir le formulaire en mode Création ou Édition
  const ouvrirFormulaire = (type = null) => {
    if (type) {
      setTypeEnEdition(type);
      setForm({
        libelle: type.libelle || type.nom || "",
        duree_max: type.duree_max ?? type.nb_jours_max ?? type.solde_par_defaut ?? "",
        description: type.description || "",
        justificatif_requis: Boolean(type.justificatif_requis),
      });
    } else {
      setTypeEnEdition(null);
      setForm({
        libelle: "",
        duree_max: "",
        description: "",
        justificatif_requis: false,
      });
    }
    setFormOuvert(true);
  };

  // Soumission (POST pour créer, PATCH/PUT pour modifier)
  async function handleSubmit(e) {
    e.preventDefault();

    const dureeNum = form.duree_max ? parseInt(form.duree_max, 10) : null;

    // Envoi exhaustif pour s'adapter à toutes les déclinaisons possibles des Serializers Django
    const payload = {
      libelle: form.libelle,
      nom: form.libelle,
      description: form.description,
      duree_max: dureeNum,
      nb_jours_max: dureeNum,
      solde_par_defaut: dureeNum,
      justificatif_requis: form.justificatif_requis,
      attestation_obligatoire: form.justificatif_requis,
    };

    try {
      if (typeEnEdition) {
        // Mise à jour sur le serveur Django
        await api.patch(`/types-conge/${typeEnEdition.id}/`, payload);
      } else {
        // Création
        await api.post("/types-conge/", payload);
      }

      // Rechargement immédiat depuis la BDD pour synchroniser l'affichage
      const listeAjour = await charger();

      // Si le détail est ouvert, le mettre à jour avec les données du serveur
      if (typeEnEdition) {
        const itemAJour = listeAjour.find((item) => item.id === typeEnEdition.id);
        if (itemAJour) {
          setTypeSelectionne(itemAJour);
        }
      }

      setFormOuvert(false);
    } catch (err) {
      console.error("Erreur serveur :", err.response?.data || err);
      const msg = err.response?.data
        ? JSON.stringify(err.response.data)
        : "Erreur lors de la sauvegarde.";
      alert(`Erreur : ${msg}`);
    }
  }

  // Suppression
  async function handleSupprimer(id, libelle) {
    if (!window.confirm(`Supprimer le type "${libelle}" ?`)) return;

    try {
      await api.delete(`/types-conge/${id}/`);
      if (typeSelectionne?.id === id) setTypeSelectionne(null);
      charger();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      alert("Impossible de supprimer ce type de congé.");
    }
  }

  return (
    <Layout>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900">Types de Congés</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gestion du référentiel des régimes de congé.
          </p>
        </div>
        <button
          onClick={() => ouvrirFormulaire()}
          className="rounded-xl bg-[#E91E8C] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#c81879] transition-all shadow-md active:scale-95"
        >
          + Ajouter un type
        </button>
      </div>

      {/* Grille des cartes */}
      {chargement ? (
        <div className="py-12 text-center text-neutral-400 font-medium">
          Chargement des données...
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
          <p className="text-neutral-500 font-medium">Aucun type de congé enregistré.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {types.map((t) => {
            const aJustificatif = Boolean(
              t.justificatif_requis ?? t.attestation_obligatoire
            );
            const plafond = t.duree_max ?? t.nb_jours_max ?? t.solde_par_defaut;
            const nomAffichage = t.libelle || t.nom || "Sans nom";

            return (
              <div
                key={t.id}
                className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-bold text-neutral-900">{nomAffichage}</h3>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                        aJustificatif
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {aJustificatif ? "Justificatif requis" : "Sans justificatif"}
                    </span>
                  </div>

                  <p className="text-neutral-500 text-xs mb-4 min-h-[32px] line-clamp-2">
                    {t.description || "Aucune règle spécifique enregistrée."}
                  </p>

                  <div className="bg-neutral-50 rounded-xl p-3 flex items-center justify-between text-xs font-semibold border border-neutral-100">
                    <span className="text-neutral-400">Plafond annuel</span>
                    <span className="text-neutral-900 font-bold">
                      {plafond ? `${plafond} jours` : "Selon réglementation"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 text-xs font-semibold">
                  <button
                    onClick={() => setTypeSelectionne(t)}
                    className="text-neutral-600 hover:text-black"
                  >
                    👁️ Détails
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => ouvrirFormulaire(t)}
                      className="text-neutral-700 hover:text-black"
                    >
                      ✏️ Éditer
                    </button>
                    <button
                      onClick={() => handleSupprimer(t.id, nomAffichage)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
              {typeEnEdition ? "Modifier le type de congé" : "Nouveau type de congé"}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Libellé
              </label>
              <input
                type="text"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Plafond (jours)
              </label>
              <input
                type="number"
                value={form.duree_max}
                onChange={(e) => setForm({ ...form, duree_max: e.target.value })}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Description / Règles
              </label>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[#E91E8C]"
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.justificatif_requis}
                onChange={(e) => setForm({ ...form, justificatif_requis: e.target.checked })}
                className="accent-[#E91E8C] h-4 w-4 rounded"
              />
              <span className="text-xs font-bold text-neutral-800">
                Justificatif médical / administratif obligatoire
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

      {/* Modal Consultation des Détails */}
      {typeSelectionne && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-xl font-bold border-b pb-3 text-neutral-900">
              {typeSelectionne.libelle || typeSelectionne.nom}
            </h2>
            <div className="text-sm space-y-3">
              <div>
                <p className="text-xs font-semibold text-neutral-400">Description</p>
                <p className="text-neutral-800 mt-1">
                  {typeSelectionne.description || "Aucune règle précisée."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-neutral-50 p-3 rounded-xl border">
                  <p className="text-xs text-neutral-400">Plafond</p>
                  <p className="font-bold text-neutral-900 mt-0.5">
                    {typeSelectionne.duree_max ?? typeSelectionne.nb_jours_max ?? typeSelectionne.solde_par_defaut
                      ? `${typeSelectionne.duree_max ?? typeSelectionne.nb_jours_max ?? typeSelectionne.solde_par_defaut} jours`
                      : "Non fixe"}
                  </p>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border">
                  <p className="text-xs text-neutral-400">Justificatif</p>
                  <p className="font-bold text-neutral-900 mt-0.5">
                    {typeSelectionne.justificatif_requis ?? typeSelectionne.attestation_obligatoire
                      ? "Obligatoire"
                      : "Optionnel"}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setTypeSelectionne(null)}
              className="w-full rounded-xl bg-neutral-900 text-white py-2.5 text-sm font-semibold hover:bg-neutral-800 mt-2"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}