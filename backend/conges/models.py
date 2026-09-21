from django.db import models
from django.conf import settings

class TypeConge(models.Model):
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    libelle = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    duree_max = models.PositiveIntegerField(default=22)
    justificatif_requis = models.BooleanField(default=False)
    type_justificatif = models.CharField(
        max_length=200, 
        blank=True, 
        null=True, 
        help_text="Ex: Certificat médical, Acte de naissance, Acte de mariage..."
    )

    def __str__(self):
        return self.libelle

class SoldeConge(models.Model):
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='soldes')
    annee = models.IntegerField()
    droits_acquis = models.FloatField(default=22.0)
    jours_reportes = models.FloatField(default=0.0)
    jours_consommes = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('utilisateur', 'annee')

    @property
    def solde_actuel(self):
        return (self.droits_acquis + self.jours_reportes) - self.jours_consommes

    def __str__(self):
        return f"Solde {self.annee} - {self.utilisateur.username}: {self.solde_actuel} j"

class JourFerie(models.Model):
    nom = models.CharField(max_length=100)
    date_debut = models.DateField()
    date_fin = models.DateField()
    annee = models.IntegerField()
    est_recurrent = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nom} ({self.date_debut} au {self.date_fin})"

class DemandeConge(models.Model):
    STATUT_CHOICES = (
        ('EN_ATTENTE_CHEF', 'En attente Chef de Service'),
        ('REFUSEE_CHEF', 'Refusée par le Chef'),
        ('EN_ATTENTE_SANTE', 'En attente avis Conseil de Santé'),
        ('EN_ATTENTE_RH', 'En attente Administration RH'),
        ('REFUSEE_RH', 'Refusée par RH'),
        ('VALIDEE', 'Validée définitivement'),
        ('ANNULEE', 'Annulée par l\'employé'),
    )

    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='demandes')
    type_conge = models.ForeignKey(TypeConge, on_delete=models.PROTECT)
    date_debut = models.DateField()
    date_fin = models.DateField()
    nombre_jours = models.FloatField()
    motif = models.TextField()
    piece_jointe = models.FileField(upload_to='justificatifs/', blank=True, null=True)
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='EN_ATTENTE_CHEF')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Demande #{self.id} - {self.utilisateur.username} ({self.statut})"

class EtapeValidation(models.Model):
    demande = models.ForeignKey(DemandeConge, on_delete=models.CASCADE, related_name='etapes')
    validateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    role_validateur = models.CharField(max_length=30)
    decision = models.CharField(max_length=20)
    commentaire = models.TextField(blank=True)
    date_decision = models.DateTimeField(auto_now_add=True)
class CorrectionSolde(models.Model):
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='corrections_recues')
    solde_conge = models.ForeignKey(SoldeConge, on_delete=models.SET_NULL, null=True, blank=True, related_name='corrections')
    annee = models.IntegerField()
    nouveau_solde = models.FloatField()
    motif = models.TextField()
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='corrections_effectuees')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Correction #{self.id} - {self.utilisateur.username} ({self.nouveau_solde} j)"