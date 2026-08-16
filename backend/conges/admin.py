from django.contrib import admin
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation

admin.site.register(TypeConge)
admin.site.register(SoldeConge)
admin.site.register(JourFerie)
admin.site.register(DemandeConge)
admin.site.register(EtapeValidation)
# Register your models here.
