import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

// Couleurs harmonisées pour le diagramme circulaire
const COULEURS_TYPES = [
  "#93003f", // Bordeau principal
  "#10b981", // Vert émeraude
  "#0097ff", // Bleu vif
  "#3c0038", // Violet sombre
  "#f59e0b", // Ambre
  "#6366f1", // Indigo
  "#ec4899", // Rose
];

export default function Reports() {
  const [demandes, setDemandes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Filtres d'analyse
  const [divisionFiltre, setDivisionFiltre] = useState("TOUTES");
  const [serviceFiltre, setServiceFiltre] = useState("TOUS");
  const [typeCongeFiltre, setTypeCongeFiltre] = useState("TOUS");
  const [anneeFiltre, setAnneeFiltre] = useState("2026");

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const [resDemandes, resDivisions, resServices] = await Promise.all([
        api.get("/demandes/").catch(() => ({ data: [] })),
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
      ]);

      const extraireDonnees = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.results)) return res.data.results;
        return [];
      };

      setDemandes(extraireDonnees(resDemandes));
      setDivisions(extraireDonnees(resDivisions));
      setServices(extraireDonnees(resServices));
    } catch (err) {
      console.error("Erreur chargement données statistiques :", err);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  // Services filtrés par division sélectionnée
  const servicesFiltres = useMemo(() => {
    if (divisionFiltre === "TOUTES") return services;
    return services.filter((s) => {
      const divId = s?.division?.id ?? s?.division ?? s?.division_id;
      return String(divId) === String(divisionFiltre);
    });
  }, [services, divisionFiltre]);

  // Types de congés disponibles
  const typesCongeDisponibles = useMemo(() => {
    const map = new Map();
    map.set("TOUS", "Tous les types de congé");

    demandes.forEach((d) => {
      let code = d?.type_conge_code || d?.type_conge?.code || d?.type_conge || d?.type_conge_id || "";
      let libelle = d?.type_conge_libelle || d?.type_conge?.libelle || code;
      if (code && !map.has(code)) {
        map.set(code, String(libelle));
      }
    });

    return Array.from(map.entries()).map(([code, libelle]) => ({ code, libelle }));
  }, [demandes]);

  // Demandes filtrées dynamiquement
  const demandesFiltrees = useMemo(() => {
    return demandes.filter((d) => {
      const u = d?.utilisateur_details || d?.utilisateur || {};

      // Exclure les annulées
      const st = String(d?.statut || "").toUpperCase();
      if (st.includes("ANNUL")) return false;

      // Filtre Année
      const dateRef = d.date_debut || d.date_creation;
      const anneeDemande = dateRef ? String(new Date(dateRef).getFullYear()) : "";
      if (anneeFiltre !== "TOUTES" && anneeDemande !== String(anneeFiltre)) return false;

      const srvId = String(
        u?.service?.id ?? u?.service ?? u?.service_details?.id ?? d?.service?.id ?? d?.service ?? ""
      );

      const srvTrouve = services.find((s) => String(s.id) === String(srvId));
      const divId = String(
        u?.service?.division?.id ??
        u?.service?.division ??
        u?.service_details?.division?.id ??
        u?.service_details?.division ??
        u?.division?.id ??
        u?.division ??
        d?.division?.id ??
        d?.division ??
        srvTrouve?.division?.id ??
        srvTrouve?.division ??
        srvTrouve?.division_id ??
        ""
      );

      const codeConge = String(
        d?.type_conge_code || d?.type_conge?.code || d?.type_conge || d?.type_conge_id || ""
      );

      if (divisionFiltre !== "TOUTES" && divId !== String(divisionFiltre)) return false;
      if (serviceFiltre !== "TOUS" && srvId !== String(serviceFiltre)) return false;
      if (typeCongeFiltre !== "TOUS" && codeConge !== String(typeCongeFiltre)) return false;

      return true;
    });
  }, [demandes, divisionFiltre, serviceFiltre, typeCongeFiltre, anneeFiltre, services]);

  // --- STATISTIQUES DES CONGÉS VALIDÉS PAR PÉRIODE ---
  const statsValideesParPeriode = useMemo(() => {
    const maintenant = new Date();
    const debutAujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

    // Calcul du début de la semaine actuelle (Lundi)
    const jourSemaine = maintenant.getDay();
    const diffLundi = jourSemaine === 0 ? 6 : jourSemaine - 1;
    const debutSemaine = new Date(debutAujourdhui);
    debutSemaine.setDate(debutAujourdhui.getDate() - diffLundi);

    // Début du mois et de l'année
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);

    let joursAujourdhui = 0;
    let joursSemaine = 0;
    let joursMois = 0;
    let joursAnnee = 0;

    demandesFiltrees.forEach((d) => {
      if (String(d.statut).toUpperCase() === "VALIDEE") {
        const dateRef = new Date(d.date_debut || d.date_creation);
        const nbJours = Number(d.nombre_jours || 0);

        if (dateRef >= debutAujourdhui) joursAujourdhui += nbJours;
        if (dateRef >= debutSemaine) joursSemaine += nbJours;
        if (dateRef >= debutMois) joursMois += nbJours;
        if (dateRef >= debutAnnee) joursAnnee += nbJours;
      }
    });

    return { joursAujourdhui, joursSemaine, joursMois, joursAnnee };
  }, [demandesFiltrees]);

  // Indicateurs clés globaux (KPIs)
  const statsKPI = useMemo(() => {
    const total = demandesFiltrees.length;
    const validees = demandesFiltrees.filter((d) => String(d.statut).toUpperCase() === "VALIDEE").length;
    const enAttente = demandesFiltrees.filter((d) => String(d.statut).toUpperCase().includes("ATTENTE")).length;
    const totalJours = demandesFiltrees.reduce((acc, d) => acc + Number(d.nombre_jours || 0), 0);
    const tauxApprobation = total > 0 ? Math.round((validees / total) * 100) : 0;

    return { total, validees, enAttente, totalJours, tauxApprobation };
  }, [demandesFiltrees]);

  // Répartition par type de congé
  const parType = useMemo(() => {
    const compte = {};
    demandesFiltrees.forEach((d) => {
      const nom = d.type_conge_libelle || d.type_conge_code || "Autre";
      compte[nom] = (compte[nom] ?? 0) + 1;
    });
    const totalDemandes = demandesFiltrees.length || 1;

    return Object.entries(compte).map(([nom, total], index) => ({
      nom,
      total,
      pourcentage: Math.round((total / totalDemandes) * 100),
      couleur: COULEURS_TYPES[index % COULEURS_TYPES.length],
    }));
  }, [demandesFiltrees]);

  // Évolution mensuelle
  const parMois = useMemo(() => {
    const compte = Array(12).fill(0);
    demandesFiltrees.forEach((d) => {
      const dateRef = d.date_debut || d.date_creation;
      if (dateRef) {
        const mois = new Date(dateRef).getMonth();
        if (mois >= 0 && mois < 12) compte[mois] += 1;
      }
    });
    return MOIS_COURTS.map((nom, i) => ({ nom, total: compte[i] }));
  }, [demandesFiltrees]);

  // Exportation PDF
  const exporterRapportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(60, 0, 56);
    doc.text("Rapport Analytique des Congés - IJAZA", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")} | Année : ${anneeFiltre}`, 14, 27);

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 239, 255);
    doc.line(14, 31, 196, 31);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Congés Validés par Période (en jours)", 14, 40);
    doc.setFontSize(10);
    doc.text(`• Aujourd'hui : ${statsValideesParPeriode.joursAujourdhui} jour(s)`, 20, 48);
    doc.text(`• Cette semaine : ${statsValideesParPeriode.joursSemaine} jour(s)`, 20, 55);
    doc.text(`• Ce mois-ci : ${statsValideesParPeriode.joursMois} jour(s)`, 20, 62);
    doc.text(`• Cette année : ${statsValideesParPeriode.joursAnnee} jour(s)`, 20, 69);

    doc.setFontSize(12);
    doc.text("2. Statistiques Générales", 14, 82);
    doc.setFontSize(10);
    doc.text(`• Total des demandes : ${statsKPI.total}`, 20, 90);
    doc.text(`• Taux d'approbation : ${statsKPI.tauxApprobation}%`, 20, 97);
    doc.text(`• En attente de validation : ${statsKPI.enAttente}`, 20, 104);

    doc.save(`Rapport_IJAZA_${anneeFiltre}.pdf`);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* En-tête */}
        <header className="flex flex-col gap-4 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Ressources Humaines</span>
              <span>·</span>
              <span className="text-[#93003f]">Gestion Centrale</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3c0038]">
              Rapports & Statistiques
            </h1>
          </div>

          <button
            onClick={exporterRapportPDF}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#93003f] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3c0038] cursor-pointer"
          >
            <Icone d={I.document} className="h-4 w-4" />
            Exporter en PDF
          </button>
        </header>

        {/* Barre de Filtres */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#00efff]/30 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#0097ff]">Année</label>
            <select
              value={anneeFiltre}
              onChange={(e) => setAnneeFiltre(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
            >
              <option value="2026">Année 2026</option>
              <option value="2025">Année 2025</option>
              <option value="TOUTES">Toutes les années</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#0097ff]">Division</label>
            <select
              value={divisionFiltre}
              onChange={(e) => {
                setDivisionFiltre(e.target.value);
                setServiceFiltre("TOUS");
              }}
              className="w-full rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
            >
              <option value="TOUTES">Toutes les Divisions ({divisions.length})</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.nom || div.libelle || `Division ${div.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#0097ff]">Service</label>
            <select
              value={serviceFiltre}
              onChange={(e) => setServiceFiltre(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
            >
              <option value="TOUS">Tous les Services ({servicesFiltres.length})</option>
              {servicesFiltres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom || s.libelle || `Service ${s.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-[#0097ff]">Type de Congé</label>
            <select
              value={typeCongeFiltre}
              onChange={(e) => setTypeCongeFiltre(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#e7ffff]/30 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-[#0097ff]"
            >
              {typesCongeDisponibles.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION DES CARTES DE CONGÉS VALIDÉS PAR PÉRIODE TEMPORELLE */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Jours de Congés Validés (Cumul temporis)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Validés Aujourd'hui</p>
                <p className="mt-1 text-2xl font-extrabold text-[#93003f]">
                  {statsValideesParPeriode.joursAujourdhui} <span className="text-sm font-normal">j</span>
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#93003f]">
                <Icone d={I.horloge} className="h-5 w-5" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Cette Semaine</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0097ff]">
                  {statsValideesParPeriode.joursSemaine} <span className="text-sm font-normal">j</span>
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
                <Icone d={I.calendrier} className="h-5 w-5" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Ce Mois-ci</p>
                <p className="mt-1 text-2xl font-extrabold text-[#3c0038]">
                  {statsValideesParPeriode.joursMois} <span className="text-sm font-normal">j</span>
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#3c0038]">
                <Icone d={I.document} className="h-5 w-5" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Cette Année ({anneeFiltre})</p>
                <p className="mt-1 text-2xl font-extrabold text-[#10b981]">
                  {statsValideesParPeriode.joursAnnee} <span className="text-sm font-normal">j</span>
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#10b981]">
                <Icone d={I.etincelle} className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        {/* INDICATEURS GLOBAUX DU TABLEAU DE BORD */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Demandes</p>
            <p className="mt-1 text-2xl font-black text-[#3c0038]">{statsKPI.total}</p>
          </div>

          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Taux d'Approbation</p>
            <p className="mt-1 text-2xl font-black text-[#93003f]">{statsKPI.tauxApprobation}%</p>
          </div>

          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">En Attente Global</p>
            <p className="mt-1 text-2xl font-black text-[#0097ff]">{statsKPI.enAttente}</p>
          </div>

          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Jours Absents Cumulés</p>
            <p className="mt-1 text-2xl font-black text-[#3c0038]">{statsKPI.totalJours} j</p>
          </div>
        </div>

        {/* GRAPHIQUES ET DIACRAMMES AVEC LÉGENDE DE COULEURS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Histogramme des motifs */}
          <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold text-[#3c0038]">Congés par Type</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={parType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nom" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderColor: "#00efff",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="#93003f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Diagramme Circulaire (Donut Chart) + Légende des Couleurs */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-[#3c0038]">Répartition par Type</h2>
            
            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={parType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="total"
                  >
                    {parType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.couleur} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* LÉGENDE DE COULEURS CLAIRE ET DÉTAILLÉE */}
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {parType.map((item) => (
                <div key={item.nom} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.couleur }}
                    />
                    <span className="font-medium text-slate-700">{item.nom}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {item.total} ({item.pourcentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique de l'évolution mensuelle */}
        <div className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-[#3c0038]">
            Évolution mensuelle des demandes ({anneeFiltre})
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={parMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nom" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderColor: "#00efff",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0097ff"
                strokeWidth={3}
                dot={{ r: 4, fill: "#93003f" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MainLayout>
  );
}