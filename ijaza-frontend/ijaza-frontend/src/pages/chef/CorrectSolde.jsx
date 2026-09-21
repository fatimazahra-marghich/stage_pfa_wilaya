import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

export default function CorrectSolde() {
  const [agents, setAgents] = useState([]);
  const [soldes, setSoldes] = useState([]);

  // Formulaire
  const [agentId, setAgentId] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [motif, setMotif] = useState("");

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [chargement, setChargement] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let estMonte = true;

    async function chargerDonnees() {
      setChargement(true);
      setErreur("");

      try {
        const [uRes, sRes] = await Promise.all([
          api.get("/users/").catch(() => ({ data: [] })),
          api.get("/soldes/").catch(() => ({ data: [] })),
        ]);

        if (!estMonte) return;

        let uData = uRes.data?.results ?? uRes.data ?? [];
        const sData = sRes.data?.results ?? sRes.data ?? [];

        // Fallback: Si /users/ est vide, déduire la liste depuis les soldes
        if (uData.length === 0 && sData.length > 0) {
          const mapUsers = new Map();
          sData.forEach((s) => {
            const uObj = s.utilisateur_details || s.utilisateur;
            const uid = uObj?.id ?? s.utilisateur_id ?? (typeof s.utilisateur !== "object" ? s.utilisateur : null);
            const nom = uObj?.nom_complet || s.utilisateur_nom || (uid ? `Agent #${uid}` : null);

            if (uid && !mapUsers.has(String(uid))) {
              mapUsers.set(String(uid), { id: uid, nom_complet: nom });
            }
          });
          uData = Array.from(mapUsers.values());
        }

        setAgents(uData);
        setSoldes(sData);

        if (uData.length > 0) setAgentId(String(uData[0].id));

      } catch (err) {
        console.error("Erreur de chargement :", err);
        setErreur("Impossible de charger les données.");
      } finally {
        if (estMonte) setChargement(false);
      }
    }

    chargerDonnees();

    return () => {
      estMonte = false;
    };
  }, []);

  // Recherche directe du Solde Annuel de l'agent sélectionné
  const soldeExistant = useMemo(() => {
    if (!agentId || soldes.length === 0) return null;

    return soldes.find((s) => {
      const rawUser = s.utilisateur?.id ?? s.utilisateur_id ?? s.utilisateur;
      const matchUser = String(rawUser) === String(agentId);
      const matchAnnee = !s.annee || String(s.annee) === String(annee);

      return matchUser && matchAnnee;
    });
  }, [soldes, agentId, annee]);

  // Valeur numérique du solde actuel (arrondie à un entier)
  const valSoldeActuel = useMemo(() => {
    if (!soldeExistant) return 0;

    const val =
      soldeExistant.solde_actuel ??
      soldeExistant.solde ??
      soldeExistant.droits_acquis ??
      0;

    return Math.round(parseFloat(val)) || 0;
  }, [soldeExistant]);

  // Calcul dynamique de l'écart en entiers
  const ecart = useMemo(() => {
    if (nouveauSolde === "") return null;
    const nouveau = parseInt(nouveauSolde, 10);
    if (Number.isNaN(nouveau)) return null;
    return nouveau - valSoldeActuel;
  }, [valSoldeActuel, nouveauSolde]);

  // Gestion de la saisie : NOMBRES ENTIERS UNIQUEMENT
  const handleNouveauSoldeChange = (e) => {
    // Supprime tout ce qui n'est pas un chiffre (pas de virgule, pas de point, pas de tiret)
    const val = e.target.value.replace(/\D/g, "");
    setNouveauSolde(val);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setSucces(false);

    if (!agentId || nouveauSolde === "" || !motif.trim()) {
      setErreur("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const soldeSaisi = parseInt(nouveauSolde, 10);
    if (isNaN(soldeSaisi) || soldeSaisi < 0) {
      setErreur("Le nouveau solde doit être un nombre entier positif ou nul.");
      return;
    }

    setEnvoi(true);
    try {
      await api.post("/corrections-solde/", {
        utilisateur: parseInt(agentId, 10),
        solde_conge: soldeExistant?.id || null,
        annee: parseInt(annee, 10),
        nouveau_solde: soldeSaisi,
        motif,
      });

      setSucces(true);
      setTimeout(() => navigate("/chef"), 1500);
    } catch (err) {
      console.error("Erreur de régularisation :", err);
      if (err.response?.status === 403) {
        setErreur("Erreur 403 (Forbidden) : Vérifiez que le middleware CSRF est bien désactivé dans settings.py.");
      } else {
        setErreur("La correction a échoué. Vérifiez vos autorisations.");
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-[#93003f] cursor-pointer"
        >
          <Icone d={I.retour} className="h-4 w-4" />
          Retour
        </button>

        <header className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#93003f]">
            Régularisation Administrative
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
            Ajuster le solde d&apos;un agent
          </h1>
        </header>

        {chargement ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
            Chargement des données...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            {/* Sélection de l'agent */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3c0038]">
                Sélectionnez l&apos;agent
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0097ff] bg-white cursor-pointer"
              >
                <option value="">-- Choisir un agent du service --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom_complet || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.username || `Agent #${a.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Type de congé (fixé) et Année */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3c0038]">
                  Type de congé
                </label>
                <input
                  type="text"
                  value="Congé Annuel / Administratif"
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3c0038]">
                  Année
                </label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0097ff]"
                />
              </div>
            </div>

            {/* Cartes d'affichage des soldes entiers */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Solde Actuel</p>
                <p className="text-lg font-bold text-slate-600">
                  {valSoldeActuel} j
                </p>
              </div>

              <div className="rounded-xl bg-[#e7ffff] p-3 border border-[#00efff]/40">
                <p className="text-[10px] uppercase font-semibold text-[#0097ff]">Nouveau Solde</p>
                <p className="text-lg font-bold text-[#93003f]">
                  {nouveauSolde === "" ? "—" : `${nouveauSolde} j`}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Écart</p>
                <p
                  className={`text-lg font-bold ${
                    ecart > 0
                      ? "text-emerald-600"
                      : ecart < 0
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {ecart === null ? "—" : `${ecart > 0 ? "+" : ""}${ecart} j`}
                </p>
              </div>
            </div>

            {/* Saisie du nouveau solde (Nombres entiers uniquement) */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3c0038]">
                Nouveau solde (en jours entiers)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={nouveauSolde}
                onChange={handleNouveauSoldeChange}
                required
                placeholder="Exemple: 20"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0097ff]"
              />
            </div>

            {/* Motif */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#3c0038]">
                Justification / Motif
              </label>
              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={3}
                required
                placeholder="Ex: Rectification suite à un oubli de réintégration..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0097ff]"
              />
            </div>

            {erreur && <p className="text-sm font-semibold text-rose-600">{erreur}</p>}
            {succes && <p className="text-sm font-semibold text-emerald-600">Solde mis à jour avec succès ! Redirection...</p>}

            <button
              type="submit"
              disabled={envoi}
              className="w-full rounded-xl bg-[#93003f] py-3 font-semibold text-white transition hover:bg-[#3c0038] disabled:opacity-50 cursor-pointer"
            >
              {envoi ? "Enregistrement en cours..." : "Valider la régularisation"}
            </button>
          </form>
        )}
      </div>
    </MainLayout>
  );
}