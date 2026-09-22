from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import TypeConge, SoldeConge, DemandeConge

User = get_user_model()

class ReglesBusinessTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="agent1", 
            password="Password123!",
            a_fait_pelerinage=False
        )
        self.client.force_authenticate(user=self.user)

        # Création des Types de congés
        self.type_annuel = TypeConge.objects.create(libelle="Congé Annuel", decompte_solde=True)
        self.type_hajj = TypeConge.objects.create(libelle="Congé Pèlerinage (Hajj)")
        self.type_exceptionnel = TypeConge.objects.create(libelle="Congé Exceptionnel")

        # Solde initial : 22 jours
        self.solde = SoldeConge.objects.create(
            utilisateur=self.user,
            annee=date.today().year,
            droits_acquis=22,
            jours_consommes=0
        )

    def test_blocage_solde_annuel_avec_demandes_en_attente(self):
        """Vérifie qu'une demande en attente bloque le solde pour la suivante"""
        # Demande 1 : 15 jours (statut EN_ATTENTE_CHEF)
        DemandeConge.objects.create(
            utilisateur=self.user,
            type_conge=self.type_annuel,
            date_debut=date(2026, 6, 1),
            date_fin=date(2026, 6, 15),
            nombre_jours=15,
            statut="EN_ATTENTE_CHEF"
        )

        # Demande 2 : Tente de poser 10 jours (15 + 10 = 25 > 22 jours disponibles)
        response = self.client.post("/api/demandes/", {
            "type_conge": self.type_annuel.id,
            "date_debut": "2026-07-01",
            "date_fin": "2026-07-10",
            "motif": "Test dépassement solde"
        })

        # Doit être rejeté (400 Bad Request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Solde insuffisant", str(response.data))

    def test_blocage_deuxieme_pelerinage(self):
        """Vérifie le blocage si l'utilisateur a déjà effectué le Hajj"""
        self.user.a_fait_pelerinage = True
        self.user.save()

        response = self.client.post("/api/demandes/", {
            "type_conge": self.type_hajj.id,
            "date_debut": "2026-08-01",
            "date_fin": "2026-09-30",
            "motif": "Départ Hajj"
        })

        self.assertEqual(response.status_code, 400)

    def test_plafond_conge_exceptionnel_10_jours(self):
        """Vérifie le blocage si le cumul des congés exceptionnels dépasse 10 jours"""
        # Déjà 8 jours consommés/demandés
        DemandeConge.objects.create(
            utilisateur=self.user,
            type_conge=self.type_exceptionnel,
            date_debut=date(2026, 3, 1),
            date_fin=date(2026, 3, 8),
            nombre_jours=8,
            statut="VALIDEE"
        )

        # Nouvelle demande de 4 jours (8 + 4 = 12 > 10 jours)
        response = self.client.post("/api/demandes/", {
            "type_conge": self.type_exceptionnel.id,
            "date_debut": "2026-05-01",
            "date_fin": "2026-05-04",
            "motif": "Raison familiale exceptionnelle"
        })

        self.assertEqual(response.status_code, 400)