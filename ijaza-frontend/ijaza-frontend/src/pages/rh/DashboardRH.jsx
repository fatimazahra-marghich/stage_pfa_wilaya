import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

function nomComplet(d) {
  if (!d) return "Inconnu";
  const u = d.utilisateur_details || d.utilisateur || d;
  if (typeof u === "object" && u !== null) {
    if (u.nom_complet) return u.nom_complet;
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    if (u.username) return u.username;
  }
  return d.utilisateur_nom || `Agent #${d.utilisateur?.id || d.utilisateur || d.id || "?"}`;
}

export default function DashboardRH() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [ongletActif, setOngletActif] = useState("a_valider");
  const [recherche, setRecherche] = useState("");

  // Modal de refus
  const [demandeRefus, setDemandeRefus] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // 1. Récupération de l'utilisateur connecté dans localStorage
      const userStored = JSON.parse(
        localStorage.getItem("ijaza_user") || 
        localStorage.getItem("user") || 
        "{}"
      );

      // 2. Vérification des droits RH
      const roleUpper = String(userStored?.role || "").toUpperCase();
      const codeService = String(userStored?.service_details?.code || userStored?.service_nom || "").toUpperCase();
      
      const estRH =
        roleUpper.includes("RH") ||
        roleUpper.includes("ADMIN") ||
        codeService === "RH" ||
        userStored?.est_rh_general === true ||
        userStored?.is_superuser === true;

      if (!userStored || (!userStored.email && !userStored.id) || !estRH) {
        alert("Accès restreint à la Direction des Ressources Humaines.");
        navigate("/dashboard");
        return;
      }

      setCurrentUser(userStored);

      // 3. Appel sécurisé des endpoints API
      const resDemandes = await api.get("/demandes/").catch((err) => {
        console.warn("Erreur chargement demandes:", err);
        return { data: [] };
      });

      const liste = resDemandes.data?.results ?? resDemandes.data ?? [];
      setDemandes(Array.isArray(liste) ? liste : []);

    } catch (err) {
      console.error("Erreur globale Dashboard RH :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // 1. Demandes à valider : Inclut EN_ATTENTE_RH, EN_ATTENTE_SANTE et EN_ATTENTE_CHEF
  const demandesAValider = useMemo(() => {
    return demandes.filter((d) => {
      // Exclure les demandes annulées ou déjà refusées/validées
      const statutsAffiches = ["EN_ATTENTE_RH", "EN_ATTENTE_SANTE", "EN_ATTENTE_CHEF"];
      const statutValide = statutsAffiches.includes(d?.statut);

      const searchMatch =
        nomComplet(d).toLowerCase().includes(recherche.toLowerCase()) ||
        String(d?.type_conge_libelle || "").toLowerCase().includes(recherche.toLowerCase());

      return statutValide && searchMatch;
    });
  }, [demandes, recherche]);

  // 2. Congés Maladie & Contre-visite
  const demandesMaladie = useMemo(() => {
    return demandes.filter((d) => {
      if (d?.statut === "ANNULEE") return false;

      const code = String(d?.type_conge?.code || d?.type_conge_code || "").toUpperCase();
      const libelle = String(d?.type_conge_libelle || d?.type_conge?.libelle || "").toLowerCase();

      const estMaladie =
        d?.est_maladie ||
        code.includes("MALADIE") ||
        (libelle.includes("maladie") && !libelle.includes("exceptionnel"));

      const searchMatch = nomComplet(d).toLowerCase().includes(recherche.toLowerCase());

      return estMaladie && searchMatch;
    });
  }, [demandes, recherche]);

  // 3. Mes Demandes Personnelles (RH)
  const mesDemandes = useMemo(() => {
    return demandes.filter((d) => {
      const idUser = d?.utilisateur?.id || d?.utilisateur;
      return String(idUser) === String(currentUser?.id);
    });
  }, [demandes, currentUser]);

  // Actions de validation / refus / annulation
  const traiterAction = async (id, action, commentaire = "") => {
    try {
      let endpoint = `/demandes/${id}/valider/`;
      if (action === "REFUSE") endpoint = `/demandes/${id}/refuser/`;
      if (action === "ANNULER") endpoint = `/demandes/${id}/annuler/`;

      await api.post(endpoint, { commentaire });
      setDemandeRefus(null);
      setMotifRefus("");
      await chargerDonnees();
    } catch (err) {
      console.error("Erreur action RH :", err);
      const msg = err.response?.data?.error || err.response?.data?.detail || "Une erreur est survenue.";
      alert(msg);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Ressources Humaines</span>
              <span>·</span>
              <span className="text-[#93003f]">Gestion Centrale</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Tableau de Bord RH
            </h1>
          </div>

          <nav className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1.5 border border-slate-200/80">
            <button
              onClick={() => setOngletActif("a_valider")}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "a_valider"
                  ? "bg-white text-[#3c0038] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              À Valider ({demandesAValider.length})
            </button>
            <button
              onClick={() => setOngletActif("maladie")}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "maladie"
                  ? "bg-white text-[#93003f] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Maladie & Contre-visite ({demandesMaladie.length})
            </button>
            <button
              onClick={() => setOngletActif("mes_demandes")}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                ongletActif === "mes_demandes"
                  ? "bg-white text-[#0097ff] shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Mes Demandes ({mesDemandes.length})
            </button>
          </nav>
        </header>

        {/* Barre de Recherche */}
        <div className="rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icone d={I.loupe} className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom d'agent, motif ou type de congé..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#0097ff]"
            />
          </div>
        </div>

        {/* Contenu */}
        {chargement ? (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#00efff] border-t-transparent" />
            <p className="mt-2 text-xs text-slate-400">Chargement des données en cours...</p>
          </div>
        ) : (
          <>
            {/* Onglet 1 : À Valider */}
            {ongletActif === "a_valider" && (
              <div className="space-y-4">
                {demandesAValider.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm md:flex-row md:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#3c0038]">{nomComplet(d)}</span>
                        <StatutBadge statut={d.statut} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600 font-medium">
                        {d.type_conge_libelle || "Congé"} — Du {d.date_debut} au {d.date_fin} ({d.nombre_jours} jour(s))
                      </p>
                      {d.motif && (
                        <p className="mt-1 text-xs italic text-slate-400">
                          Motif : "{d.motif}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDemandeRefus(d)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => traiterAction(d.id, "VALIDE")}
                        className="rounded-xl bg-[#93003f] px-4 py-2 text-xs font-bold text-white hover:bg-[#3c0038]"
                      >
                        Validation RH
                      </button>
                    </div>
                  </div>
                ))}

                {demandesAValider.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Aucune demande en attente de validation. 🎉
                  </div>
                )}
              </div>
            )}

            {/* Onglet 2 : Congés Maladie */}
            {ongletActif === "maladie" && (
              <div className="space-y-3">
                {demandesMaladie.map((d) => {
                  const estLongueDuree = d.necessite_contre_visite || Number(d?.nombre_jours) > 4;
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-bold text-[#3c0038]">{nomComplet(d)}</p>
                        <p className="text-xs text-slate-500">
                          Période : {d.date_debut} au {d.date_fin} ({d.nombre_jours} jours)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatutBadge statut={d.statut} />
                        {estLongueDuree && (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            Contre-visite requise (&gt; 4j)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {demandesMaladie.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Aucun congé maladie enregistré.
                  </div>
                )}
              </div>
            )}

            {/* Onglet 3 : Mes Demandes Personnelles */}
            {ongletActif === "mes_demandes" && (
              <div className="space-y-4">
                {mesDemandes.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/30 p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#3c0038]">{d.type_conge_libelle || "Congé"}</span>
                        <StatutBadge statut={d.statut} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Du {d.date_debut} au {d.date_fin} ({d.nombre_jours} jour(s))
                      </p>
                    </div>

                    {!["ANNULEE", "REFUSEE_CHEF", "REFUSEE_RH"].includes(d.statut) && (
                      <button
                        onClick={() => traiterAction(d.id, "ANNULER")}
                        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Annuler ma demande
                      </button>
                    )}
                  </div>
                ))}

                {mesDemandes.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-sm">
                    Vous n'avez soumis aucune demande.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal de Refus */}
        {demandeRefus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-[#3c0038]">
                Refuser la demande de {nomComplet(demandeRefus)}
              </h3>
              <textarea
                rows={3}
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                placeholder="Raison du refus (obligatoire)..."
                className="w-full rounded-xl border p-3 text-sm outline-none focus:border-[#0097ff]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDemandeRefus(null);
                    setMotifRefus("");
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => traiterAction(demandeRefus.id, "REFUSE", motifRefus)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}