import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

const nomAgent = (agent, fallback = "Agent") =>
  agent?.nom_complet || `${agent?.first_name || ""} ${agent?.last_name || ""}`.trim() || agent?.username || fallback;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

function BadgeStatut({ statut }) {
  const styles = {
    VALIDEE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    VALIDE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REFUSEE: "bg-rose-50 text-rose-700 ring-rose-200",
    REFUSEE_CHEF: "bg-rose-50 text-rose-700 ring-rose-200",
    REFUSEE_RH: "bg-rose-50 text-rose-700 ring-rose-200",
    ANNULEE: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const labels = {
    VALIDEE: "Validée",
    VALIDE: "Validée",
    REFUSEE: "Refusée",
    REFUSEE_CHEF: "Refusée",
    REFUSEE_RH: "Refusée",
    ANNULEE: "Annulée"
  };

  const estEnAttente = statut?.startsWith("EN_ATTENTE");

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${estEnAttente ? "bg-amber-50 text-amber-700 ring-amber-200" : (styles[statut] || "bg-amber-50 text-amber-700 ring-amber-200")}`}>
      {estEnAttente ? "En cours" : (labels[statut] || statut)}
    </span>
  );
}

export default function AgentHistorique() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(id || "");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [agent, setAgent] = useState(null);
  const [soldes, setSoldes] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/users/me/").then(({ data }) => {
      if (data?.id) setCurrentUserId(String(data.id));
    }).catch(() => null);
  }, []);

  useEffect(() => {
    api.get("/users/").then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.results || [];
      setAgents(list);
      if (!id && list[0]) setSelectedAgentId(String(list[0].id));
    }).catch(() => setErreur("Impossible de charger la liste des agents."));
  }, [id]);

  useEffect(() => { if (id) setSelectedAgentId(id); }, [id]);

  const chargerDonneesAgent = () => {
    if (!selectedAgentId) { setChargement(false); return; }
    setChargement(true); setErreur("");
    Promise.all([
      api.get(`/users/${selectedAgentId}/`).catch(() => null),
      api.get(`/soldes/?utilisateur=${selectedAgentId}`).catch(() => ({ data: [] })),
      api.get(`/demandes/?utilisateur=${selectedAgentId}`).catch(() => ({ data: [] })),
    ]).then(([user, balance, requests]) => {
      const list = agents.find((item) => String(item.id) === String(selectedAgentId));
      setAgent(user?.data && !Array.isArray(user.data) ? user.data : list || null);
      const balances = Array.isArray(balance.data) ? balance.data : balance.data?.results || [];
      const demands = Array.isArray(requests.data) ? requests.data : requests.data?.results || [];
      setSoldes(balances.filter((item) => String(item.utilisateur?.id || item.utilisateur) === String(selectedAgentId)));
      setDemandes(demands.filter((item) => String(item.utilisateur?.id || item.utilisateur) === String(selectedAgentId)));
    }).catch(() => setErreur("Impossible de charger les données de cet agent."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    chargerDonneesAgent();
  }, [selectedAgentId, agents]);

  const estAnnulable = (demande) => {
    const { statut, date_debut } = demande;
    if (statut === "ANNULEE" || statut?.startsWith("REFUSEE")) return false;
    if (statut?.startsWith("EN_ATTENTE")) return true;
    if (statut === "VALIDE" || statut === "VALIDEE") {
      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);
      const dateDebutConge = new Date(date_debut);
      dateDebutConge.setHours(0, 0, 0, 0);
      return dateDebutConge > aujourdhui;
    }
    return false;
  };

  const handleAnnulerDemande = async (demandeId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette demande de congé ?")) return;
    try {
      await api.post(`/demandes/${demandeId}/annuler/`);
      chargerDonneesAgent();
    } catch (err) {
      alert(err.response?.data?.error || "Une erreur est survenue lors de l'annulation.");
    }
  };

  // Calculs synthétiques pour les 2 champs spéciaux
  const statsMaladie = useMemo(() => {
    let joursMaladieOrdinaire = 0;
    let joursMaladieSpeciale = 0;
    let nbArretsOrdinaires = 0;
    let nbArretsSpeciaux = 0;

    demandes.forEach((d) => {
      const isValideOuAttente = d.statut === "VALIDE" || d.statut === "VALIDEE" || d.statut?.startsWith("EN_ATTENTE");
      if (!isValideOuAttente) return;

      const code = (d.type_conge_code || "").toUpperCase();
      const libelle = (d.type_conge_libelle || d.type_conge?.libelle || "").toLowerCase();
      const nbrJours = Number(d.nombre_jours) || 0;

      const isMaladie = code === "MALADIE" || libelle.includes("maladie");
      const isSpeciale = code === "MALADIE_SPECIALE" || libelle.includes("spécial") || libelle.includes("special") || nbrJours > 4;

      if (isMaladie) {
        if (isSpeciale) {
          joursMaladieSpeciale += nbrJours;
          nbArretsSpeciaux += 1;
        } else {
          joursMaladieOrdinaire += nbrJours;
          nbArretsOrdinaires += 1;
        }
      }
    });

    return {
      joursMaladieOrdinaire,
      joursMaladieSpeciale,
      nbArretsOrdinaires,
      nbArretsSpeciaux,
    };
  }, [demandes]);

  const filteredDemandes = useMemo(() => demandes.filter((item) => {
    if (Number(item.nombre_jours) <= 0) return false;
    
    const text = `${item.type_conge_libelle || item.type_conge?.libelle || ""} ${item.motif || ""}`.toLowerCase();
    const correspondRecherche = !query || text.includes(query.toLowerCase());

    if (!correspondRecherche) return false;
    if (statusFilter === "TOUS") return true;

    if (statusFilter === "EN_COURS") {
      return item.statut?.startsWith("EN_ATTENTE");
    }

    if (statusFilter === "REFUSEE") {
      return item.statut === "REFUSEE" || item.statut === "REFUSEE_CHEF" || item.statut === "REFUSEE_RH";
    }

    return item.statut === statusFilter;
  }), [demandes, query, statusFilter]);

  const totalJours = demandes.reduce((sum, item) => sum + Number(item.nombre_jours || 0), 0);
  const validees = demandes.filter((item) => item.statut === "VALIDEE" || item.statut === "VALIDE").length;

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-8 px-1 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#93003f]">
            <Icone d={I.retour} className="h-4 w-4" />Retour
          </button>
          {agents.length > 0 && (
            <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-500">Agent
              <select value={selectedAgentId} onChange={(e) => { setSelectedAgentId(e.target.value); navigate(`/chef/agents/${e.target.value}/historique`); }} className="rounded-xl border border-[#00efff]/40 bg-[#e7ffff] px-3 py-2 text-sm font-bold normal-case text-[#3c0038] outline-none focus:ring-2 focus:ring-[#00efff]">
                {agents.map((item) => <option key={item.id} value={item.id}>{nomAgent(item, `Agent #${item.id}`)}</option>)}
              </select>
            </label>
          )}
        </div>

        {chargement ? (
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-12 text-center text-slate-500 shadow-sm">Chargement du dossier de l&apos;agent…</div>
        ) : erreur ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 font-medium text-rose-700">{erreur}</div>
        ) : (
          <>
            <header className="relative overflow-hidden rounded-[1.75rem] border border-[#00efff]/35 bg-gradient-to-br from-white via-white to-[#e7ffff]/70 p-6 shadow-[0_14px_40px_rgba(60,0,56,0.07)] sm:p-8">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#00efff]/10 blur-2xl" />
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#0097ff] to-[#93003f]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="pl-2">
                  <span className="inline-flex rounded-full bg-[#e7ffff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0097ff]">Dossier agent #{selectedAgentId}</span>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-[#3c0038] sm:text-4xl">{nomAgent(agent, `Agent #${selectedAgentId}`)}</h1>
                  <p className="mt-2 text-sm text-slate-500">{agent?.email || "Adresse e-mail non renseignée"}{agent?.service_nom ? ` • ${agent.service_nom}` : ""}</p>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#93003f] text-2xl font-black text-white shadow-lg shadow-[#93003f]/20">
                  {nomAgent(agent, "A").charAt(0).toUpperCase()}
                </div>
              </div>
            </header>

            {/* Statistiques générales */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#00efff]/30 bg-[#e7ffff] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#0097ff]">Demandes</p>
                <p className="mt-2 text-3xl font-black text-[#3c0038]">{demandes.length}</p>
                <p className="text-sm text-slate-500">{validees} validée{validees > 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#0097ff]">Jours demandés</p>
                <p className="mt-2 text-3xl font-black text-[#93003f]">{totalJours}</p>
                <p className="text-sm text-slate-500">sur l&apos;historique disponible</p>
              </div>
              <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#0097ff]">Soldes suivis</p>
                <p className="mt-2 text-3xl font-black text-[#3c0038]">{soldes.length}</p>
                <p className="text-sm text-slate-500">année{soldes.length > 1 ? "s" : ""} enregistrée{soldes.length > 1 ? "s" : ""}</p>
              </div>
            </section>

            {/* CHAMPS SPÉCIAUX : Congé Maladie & Congé Maladie Spécial */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm transition hover:border-rose-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      Congé Maladie
                    </p>
                  </div>
                  <p className="text-2xl font-black text-rose-950">
                    {statsMaladie.joursMaladieOrdinaire} <span className="text-xs font-medium text-rose-700">jours suivis</span>
                  </p>
                  <p className="text-xs text-rose-600">
                    {statsMaladie.nbArretsOrdinaires} arrêt(s) ordinaire(s) enregistré(s)
                  </p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                  <Icone d={I.horloge} className="h-6 w-6" />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm transition hover:border-amber-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Congé Maladie Spécial / Longue Durée
                    </p>
                  </div>
                  <p className="text-2xl font-black text-amber-950">
                    {statsMaladie.joursMaladieSpeciale} <span className="text-xs font-medium text-amber-700">jours suivis</span>
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    {statsMaladie.nbArretsSpeciaux} dossier(s) &gt; 4j ou à statut spécial
                  </p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                  <Icone d={I.calendrier} className="h-6 w-6" />
                </span>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-black text-[#3c0038]">Soldes de congé</h2>
              {soldes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#00efff]/50 bg-[#e7ffff]/50 p-8 text-center text-sm text-slate-500">
                  Aucun solde enregistré pour cet agent.
                </div>
              ) : (
                <div className="space-y-4">
                  {soldes.map((s) => {
                    const acquis = s.droits_acquis || 21;
                    const consommes = s.jours_consommes || 0;
                    const restants = Math.round(s.solde_actuel ?? s.solde ?? 0);
                    const pourcentageRestant = Math.min(100, Math.max(0, (restants / (acquis || 1)) * 100));

                    return (
                      <div key={s.id} className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-[#00efff]/20 bg-[#e7ffff]/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-xl bg-[#3c0038] px-3 py-1 text-xs font-black text-white">
                              ANNÉE {s.annee}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Droits annuels attribués
                            </span>
                          </div>
                          <span className="rounded-full bg-[#e7ffff] border border-[#00efff]/40 px-3 py-1 text-xs font-bold text-[#0097ff]">
                            {acquis} jours acquis
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
                          <div className="border-r border-slate-100 pr-4 last:border-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Solde restant</p>
                            <p className="mt-1 text-3xl font-black text-[#3c0038]">
                              {restants} <span className="text-sm font-medium text-slate-500">jours</span>
                            </p>
                          </div>

                          <div className="border-r border-slate-100 pr-4 last:border-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jours consommés</p>
                            <p className="mt-1 text-3xl font-black text-[#93003f]">
                              {consommes} <span className="text-sm font-medium text-slate-500">jours</span>
                            </p>
                          </div>

                          <div className="border-r border-slate-100 pr-4 last:border-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jours reportés</p>
                            <p className="mt-1 text-3xl font-black text-[#0097ff]">
                              {s.jours_reportes || 0} <span className="text-sm font-medium text-slate-500">jours</span>
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jours acquis</p>
                            <p className="mt-1 text-3xl font-black text-slate-700">
                              {acquis} <span className="text-sm font-medium text-slate-500">jours</span>
                            </p>
                          </div>
                        </div>

                        <div className="px-6 pb-5">
                          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
                            <span>Disponibilité du solde</span>
                            <span>{Math.round(pourcentageRestant)}% restant</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#0097ff] to-[#93003f] transition-all duration-500"
                              style={{ width: `${pourcentageRestant}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#3c0038]">Historique des demandes</h2>
                  <p className="text-sm text-slate-500">Consultez et filtrez les demandes de cet agent.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Icone d={I.loupe} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0097ff]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher une demande…"
                      aria-label="Rechercher une demande"
                      className="w-full rounded-xl border border-[#00efff]/40 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-[#00efff]/40 bg-[#e7ffff] px-3 py-2 text-sm font-semibold text-[#3c0038] outline-none focus:ring-2 focus:ring-[#00efff]"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="VALIDEE">Validées</option>
                    <option value="REFUSEE">Refusées</option>
                    <option value="ANNULEE">Annulées</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
                {filteredDemandes.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Aucune demande ne correspond à votre recherche.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm text-slate-600">
                      <thead className="bg-[#e7ffff] text-[11px] font-black uppercase tracking-wide text-[#0097ff]">
                        <tr>
                          <th className="px-5 py-4">Type</th>
                          <th className="px-5 py-4">Période</th>
                          <th className="px-5 py-4">Durée</th>
                          <th className="px-5 py-4">Statut</th>
                          <th className="px-5 py-4">Motif</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#00efff]/15">
                        {filteredDemandes.map((d) => {
                          const libelleType = d.type_conge_libelle || d.type_conge?.libelle || "Congé";
                          const codeType = (d.type_conge_code || "").toUpperCase();
                          const nbrJours = Number(d.nombre_jours) || 0;
                          
                          // Détection si c'est une maladie de plus de 4 jours
                          const estMaladie = codeType === "MALADIE" || libelleType.toLowerCase().includes("maladie");
                          const estMaladieLongue = estMaladie && nbrJours > 4;

                          return (
                            <tr key={d.id} className="transition hover:bg-[#e7ffff]/45">
                              <td className="px-5 py-4 font-bold text-[#3c0038]">
                                {libelleType}
                                {estMaladieLongue && (
                                  <span className="text-amber-800 font-semibold ml-1">
                                    (cas spéciale)
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-medium text-[#3c0038]">{formatDate(d.date_debut)}</span>
                                <span className="mx-1 text-slate-400">→</span>
                                {formatDate(d.date_fin)}
                              </td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-[#e7ffff] px-3 py-1 font-black text-[#93003f]">
                                  {nbrJours}j
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <BadgeStatut statut={d.statut} />
                              </td>
                              <td className="max-w-xs truncate px-5 py-4 text-slate-500">
                                {d.motif || "—"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {estAnnulable(d) ? (
                                  <button
                                    onClick={() => handleAnnulerDemande(d.id)}
                                    title="Annuler cette demande"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Annuler
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}