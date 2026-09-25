from rest_framework import serializers
from .models import Utilisateur
from organisation.serializers import ServiceSerializer
from conges.models import SoldeConge
from datetime import date


class UtilisateurSerializer(serializers.ModelSerializer):
    # Détails du service rattaché (Lecture seule)
    service_details = ServiceSerializer(source='service', read_only=True)

    # Champ d'écriture optionnel pour recevoir le solde de congé envoyé par React
    solde_conge = serializers.FloatField(write_only=True, required=False, default=22.0)
    
    # Champs calculés pour le frontend React (Lecture)
    solde_actuel = serializers.SerializerMethodField()
    service_nom = serializers.SerializerMethodField()
    division_nom = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'nom_complet', 'matricule', 'role', 'poste', 'password',
            'service', 'service_details', 'pelerinage_utilise',
            'solde_conge', 'solde_actuel', 'service_nom', 'division_nom', 'is_active'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False},
            'matricule': {'required': False, 'allow_blank': True},
            'service': {'required': False, 'allow_null': True}
        }

    def get_solde_actuel(self, obj):
        annee_courante = date.today().year
        solde = SoldeConge.objects.filter(utilisateur=obj, annee=annee_courante).first()
        if not solde:
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
        solde_initial = validated_data.pop('solde_conge', 22.0)
        
        if not validated_data.get('username') and validated_data.get('email'):
            validated_data['username'] = validated_data['email'].split('@')[0]

        utilisateur = super().create(validated_data)

        if password:
            utilisateur.set_password(password)
            utilisateur.save()

        # Création automatique du solde pour l'année en cours
        annee_courante = date.today().year
        SoldeConge.objects.update_or_create(
            utilisateur=utilisateur,
            annee=annee_courante,
            defaults={'droits_acquis': solde_initial, 'jours_consommes': 0.0}
        )

        return utilisateur

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        solde_saisi = validated_data.pop('solde_conge', None)
        
        utilisateur = super().update(instance, validated_data)

        if password:
            utilisateur.set_password(password)
            utilisateur.save()

        # Mise à jour synchronisée du solde si fourni
        if solde_saisi is not None:
            annee_courante = date.today().year
            solde, _ = SoldeConge.objects.get_or_create(
                utilisateur=utilisateur,
                annee=annee_courante,
                defaults={'droits_acquis': solde_saisi, 'jours_consommes': 0.0}
            )
            solde.droits_acquis = solde_saisi
            solde.save()

        return utilisateur


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)