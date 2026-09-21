from datetime import date
from django.contrib.auth import get_user_model
from .models import SoldeConge

User = get_user_model()

def initialiser_soldes_nouvelle_annee():
    """
    À exécuter chaque 1er Janvier :
    - Récupère le reliquat exact de l'année précédente N-1
    - Applique 22 jours pour la nouvelle année
    - Réinitialise les consommations à 0
    """
    annee_actuelle = date.today().year
    annee_precedente = annee_actuelle - 1
    
    utilisateurs = User.objects.filter(is_active=True)

    for user in utilisateurs:
        solde_precedent = SoldeConge.objects.filter(utilisateur=user, annee=annee_precedente).first()
        
        reliquat_n_minus_1 = 0.0
        if solde_precedent:
            reliquat_n_minus_1 = max(0.0, solde_precedent.solde_actuel)

        SoldeConge.objects.update_or_create(
            utilisateur=user,
            annee=annee_actuelle,
            defaults={
                'droits_acquis': 22.0,
                'jours_reportes': reliquat_n_minus_1,
                'jours_consommes': 0.0
            }
        )