import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";
import { Icone, I } from "../../components/icons";

export default function NewRequest() {
  const [types, setTypes] = useState([]);
  const [soldes, setSoldes] = useState(null);
  const [demandesExistantes, setDemandesExistantes] = useState([]);
  const [joursFeries, setJoursFeries] = useState([]);

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

  // Récupération des infos de l'utilisateur connecté
  const userStored = JSON.parse(
    localStorage.getItem("ijaza_user") || localStorage.getItem("user") || "{}"
  );

  useEffect(() => {
    api
      .get("/types-conge/")
      .then((res) => {
        const rawData = res.data;
        const listeTypes = Array.isArray(rawData) ? rawData : rawData?.results || [];
        setTypes(listeTypes);
      })
      .catch((err) => {
        console.error("Erreur sur /types-conge/ :", err.response || err);
      });

    api
      .get("/soldes/")
      .then((res) => {
        const raw = res.data;
        const soldeExtrait = Array.isArray(raw) ? raw[0] : raw?.results?.[0] ?? raw;
        setSoldes(soldeExtrait ?? null);
      })
      .catch((err) => console.warn("Erreur /soldes/ :", err.response?.status));

    api
      .get("/demandes/mes-demandes/")
      .then((res) => setDemandesExistantes(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch((err) => console.warn("Erreur /demandes/mes-demandes/ :", err.response?.status));

    api
      .get("/jours-feries/")
      .then((res) => setJoursFeries(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch((err) => console.warn("Erreur /jours-feries/ :", err.response?.status));
  }, []);

  function update(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  const selectedTypeObj = types.find((t) => String(t.id) === String(form.type_conge));

  const codeType = String(selectedTypeObj?.code || "").toUpperCase().trim();
  const libelleTypeBrut = String(selectedTypeObj?.libelle || selectedTypeObj?.nom || "").toLowerCase();
  const libelleType = libelleTypeBrut.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Détections spécifiques
  const estMaladie = (codeType.includes("MALADIE") || libelleType.includes("maladie")) && !libelleType.includes("exceptionnel");
  const estPelerinage = codeType.includes("HAJJ") || codeType.includes("PELERINAGE") || libelleType.includes("pelerinage") || libelleType.includes("hajj");
  const estExceptionnel = codeType.includes("EXCEPT") || libelleType.includes("exceptionnel") || libelleType.includes("familial");
  const estPaternite = codeType.includes("PATERNITE") || libelleType.includes("paternite");
  const estMaternite = codeType.includes("MATERNITE") || libelleType.includes("maternite");

  const obtenirDureeMaxAffichage = () => {
    if (estPelerinage) return "60 jour(s)";
    if (estPaternite) return "15 jour(s) max (Réforme 2022)";
    if (estMaternite) return "98 jour(s) max (14 semaines)";
    if (estExceptionnel) return "10 jour(s) max par an";
    if (estMaladie) return "Variable selon certificat";
    if (selectedTypeObj?.duree_max) return `${selectedTypeObj.duree_max} jour(s)`;
    return "Pas de limite fixe";
  };

  const necessitePiece =
    Boolean(selectedTypeObj?.justificatif_requis) ||
    Boolean(selectedTypeObj?.necessite_piece_jointe) ||
    estMaladie ||
    estPaternite ||
    estMaternite;

  const calculerNombreJours = () => {
    if (!form.date_debut || !form.date_fin) return 0;

    const [y1, m1, d1] = form.date_debut.split("-").map(Number);
    const [y2, m2, d2] = form.date_fin.split("-").map(Number);

    let curDate = new Date(y1, m1 - 1, d1);
    const endDate = new Date(y2, m2 - 1, d2);

    if (endDate < curDate) return 0;

    const estCongeAnnuel = codeType.includes("ANNUEL") || codeType.includes("ADMINISTRATIF") || libelleType.includes("annuel") || libelleType.includes("administratif");

    if (!estCongeAnnuel) {
      const diffTime = endDate.getTime() - curDate.getTime();
      return Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    }

    let count = 0;
    while (curDate <= endDate) {
      const day = curDate.getDay();
      const isWeekend = day === 0 || day === 6;

      const isoDate = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;

      const isFerie = joursFeries.some((f) => {
        const dDebut = f.date_debut || f.date;
        const dFin = f.date_fin || dDebut;

        if (!dDebut) return false;

        if (f.est_recurrent) {
          const mmdd = isoDate.slice(5);
          return mmdd >= dDebut.slice(5) && mmdd <= dFin.slice(5);
        }
        return isoDate >= dDebut && isoDate <= dFin;
      });

      if (!isWeekend && !isFerie) {
        count++;
      }

      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const nbJours = calculerNombreJours();

  const verifierChevauchement = (debut, fin) => {
    if (!debut || !fin || !Array.isArray(demandesExistantes)) return false;

    const parseDateLocal = (dateStr) => {
      const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const dNouveauDebut = parseDateLocal(debut);
    const dNouveauFin = parseDateLocal(fin);

    return demandesExistantes.some((d) => {
      const statutRaw = String(d.statut || "").toUpperCase().trim();
      const statutClean = statutRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const estIgnore =
        statutClean.includes("ANNUL") ||
        statutClean.includes("REFUS") ||
        statutClean.includes("CANCEL") ||
        statutClean.includes("REJECT");

      if (estIgnore) return false;

      const dExisteDebut = parseDateLocal(d.date_debut);
      const dExisteFin = parseDateLocal(d.date_fin);

      return dNouveauDebut <= dExisteFin && dNouveauFin >= dExisteDebut;
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");

    const aujourdhui = new Date().toISOString().split("T")[0];

    if (!form.type_conge) {
      setErreur("Veuillez sélectionner un type de congé.");
      return;
    }

    if (new Date(form.date_fin) < new Date(form.date_debut)) {
      setErreur("La date de fin doit être égale ou supérieure à la date de début.");
      return;
    }

    if (nbJours === 0) {
      setErreur("La période sélectionnée ne contient aucun jour. Impossible d'envoyer la demande.");
      return;
    }

    if (estPaternite && nbJours > 15) {
      setErreur("Le congé de paternité est limité à 15 jours consécutifs.");
      return;
    }

    if (estMaternite && nbJours > 98) {
      setErreur("Le congé de maternité est limité à 98 jours (14 semaines).");
      return;
    }

    if (estPelerinage && nbJours > 60) {
      setErreur("Le congé de pèlerinage est limité à 60 jours.");
      return;
    }

    if (!estMaladie && form.date_debut < aujourdhui) {
      setErreur("Vous ne pouvez pas poser une demande de congé sur une date déjà passée.");
      return;
    }

    if (verifierChevauchement(form.date_debut, form.date_fin)) {
      setErreur("Vous avez déjà une demande en cours ou validée qui chevauche ces dates.");
      return;
    }

    const soldeDisponible = soldes ? Number(soldes.solde_actuel || 0) : 0;
    const deconteDuSolde = selectedTypeObj?.decompte_solde ?? (codeType.includes("ANNUEL") || libelleType.includes("annuel"));

    if (deconteDuSolde && !estMaladie && nbJours > soldeDisponible) {
      setErreur(
        `Solde insuffisant. Vous demandez ${nbJours} jour(s) alors que votre solde disponible est de ${soldeDisponible} jour(s).`
      );
      return;
    }

    if (necessitePiece && !pieceJointe) {
      setErreur("Un justificatif (acte de naissance, certificat médical ou autre) est obligatoire pour ce motif.");
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

      const roleUpper = String(userStored?.role || "").toUpperCase();
      const codeService = String(
        userStored?.service_details?.code || userStored?.service_nom || ""
      ).toUpperCase();
      const estRH =
        roleUpper.includes("RH") ||
        roleUpper.includes("ADMIN") ||
        codeService === "RH" ||
        userStored?.est_rh_general === true ||
        userStored?.is_superuser === true;

      // Si l'utilisateur est RH, la demande est marquée VALIDEE directement à l'envoi
      if (estRH) {
        formData.append("statut", "VALIDEE");
      }

      if (pieceJointe instanceof File) {
        formData.append("piece_jointe", pieceJointe);
      }

      await api.post("/demandes/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Redirection adaptée selon le rôle de l'utilisateur
      if (estRH) {
        navigate("/rh");
      } else if (roleUpper.includes("CHEF")) {
        navigate("/chef");
      } else {
        navigate("/employe");
      }
    } catch (err) {
      console.error("Détails de l'erreur :", err.response?.data || err);
      const backendError = err.response?.data;
      if (typeof backendError === "object" && backendError !== null) {
        const messages = Object.entries(backendError)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(" ") : val}`)
          .join(" | ");
        setErreur(messages);
      } else {
        setErreur("Impossible d'envoyer la demande. Vérifiez vos données et réessayez.");
      }
    } finally {
      setEnvoi(false);
    }
  }

  const champ =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#3c0038] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0097ff] focus:ring-2 focus:ring-[#00efff]/40";
  const label =
    "mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0097ff]";

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
            Nouvelle demande d'absence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Saisissez votre demande. Les contrôles de dates et de réglementations sont effectués automatiquement.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className={label}>1. Type de congé</label>
            <select
              value={form.type_conge}
              onChange={(e) => update("type_conge", e.target.value)}
              required
              className={champ}
            >
              <option value="">Sélectionnez un type</option>
              {types && types.length > 0 ? (
                types.map((t) => {
                  let nomAffiche = t.libelle || t.nom || t.nom_type || t.intitule || `Type ${t.id}`;
                  
                  if (nomAffiche.toLowerCase().includes("exceptionnel") && nomAffiche.toLowerCase().includes("maladie")) {
                    nomAffiche = "Congé Exceptionnel / Familial";
                  }

                  return (
                    <option key={t.id} value={String(t.id)}>
                      {nomAffiche}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>
                  Aucun type disponible
                </option>
              )}
            </select>
          </div>

          {selectedTypeObj && (
            <div className="rounded-xl border border-[#00efff]/30 bg-[#e7ffff]/30 p-4 text-xs space-y-2">
              <p className="font-bold text-[#0097ff] flex items-center gap-1.5">
                <Icone d={I.etincelle} className="h-4 w-4" />
                Règles applicables pour ce motif :
              </p>
              <div className="grid grid-cols-2 gap-2 text-[#3c0038] pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold">Durée maximale autorisée :</span>
                  <span className="font-bold">{obtenirDureeMaxAffichage()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Document justificatif :</span>
                  <span className="font-bold">
                    {selectedTypeObj.type_justificatif ||
                      (necessitePiece ? "Justificatif obligatoire" : "Aucun justificatif requis")}
                  </span>
                </div>
              </div>

              {estMaladie && (
                <p className="text-[11px] text-slate-500 border-t border-[#00efff]/20 pt-2 mt-1">
                  💡 <b>Congé Maladie :</b> Validé automatiquement dès l'envoi du certificat médical.
                </p>
              )}
              {estPaternite && (
                <p className="text-[11px] text-slate-500 border-t border-[#00efff]/20 pt-2 mt-1">
                  💡 <b>Congé Paternité :</b> Accordé pour chaque naissance (15 jours consécutifs rémunérés).
                </p>
              )}
              {estMaternite && (
                <p className="text-[11px] text-slate-500 border-t border-[#00efff]/20 pt-2 mt-1">
                  💡 <b>Congé Maternité :</b> Accordé pour chaque grossesse (14 semaines / 98 jours).
                </p>
              )}
              {estPelerinage && (
                <p className="text-[11px] text-slate-500 border-t border-[#00efff]/20 pt-2 mt-1">
                  💡 <b>Pèlerinage au Hajj :</b> Accordé une seule fois durant toute la carrière de l'agent (Plafond de 60 jours).
                </p>
              )}
              {estExceptionnel && (
                <p className="text-[11px] text-slate-500 border-t border-[#00efff]/20 pt-2 mt-1">
                  💡 <b>Congé Exceptionnel / Familial :</b> Plafond de 10 jours par an (Mariage, Décès, etc.).
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={label}>2. Date de début</label>
              <input
                type="date"
                value={form.date_debut}
                onChange={(e) => update("date_debut", e.target.value)}
                required
                className={champ}
              />
            </div>
            <div>
              <label className={label}>Date de fin</label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => update("date_fin", e.target.value)}
                required
                className={champ}
              />
            </div>
          </div>

          {nbJours >= 0 && form.date_debut && form.date_fin && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-[#00efff]/30 bg-[#e7ffff]/40 px-4 py-3 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <Icone d={I.horloge} className="h-4 w-4 text-[#0097ff]" />
                  Durée calculée
                </span>
                <span className={`text-sm font-bold ${nbJours === 0 ? "text-rose-600" : "text-[#93003f]"}`}>
                  {nbJours} jour{nbJours > 1 ? "s" : ""}
                </span>
              </div>

              {estMaladie && nbJours > 4 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  <Icone d={I.alerte} className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold">Contre-visite médicale réglementaire</p>
                    <p className="text-[11px] font-normal text-amber-700">
                      Ce congé maladie dépasse 4 jours. Il sera validé automatiquement, mais fait l'objet d'un suivi RH avec possibilité de mandat d'un médecin conseil.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={label}>3. Motif</label>
            <textarea
              value={form.motif}
              onChange={(e) => update("motif", e.target.value)}
              rows={3}
              required
              placeholder="Précisez le motif de votre absence..."
              className={champ}
            />
          </div>

          <div>
            <label className={label}>
              4. Pièce jointe{" "}
              {necessitePiece && <span className="text-[#93003f]">* obligatoire</span>}
            </label>
            <div className="rounded-xl border-2 border-dashed border-[#00efff]/50 bg-[#e7ffff]/30 p-5 text-center transition-colors hover:border-[#0097ff]">
              <input
                type="file"
                id="file-input"
                onChange={(e) => setPieceJointe(e.target.files[0] || null)}
                className="hidden"
              />
              <label htmlFor="file-input" className="block cursor-pointer space-y-2">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-[#0097ff] shadow-sm">
                  <Icone d={pieceJointe ? I.document : I.televerser} className="h-5 w-5" />
                </span>
                <span className="block text-xs font-bold text-[#3c0038]">
                  {pieceJointe ? pieceJointe.name : "Cliquez pour téléverser le document"}
                </span>
                <span className="block text-[10px] text-slate-400">
                  Formats acceptés : PDF, PNG, JPG (max 5 Mo)
                </span>
              </label>
            </div>
          </div>

          {erreur && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              <Icone d={I.alerte} className="mt-0.5 h-4 w-4 shrink-0" />
              {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-xl bg-[#93003f] py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#3c0038] disabled:opacity-50 cursor-pointer"
          >
            {envoi ? "Validation et envoi..." : "Soumettre la demande"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}