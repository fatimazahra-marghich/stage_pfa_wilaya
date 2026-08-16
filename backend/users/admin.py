from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur

@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Wilaya', {'fields': ('matricule', 'role', 'poste', 'bureau', 'pelerinage_utilise')}),
    )
    list_display = ('username', 'nom_complet', 'matricule', 'role', 'bureau')
# Register your models here.
