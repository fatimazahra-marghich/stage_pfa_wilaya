from rest_framework import serializers
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from users.serializers import UtilisateurSerializer


class TypeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeConge
        fields = '__all__'


class SoldeCongeSerializer(serializers.ModelSerializer):
    solde_actuel = serializers.ReadOnlyField()

    class Meta:
        model = SoldeConge
        fields = ['id', 'utilisateur', 'annee', 'droits_acquis', 'jours_reportes', 'jours_consommes', 'solde_actuel']


class JourFerieSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourFerie
        fields = '__all__'


class EtapeValidationSerializer(serializers.ModelSerializer):
    # Support des deux orthographes selon ton modèle (valideur ou validateur)
    validateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = EtapeValidation
        fields = '__all__'
        read_only_fields = ['valideur', 'validateur', 'date_action']  # <-- IMPORTANT pour éviter l'erreur 400

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
        # RÈGLE CONFORME AU CAHIER DES CHARGES :
        # La pièce jointe (certificat médical) est obligatoire UNIQUEMENT si le type exige un justificatif
        type_conge = data.get('type_conge')
        piece_jointe = data.get('piece_jointe')

        if type_conge:
            # Vérifie si le type est de la maladie ou si le boolean justificatif_requis est à True
            libelle = getattr(type_conge, 'libelle', '').lower()
            exige_justificatif = getattr(type_conge, 'justificatif_requis', False) or 'maladie' in libelle

            if exige_justificatif and not piece_jointe:
                raise serializers.ValidationError({
                    "piece_jointe": "Un certificat médical ou justificatif est obligatoire pour ce type de congé."
                })

        return data