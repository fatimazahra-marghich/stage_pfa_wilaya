import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import StatutBadge from "../../components/StatutBadge";
import { Icone, I } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";

function salutationSelonHeure() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardEmploye() {
  const { user } = useAuth();
  const [solde, setSolde] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    async function charger() {
      setErreur(null);
      try {
        const [{ data: soldes }, { data: demandesData }] = await Promise.all([
          api.get("/soldes/"),
          api.get("/demandes/mes-demandes/"),
        ]);

        const soldeExtrait = Array.isArray(soldes) ? soldes[0] : (soldes?.results?.[0] ?? soldes);
        setSolde(soldeExtrait ?? null);

        const liste = demandesData?.results ?? demandesData ?? [];
        setDemandes(Array.isArray(liste) ? liste.slice(0, 5) : []);
      } catch (error) {
        console.error("Erreur de chargement du tableau de bord :", error);
        setErreur("Impossible de charger vos données. Réessayez dans un instant.");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  const acquisTotal = solde ? (Number(solde.droits_acquis || 0) + Number(solde.jours_reportes || 0)) : 0;
  const consommes = solde?.jours_consommes ?? 0;
  const restant = solde?.solde_actuel ?? (acquisTotal - consommes);
  const pourcentageRestant =
    acquisTotal > 0 ? Math.max(0, Math.min(100, (restant / acquisTotal) * 100)) : 0;
  const pourcentageConsomme =
    acquisTotal > 0 ? Math.max(0, Math.min(100, (consommes / acquisTotal) * 100)) : 0;

  const messageTendance =
    restant >= 15
      ? "Solde confortable pour planifier vos prochaines vacances."
      : restant >= 5
        ? "Il vous reste de quoi souffler encore un peu."
        : restant > 0
          ? "Solde bientôt épuisé, pensez à anticiper vos demandes."
          : "Solde épuisé pour cette période.";

  function estUneMaladie(d) {
    const code = d.type_conge_code || d.type_conge?.code || "";
    const libelle = d.type_conge_libelle || d.type_conge?.libelle || "";

    return (
      code === "MALADIE_COURTE" ||
      code === "MALADIE" ||
      libelle.toLowerCase().includes("maladie")
    );
  }

  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const champCarte =
    "rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm";

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0097ff]">
              <Icone d={I.soleil} className="h-4 w-4" />
              {dateDuJour}
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              {salutationSelonHeure()},{" "}
              {user?.nomComplet ? user.nomComplet.split(" ")[0] : "Employé"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Voici un aperçu de vos droits et de vos demandes récentes.
            </p>
          </div>

          <Link
            to="/employe/nouvelle-demande"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#93003f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3c0038]"
          >
            <Icone d={I.plus} />
            Nouvelle demande
          </Link>
        </header>

        {chargement ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40"
              />
            ))}
          </div>
        ) : erreur ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <span className="mt-0.5 text-rose-600">
              <Icone d={I.alerte} className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-rose-900">{erreur}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className={`${champCarte} flex flex-col items-center justify-center`}>
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#e7ffff]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#93003f] transition-all duration-1000 ease-out"
                      strokeDasharray={`${pourcentageRestant}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tabular-nums text-[#3c0038]">
                      {restant}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0097ff]">
                      Jours dispo
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-center text-xs font-medium leading-relaxed text-slate-500">
                  {messageTendance}
                </p>
              </div>

              <div className={`${champCarte} flex flex-col justify-between`}>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0097ff]">
                  Droits acquis
                </span>
                <div className="my-4">
                  <span className="text-4xl font-bold tabular-nums text-[#3c0038]">
                    {solde?.droits_acquis ?? 0}
                  </span>
                  <span className="ml-1.5 text-sm font-semibold text-slate-400">jours</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#00efff]/30 pt-4 text-xs text-slate-500">
                  <span>Report année précédente</span>
                  <span className="font-bold text-[#93003f]">
                    +{solde?.jours_reportes ?? 0} j
                  </span>
                </div>
              </div>

              <div className={`${champCarte} flex flex-col justify-between`}>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0097ff]">
                  Jours consommés
                </span>
                <div className="my-4">
                  <span className="text-4xl font-bold tabular-nums text-[#3c0038]">
                    {consommes}
                  </span>
                  <span className="ml-1.5 text-sm font-semibold text-slate-400">jours</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#e7ffff]">
                  <div
                    className="h-full rounded-full bg-[#0097ff] transition-all duration-700"
                    style={{ width: `${pourcentageConsomme}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-[#00efff]/30 bg-[#e7ffff]/40 p-4">
              <span className="mt-0.5 text-[#0097ff]">
                <Icone d={I.info} className="h-5 w-5" />
              </span>
              <p className="text-xs leading-relaxed text-[#3c0038]">
                <span className="font-bold">Rappel :</span> les congés maladie sont
                décomptés automatiquement dès réception du certificat. Un arrêt de plus de
                4 jours peut faire l'objet d'une contre-visite organisée par les RH.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#3c0038]">Demandes récentes</h2>
              <Link
                to="/employe/historique"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0097ff] hover:underline"
              >
                Voir tout l'historique
                <Icone d={I.fleche} className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#00efff]/20 overflow-hidden rounded-2xl border border-[#00efff]/30 bg-white shadow-sm">
              {demandes.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e7ffff] text-[#0097ff]">
                    <Icone d={I.calendrier} className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-sm font-medium text-slate-500">
                    Aucune demande d'absence enregistrée pour le moment.
                  </p>
                </div>
              ) : (
                demandes.map((d) => {
                  const estRefusee = String(d.statut).startsWith("REFUSEE");
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 p-5 transition-colors hover:bg-[#e7ffff]/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-[#3c0038]">
                              {d.type_conge_libelle || d.type_conge?.libelle || "Congé"}
                            </p>
                            {estUneMaladie(d) && d.nombre_jours > 4 && (
                              <span className="rounded-full bg-[#93003f]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#93003f]">
                                Contre-visite possible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Du <span className="font-semibold text-[#3c0038]">{d.date_debut}</span>{" "}
                            au <span className="font-semibold text-[#3c0038]">{d.date_fin}</span> •{" "}
                            {d.nombre_jours} jour{d.nombre_jours > 1 ? "s" : ""}
                          </p>
                        </div>
                        <StatutBadge statut={d.statut} />
                      </div>

                      {estRefusee && d.commentaire_refus && (
                        <div className="mt-1 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
                          <Icone d={I.alerte} className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          <div>
                            <span className="font-bold">Motif du refus :</span> {d.commentaire_refus}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}