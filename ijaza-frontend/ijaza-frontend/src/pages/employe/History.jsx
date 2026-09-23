import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";

const FILTRES = [
  { cle: "TOUT", texte: "Tous" },
  { cle: "EN_ATTENTE", texte: "En attente" },
  { cle: "VALIDEE", texte: "Validés" },
  { cle: "REFUSEE", texte: "Refusés" },
];

export default function History() {
  const [demandes, setDemandes] = useState([]);
  const [filtre, setFiltre] = useState("TOUT");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(null);

  const chargerDemandes = async () => {
    setChargement(true);
    setErreur(null);

    try {
      const response = await api.get("/demandes/mes-demandes/");
      const data = response.data;
      const list = Array.isArray(data) ? data : data?.results || [];
      setDemandes(list);
    } catch (err) {
      console.error("Erreur de chargement de l'historique :", err);
      setErreur("Impossible de charger votre historique. Réessayez dans un instant.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDemandes();
  }, []);

  const annulerDemande = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette demande ?")) return;

    setActionEnCours(id);
    try {
      await api.patch(`/demandes/${id}/annuler/`);
      await chargerDemandes();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de l'annulation de la demande.");
    } finally {
      setActionEnCours(null);
    }
  };

  const demandesFiltrees = useMemo(
    () =>
      (Array.isArray(demandes) ? demandes : []).filter((d) => {
        if (!d) return false;
        const statut = String(d.statut || "").toUpperCase();
        if (filtre === "TOUT") return true;
        if (filtre === "EN_ATTENTE") return statut.startsWith("EN_ATTENTE");
        if (filtre === "REFUSEE") return statut.startsWith("REFUSEE") || statut === "REFUSE";
        if (filtre === "VALIDEE") return statut === "VALIDEE" || statut === "VALIDE";
        return d.statut === filtre;
      }),
    [demandes, filtre]
  );

  const compteur = useMemo(
    () =>
      FILTRES.reduce((acc, f) => {
        acc[f.cle] = (Array.isArray(demandes) ? demandes : []).filter((d) => {
          if (!d) return false;
          const statut = String(d.statut || "").toUpperCase();
          if (f.cle === "TOUT") return true;
          if (f.cle === "EN_ATTENTE") return statut.startsWith("EN_ATTENTE");
          if (f.cle === "REFUSEE") return statut.startsWith("REFUSEE") || statut === "REFUSE";
          if (f.cle === "VALIDEE") return statut === "VALIDEE" || statut === "VALIDE";
          return d.statut === f.cle;
        }).length;
        return acc;
      }, {}),
    [demandes]
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
              Historique des demandes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Relevé détaillé et statut de l'ensemble de vos congés et absences.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {FILTRES.map((f) => (
              <button
                key={f.cle}
                type="button"
                onClick={() => setFiltre(f.cle)}
                aria-pressed={filtre === f.cle}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtre === f.cle
                    ? "bg-[#3c0038] text-white"
                    : "text-slate-500 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                }`}
              >
                {f.texte}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    filtre === f.cle
                      ? "bg-white/20 text-white"
                      : "bg-[#e7ffff] text-[#0097ff]"
                  }`}
                >
                  {compteur[f.cle] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#00efff]/30 bg-[#e7ffff]/40 text-[11px] font-extrabold uppercase tracking-wider text-[#0097ff]">
                <th className="px-6 py-4">Réf &amp; Type</th>
                <th className="px-6 py-4">Période</th>
                <th className="px-6 py-4">Durée</th>
                <th className="px-6 py-4">Justificatif</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00efff]/20 font-medium">
              {chargement ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-5">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-[#e7ffff]" />
                    </td>
                  </tr>
                ))
              ) : erreur ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600">
                      <Icone d={I.alerte} className="h-4 w-4" />
                      {erreur}
                    </span>
                  </td>
                </tr>
              ) : demandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7ffff] text-[#0097ff]">
                      <Icone d={I.calendrier} className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-sm text-slate-500">
                      {filtre === "TOUT"
                        ? "Aucune demande enregistrée dans votre historique."
                        : "Aucune demande ne correspond à ce filtre."}
                    </p>
                  </td>
                </tr>
              ) : (
                demandesFiltrees.map((d) => {
                  const statut = String(d.statut || "").toUpperCase();
                  const estRefusee = statut.startsWith("REFUSEE") || statut === "REFUSE";
                  const peutEtreAnnulee = statut.startsWith("EN_ATTENTE");
                  const libelleAffiche = d.type_conge_libelle || d.type_conge?.libelle || "Congé";

                  return (
                    <tr
                      key={d.id}
                      className="transition-colors hover:bg-[#e7ffff]/40"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#3c0038]">{libelleAffiche}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                          REF #{d.id}
                        </p>
                        
                        {estRefusee && d.commentaire_refus && (
                          <p className="mt-1.5 max-w-xs text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-1.5">
                            <span className="font-bold">Motif :</span> {d.commentaire_refus}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        Du{" "}
                        <span className="font-semibold text-[#3c0038]">{d.date_debut}</span>{" "}
                        au <span className="font-semibold text-[#3c0038]">{d.date_fin}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-[#e7ffff] px-2.5 py-1 text-xs font-bold text-[#93003f]">
                          {d.nombre_jours} jour{d.nombre_jours > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {d.piece_jointe ? (
                          <a
                            href={d.piece_jointe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0097ff] hover:underline"
                          >
                            <Icone d={I.document} className="h-4 w-4" />
                            Consulter
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatutBadge statut={d.statut} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {peutEtreAnnulee && (
                          <button
                            type="button"
                            onClick={() => annulerDemande(d.id)}
                            disabled={actionEnCours === d.id}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            {actionEnCours === d.id ? "Annulation..." : "Annuler"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}