const STYLES = {
  EN_ATTENTE_CHEF: "border border-black text-black bg-white",
  EN_ATTENTE_CONSEIL_SANTE: "border border-black text-black bg-white",
  EN_ATTENTE_RH: "border border-black text-black bg-white",
  VALIDEE: "bg-[#E91E8C] text-white",
  REFUSEE: "bg-neutral-200 text-neutral-500",
};

const LABELS = {
  EN_ATTENTE_CHEF: "En attente chef de service",
  EN_ATTENTE_CONSEIL_SANTE: "En attente conseil de santé",
  EN_ATTENTE_RH: "En attente RH",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

export default function StatutBadge({ statut }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
        STYLES[statut] ?? "bg-neutral-100 text-neutral-700"
      }`}
    >
      {LABELS[statut] ?? statut}
    </span>
  );
}