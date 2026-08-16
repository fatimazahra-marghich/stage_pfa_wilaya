from django.db import models

class Division(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nom

class Service(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    division = models.ForeignKey(Division, on_delete=models.CASCADE, related_name='services')

    def __str__(self):
        return f"{self.nom} ({self.division.nom})"

class Bureau(models.Model):
    nom = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='bureaux')

    def __str__(self):
        return f"{self.nom} ({self.service.nom})"

# Create your models here.
