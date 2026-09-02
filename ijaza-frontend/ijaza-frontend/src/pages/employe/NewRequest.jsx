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
  const [pieceJointe, setPieceJointe] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("conges/types-conge/")
      .then(({ data }) => setTypes(Array.isArray(data) ? data : (data.results || [])))
      .catch((err) => console.error("Erreur chargement types :", err));
  }, []);

  function update(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  const calculerNombreJours = () => {
    if (!form.date_debut || !form.date_fin) return 0;
    const d1 = new Date(form.date_debut);
    const d2 = new Date(form.date_fin);
    if (d2 < d1) return 0;
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const nbJours = calculerNombreJours();
  const selectedTypeObj = types.find((t) => t.id === parseInt(form.type_conge, 10));

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");

    if (!form.type_conge) {
      setErreur("Veuillez sélectionner un type de congé.");
      return;
    }

    if (nbJours <= 0) {
      setErreur("La date de fin doit être égale ou supérieure à la date de début.");
      return;
    }

    if (selectedTypeObj?.necessite_piece_jointe && !pieceJointe) {
      setErreur("Une pièce jointe (justificatif) est obligatoire pour ce type de congé.");
      return;
    }

    setEnvoi(true);

    try {
      const formData = new FormData();
      formData.append("type_conge", parseInt(form.type_conge, 10));
      formData.append("date_debut", form.date_debut);
      formData.append("date_fin", form.date_fin);
      formData.append("nombre_jours", nbJours);
      formData.append("motif", form.motif);
      
      if (pieceJointe instanceof File) {
        formData.append("piece_jointe", pieceJointe);
      }

      await api.post("conges/demandes/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/employe");
    } catch (err) {
      console.error("Détails de l'erreur 400 :", err.response?.data || err);
      
      const backendError = err.response?.data;
      if (typeof backendError === "object" && backendError !== null) {
        const messages = Object.entries(backendError)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(" ") : val}`)
          .join(" | ");
        setErreur(messages);
      } else {
        setErreur("Impossible d'envoyer la demande. Vérifie les champs et réessaie.");
      }
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
          {/* 1. Type de congé */}
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

          {/* 2. Dates */}
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

          {/* Affichage du nombre de jours */}
          {nbJours > 0 && (
            <p className="text-xs font-semibold text-[#E91E8C]">
              Durée estimée : {nbJours} jour{nbJours > 1 ? "s" : ""}
            </p>
          )}

          {/* 3. Motif */}
          <div>
            <label className="block text-sm font-semibold mb-2">3. Motif</label>
            <textarea
              value={form.motif}
              onChange={(e) => update("motif", e.target.value)}
              rows={3}
              required
              placeholder="Description brève de la demande..."
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
            />
          </div>

          {/* 4. Pièce jointe */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              4. Pièce jointe {selectedTypeObj?.necessite_piece_jointe && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              onChange={(e) => setPieceJointe(e.target.files[0] || null)}
              className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E91E8C]/10 file:text-[#E91E8C] hover:file:bg-[#E91E8C]/20"
            />
          </div>

          {erreur && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{erreur}</p>}

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