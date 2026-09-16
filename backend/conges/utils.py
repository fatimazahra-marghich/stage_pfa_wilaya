from datetime import timedelta
from .models import JourFerie

def calculer_jours_ouvrables(date_debut, date_fin):
    """
    Calcule le nombre de jours ouvrables réels entre date_debut et date_fin inclus,
    en excluant les samedis (5), dimanches (6) et les jours fériés de la BDD.
    """
    if not date_debut or not date_fin or date_debut > date_fin:
        return 0.0

    total_jours = 0
    date_courante = date_debut

    # Récupérer les jours fériés qui chevauchent la période
    feries_queryset = JourFerie.objects.filter(
        date_debut__lte=date_fin,
        date_fin__gte=date_debut
    )

    # Créer un ensemble (set) de toutes les dates individuelles fériées
    dates_feriees = set()
    for f in feries_queryset:
        d = f.date_debut
        while d <= f.date_fin:
            dates_feriees.add(d)
            d += timedelta(days=1)

    # Décompte jour par jour
    while date_courante <= date_fin:
        est_weekend = date_courante.weekday() in [5, 6]  # 5 = Samedi, 6 = Dimanche
        est_ferie = date_courante in dates_feriees

        if not est_weekend and not est_ferie:
            total_jours += 1

        date_courante += timedelta(days=1)

    return float(total_jours)