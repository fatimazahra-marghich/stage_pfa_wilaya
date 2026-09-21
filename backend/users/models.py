from django.contrib.auth.models import AbstractUser
from django.db import models
from organisation.models import Service  # ✅ On importe Service au lieu de Bureau


class Utilisateur(AbstractUser):
    ROLE_CHOICES = (
        ('EMPLOYE', 'Employé'),
        ('CHEF_SERVICE', 'Chef de Service'),
        ('RH', 'Ressources Humaines'),        # ✅ Gestion opérationnelle (Congés, Soldes)
        ('ADMIN', 'Administrateur Système'), # ✅ Gestion de la structure, types & personnel
    )

    # ✅ 'blank=True' permet d'autoriser la création sans matricule explicite
    matricule = models.CharField(max_length=50, unique=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYE')
    poste = models.CharField(max_length=100, blank=True, null=True)
    
    # ✅ Remplacement de bureau par service :
    service = models.ForeignKey(
        Service, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='agents'
    )
    
    pelerinage_utilise = models.BooleanField(default=False)

    # ✅ Génération automatique du matricule avant enregistrement en base
    def save(self, *args, **kwargs):
        if not self.matricule:
            last_user = Utilisateur.objects.order_by('-id').first()
            next_id = (last_user.id + 1) if last_user else 1
            self.matricule = f"EMP-{next_id:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nom_complet} ({self.matricule})"

    @property
    def nom_complet(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username