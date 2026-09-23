from django.contrib.auth.models import AbstractUser
from django.db import models
from organisation.models import Service


class Utilisateur(AbstractUser):
    ROLE_CHOICES = (
        ('EMPLOYE', 'Employé'),
        ('CHEF_SERVICE', 'Chef de Service'),
        ('RH', 'Ressources Humaines'),
        ('ADMIN', 'Administrateur Système'),
    )

    matricule = models.CharField(max_length=50, unique=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYE')
    poste = models.CharField(max_length=100, blank=True, null=True)
    
    service = models.ForeignKey(
        Service, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='agents'
    )
    
    pelerinage_utilise = models.BooleanField(default=False)

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

    @property
    def est_rh_general(self):
        """
        Détermine si l'utilisateur est LE Chef du Service RH (RH Général).
        """
        if not self.service:
            return False
        
        code_service = str(getattr(self.service, 'code', '') or '').upper()
        # Est considéré RH Général s'il est désigné comme chef du service RH
        is_chef_du_service = (self.service.chef_id == self.id)
        is_service_rh = (code_service == 'RH' or 'RH' in code_service)

        return is_service_rh and is_chef_du_service