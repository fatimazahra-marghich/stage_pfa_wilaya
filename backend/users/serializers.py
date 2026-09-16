from rest_framework import serializers
from .models import Utilisateur
from organisation.serializers import BureauSerializer
from conges.models import SoldeConge


class UtilisateurSerializer(serializers.ModelSerializer):
    bureau_details = BureauSerializer(source='bureau', read_only=True)
    
    # Champs d'affichage requis pour le composant React GlobalBalances.jsx
    solde_actuel = serializers.SerializerMethodField()
    service_nom = serializers.SerializerMethodField()
    division_nom = serializers.SerializerMethodField()
    bureau_nom = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'nom_complet', 'matricule', 'role', 'poste', 
            'bureau', 'bureau_details', 'pelerinage_utilise',
            'solde_actuel', 'service_nom', 'division_nom', 'bureau_nom'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def get_solde_actuel(self, obj):
        solde = SoldeConge.objects.filter(utilisateur=obj).first()
        return getattr(solde, 'solde_actuel', 0) if solde else 0

    def get_service_nom(self, obj):
        if hasattr(obj, 'bureau') and obj.bureau and hasattr(obj.bureau, 'division'):
            if hasattr(obj.bureau.division, 'service'):
                return getattr(obj.bureau.division.service, 'nom', '-')
        return getattr(obj, 'service', '-')

    def get_division_nom(self, obj):
        if hasattr(obj, 'bureau') and obj.bureau and hasattr(obj.bureau, 'division'):
            return getattr(obj.bureau.division, 'nom', '-')
        return '-'

    def get_bureau_nom(self, obj):
        return getattr(obj.bureau, 'nom', '-') if hasattr(obj, 'bureau') and obj.bureau else '-'