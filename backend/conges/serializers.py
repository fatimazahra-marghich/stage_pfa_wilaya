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
    validateur_nom = serializers.ReadOnlyField(source='validateur.nom_complet')

    class Meta:
        model = EtapeValidation
        fields = '__all__'

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