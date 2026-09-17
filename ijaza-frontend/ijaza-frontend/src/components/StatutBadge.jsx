/* ------------------------------------------------------------------ */
/* Palette                                                             */
/*   #3c0038 prune · #93003f bordeaux · #0097ff bleu                   */
/*   #00efff cyan   · #e7ffff cyan pâle                                */
/*                                                                     */
/* Lecture voulue : les statuts en attente restent dans les bleus       */
/* (information, aucune action de l'agent), la validation prend le      */
/* bordeaux de l'action (décision prise), le refus reste neutre.        */
/* ------------------------------------------------------------------ */

const STATUTS = {
  EN_ATTENTE_CHEF: {
    label: "En attente du chef de service",
    court: "Chef de service",
    classe: "border border-[#00efff] bg-[#e7ffff] text-[#0097ff]",
    pastille: "bg-[#0097ff]",
  },
  EN_ATTENTE_CONSEIL_SANTE: {
    label: "En attente du conseil de santé",
    court: "Conseil de santé",
    classe: "border border-[#0097ff]/40 bg-[#0097ff]/10 text-[#0097ff]",
    pastille: "bg-[#0097ff]",
  },
  EN_ATTENTE_RH: {
    label: "En attente des ressources humaines",
    court: "Ressources humaines",
    classe: "border border-[#3c0038]/20 bg-[#3c0038]/5 text-[#3c0038]",
    pastille: "bg-[#3c0038]",
  },
  VALIDEE: {
    label: "Validée",
    court: "Validée",
    classe: "border border-transparent bg-[#93003f] text-white",
    pastille: "bg-white",
  },
  REFUSEE: {
    label: "Refusée",
    court: "Refusée",
    classe: "border border-slate-200 bg-slate-100 text-slate-500",
    pastille: "bg-slate-400",
  },
};

const DEFAUT = {
  classe: "border border-slate-200 bg-slate-50 text-slate-600",
  pastille: "bg-slate-400",
};

/**
 * @param {string}  statut   clé du statut renvoyée par l'API
 * @param {boolean} compact  version courte, pour les tableaux denses
 * @param {string}  className classes additionnelles éventuelles
 */
export default function StatutBadge({ statut, compact = false, className = "" }) {
  const config = STATUTS[statut];
  const style = config ?? DEFAUT;
  const texte = config ? (compact ? config.court : config.label) : statut || "Statut inconnu";

  return (
    <span
      title={config?.label ?? statut}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${style.classe} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.pastille}`} aria-hidden="true" />
      {texte}
    </span>
  );
}