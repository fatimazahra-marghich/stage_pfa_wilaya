from django.contrib.auth.models import AbstractUser
from django.db import models
from organisation.models import Bureau

class Utilisateur(AbstractUser):
    ROLE_CHOICES = (
        ('EMPLOYE', 'Employé'),
        ('CHEF_SERVICE', 'Chef de Service'),
        ('ADMIN_RH', 'Administrateur RH'),
    )

    matricule = models.CharField(max_length=50, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYE')
    poste = models.CharField(max_length=100, blank=True, null=True)
    bureau = models.ForeignKey(Bureau, on_delete=models.SET_NULL, null=True, blank=True, related_name='agents')
    pelerinage_utilise = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nom_complet} ({self.matricule})"

    @property
    def nom_complet(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

# Create your models here.
