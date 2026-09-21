from rest_framework import serializers
from .models import Utilisateur
from organisation.serializers import ServiceSerializer
from conges.models import SoldeConge
from datetime import date


class UtilisateurSerializer(serializers.ModelSerializer):
    # Détails du service rattaché (Lecture seule)
    service_details = ServiceSerializer(source='service', read_only=True)
    
    # Champs calculés pour le frontend React
    solde_actuel = serializers.SerializerMethodField()
    service_nom = serializers.SerializerMethodField()
    division_nom = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'nom_complet', 'matricule', 'role', 'poste', 'password',
            'service', 'service_details', 'pelerinage_utilise',
            'solde_actuel', 'service_nom', 'division_nom', 'is_active'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False},  # Généré automatiquement si absent
            'matricule': {'required': False, 'allow_blank': True}  # ✅ Permet à l'API de créer sans matricule
        }

    def get_solde_actuel(self, obj):
        # Récupère le solde de l'année en cours
        annee_courante = date.today().year
        solde = SoldeConge.objects.filter(utilisateur=obj, annee=annee_courante).first()
        if not solde:
            # Fallback sur le dernier solde enregistré si l'année en cours n'existe pas encore
            solde = SoldeConge.objects.filter(utilisateur=obj).last()
        return getattr(solde, 'solde_actuel', 0) if solde else 0

    def get_service_nom(self, obj):
        if obj.service:
            return getattr(obj.service, 'nom', str(obj.service))
        return '-'

    def get_division_nom(self, obj):
        if obj.service and hasattr(obj.service, 'division') and obj.service.division:
            return getattr(obj.service.division, 'nom', str(obj.service.division))
        return '-'

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        
        # Si username n'est pas envoyé par React, on utilise la partie locale de l'email
        if not validated_data.get('username') and validated_data.get('email'):
            validated_data['username'] = validated_data['email'].split('@')[0]

        utilisateur = super().create(validated_data)

        # Hachage sécurisé du mot de passe
        if password:
            utilisateur.set_password(password)
            utilisateur.save()

        return utilisateur

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Mise à jour des autres champs (incluant 'service')
        utilisateur = super().update(instance, validated_data)

        # Si un nouveau mot de passe est fourni, on le hache
        if password:
            utilisateur.set_password(password)
            utilisateur.save()

        return utilisateur