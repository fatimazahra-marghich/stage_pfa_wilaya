from datetime import datetime, date, timedelta
from django.db.models import Q
from .models import JourFerie

def calculer_jours_ouvrables(date_debut, date_fin, type_conge=None):
    if not date_debut or not date_fin:
        return 0.0

    if isinstance(date_debut, str):
        date_debut = datetime.strptime(date_debut, "%Y-%m-%d").date()
    elif isinstance(date_debut, datetime):
        date_debut = date_debut.date()

    if isinstance(date_fin, str):
        date_fin = datetime.strptime(date_fin, "%Y-%m-%d").date()
    elif isinstance(date_fin, datetime):
        date_fin = date_fin.date()

    if date_debut > date_fin:
        return 0.0

    libelle = getattr(type_conge, 'libelle', '').lower().strip() if type_conge else ''
    est_conge_annuel = ('annuel' in libelle or 'administratif' in libelle)

    # Si ce n'est PAS un congé annuel (ex: Maladie, Maternité, Familial, Hajj),
    # on compte la totalité des jours calendaires consécutifs.
    if not est_conge_annuel:
        nb_jours = (date_fin - date_debut).days + 1
        return float(nb_jours)

    # Pour le congé Annuel / Administratif : Exclure samedis, dimanches et jours fériés
    total_jours = 0
    date_courante = date_debut

    feries_queryset = JourFerie.objects.filter(
        Q(date_debut__lte=date_fin, date_fin__gte=date_debut) | Q(est_recurrent=True)
    )

    dates_feriees = set()
    for f in feries_queryset:
        d = f.date_debut
        if isinstance(d, datetime):
            d = d.date()
        f_fin = f.date_fin.date() if isinstance(f.date_fin, datetime) else f.date_fin

        while d <= f_fin:
            if getattr(f, 'est_recurrent', False):
                dates_feriees.add((d.month, d.day))
            else:
                dates_feriees.add(d)
            d += timedelta(days=1)

    while date_courante <= date_fin:
        est_weekend = date_courante.weekday() in [5, 6]
        est_ferie = (
            date_courante in dates_feriees or 
            (date_courante.month, date_courante.day) in dates_feriees
        )

        if not est_weekend and not est_ferie:
            total_jours += 1

        date_courante += timedelta(days=1)

    return float(total_jours)