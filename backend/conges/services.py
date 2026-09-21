from datetime import timedelta
from .models import JourFerie, DemandeConge, SoldeConge

def calculer_jours_ouvrables(date_debut, date_fin):
    """
    Calcule les jours réels en excluant :
    - Les Samedis (5) et Dimanches (6)
    - Les Jours Fériés définis dans le modèle JourFerie
    """
    feries = JourFerie.objects.filter(
        date_debut__lte=date_fin,
        date_fin__gte=date_debut
    )
    
    dates_feriees = set()
    for f in feries:
        curr = f.date_debut
        while curr <= f.date_fin:
            dates_feriees.add(curr)
            curr += timedelta(days=1)

    jours_comptes = 0
    date_courante = date_debut

    while date_courante <= date_fin:
        if date_courante.weekday() < 5 and date_courante not in dates_feriees:
            jours_comptes += 1
        date_courante += timedelta(days=1)

    return jours_comptes


def traiter_validation_finale(demande: DemandeConge):
    """
    Décompte le solde uniquement s'il s'agit d'un Congé Administratif (Annuel).
    """
    libelle = demande.type_conge.libelle.lower()
    if libelle.startswith('administratif') or libelle.startswith('annuel'):
        solde_obj = SoldeConge.objects.filter(
            utilisateur=demande.utilisateur, 
            annee=demande.date_debut.year
        ).first()

        if solde_obj:
            solde_obj.jours_consommes += demande.nombre_jours
            solde_obj.save()