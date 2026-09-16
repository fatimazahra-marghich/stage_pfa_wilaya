from rest_framework import serializers
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from users.serializers import UtilisateurSerializer


class TypeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeConge
        fields = '__all__'


class SoldeCongeSerializer(serializers.ModelSerializer):
    # Rendu modifiable pour permettre l'ajustement/régularisation par les RH
    solde_actuel = serializers.FloatField(required=False)

    class Meta:
        model = SoldeConge
        fields = ['id', 'utilisateur', 'annee', 'droits_acquis', 'jours_reportes', 'jours_consommes', 'solde_actuel']

    def update(self, instance, validated_data):
        # Permet de mettre à jour directement le solde lors d'un PATCH
        instance.solde_actuel = validated_data.get('solde_actuel', instance.solde_actuel)
        instance.save()
        return instance


class JourFerieSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourFerie
        fields = '__all__'


class EtapeValidationSerializer(serializers.ModelSerializer):
    validateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = EtapeValidation
        fields = '__all__'
        read_only_fields = ['valideur', 'validateur', 'date_action']

    def get_validateur_nom(self, obj):
        user = getattr(obj, 'valideur', None) or getattr(obj, 'validateur', None)
        return user.get_full_name() if user else ""


class DemandeCongeSerializer(serializers.ModelSerializer):
    utilisateur_details = UtilisateurSerializer(source='utilisateur', read_only=True)
    type_conge_libelle = serializers.ReadOnlyField(source='type_conge.libelle')
    etapes = EtapeValidationSerializer(many=True, read_only=True)

    class Meta:
        model = DemandeConge
        fields = [
            'id', 'utilisateur', 'utilisateur_details', 'type_conge', 
            'type_conge_libelle', 'date_debut', 'date_fin', 'nombre_jours', 
            'motif', 'piece_jointe', 'statut', 'created_at', 'etapes'
        ]
        read_only_fields = ['utilisateur', 'statut', 'created_at']

    def validate(self, data):
        type_conge = data.get('type_conge')
        piece_jointe = data.get('piece_jointe')

        if type_conge:
            libelle = getattr(type_conge, 'libelle', '').lower()
            exige_justificatif = getattr(type_conge, 'justificatif_requis', False) or 'maladie' in libelle

            if exige_justificatif and not piece_jointe:
                raise serializers.ValidationError({
                    "piece_jointe": "Un certificat médical ou justificatif est obligatoire pour ce type de congé."
                })

        return data