from django.db import models
from django.conf import settings


class Division(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    # Responsable de division
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='divisions_gerees'
    )

    def __str__(self):
        return self.nom


class Service(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    division = models.ForeignKey(
        Division, 
        on_delete=models.CASCADE, 
        related_name='services'
    )
    # Chef de service
    chef = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='services_geres'
    )

    def __str__(self):
        return f"{self.nom} ({self.division.nom})"