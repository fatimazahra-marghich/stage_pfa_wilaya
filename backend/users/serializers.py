from rest_framework import serializers
from .models import Utilisateur
from organisation.serializers import BureauSerializer

class UtilisateurSerializer(serializers.ModelSerializer):
    bureau_details = BureauSerializer(source='bureau', read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'nom_complet', 'matricule', 'role', 'poste', 
            'bureau', 'bureau_details', 'pelerinage_utilise'
        ]
        extra_kwargs = {'password': {'write_only': True}}